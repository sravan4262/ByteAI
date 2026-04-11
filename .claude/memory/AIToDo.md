# ByteAI — AI Features Roadmap

## Current AI Foundation

| Component | Tech | Status |
|---|---|---|
| Semantic embeddings | all-MiniLM-L6-v2 (ONNX, in-process, 384-dim) | Done |
| Vector search | pgvector + RRF (full-text + cosine fusion) | Done |
| Feed personalization | User `InterestEmbedding` → cosine distance ranking | Done |
| Auto-embed on byte create | `ByteCreatedEvent` → embed → store | Done |
| LLM gateway | Groq API — Llama 3.3 70B | Done |

---

## Phase 1 — No New Infrastructure (Use Existing Container + Groq API)

### 1. Auto-Tag Extraction
**What:** After a byte or interview is saved, run NLP to detect tech stack mentions (`React`, `PostgreSQL`, `Kubernetes`, `Docker`, etc.) and auto-populate `ByteTechStacks` / `InterviewTechStacks`. Currently this is entirely manual at post time.

**Why it matters:** Tags drive feed filtering, personalization, and search. Poor tagging = poor discovery. Removing the manual step means every piece of content gets tagged.

**How:**
- Trigger from `ByteCreatedEvent` (MediatR notification, same pipeline as embedding)
- Send title + body to Groq with a structured JSON prompt: `{ "tags": ["react", "typescript"] }`
- Insert matched tags into `ByteTechStacks` / `InterviewTechStacks`
- Cap at 5 tags per item

**Model:** Groq Llama 3.3 70B (already available) — structured output, JSON mode

---

### 2. Dynamic Interest Embedding Updates
**What:** Right now `User.InterestEmbedding` is set once at registration and never updated. It should drift toward content the user actively engages with — reads, likes, bookmarks.

**Why it matters:** A static embedding means personalization never improves. Users who evolve their interests (e.g., from frontend to systems) never see that reflected in their feed.

**How:**
- On `UserLikedEvent` / `UserBookmarkedEvent` / `UserViewedEvent`, fetch the byte's embedding
- Compute new interest = `0.85 * current_embedding + 0.15 * content_embedding` (exponential moving average)
- Update `User.InterestEmbedding` in the background (fire-and-forget, low priority)

**Model:** all-MiniLM-L6-v2 (already running in-process) — no new model needed

---

### 3. Near-Duplicate Detection at Post Time
**What:** Before saving a new byte, run a cosine similarity check against the 50 most recent bytes from the same author and the 100 most recent bytes across the platform. If similarity > 0.92, warn the user.

**Why it matters:** Prevents spam, duplicate posts, and content recycling that degrades feed quality.

**How:**
- Triggered in `CreateByteCommandHandler` before `SaveChangesAsync`
- Embed the new byte's title + body (in-process, <10ms)
- Query pgvector: `ORDER BY embedding <=> $newVec LIMIT 10`
- If top result has cosine distance < 0.08, return a warning payload to the frontend
- Frontend shows a modal: "A very similar byte already exists — [view it] or [post anyway]"

**Model:** all-MiniLM-L6-v2 (already running in-process)

---

### 4. Byte Quality Score
**What:** Score each published byte on three dimensions: Clarity (is it readable?), Specificity (is it about something concrete?), Relevance (does it match its claimed tags?). Expose the score as a feed ranking signal and in a future moderation dashboard.

**Why it matters:** Low-quality bytes hurt the platform. Feed ranking that incorporates quality gives better content more reach without manual curation.

**How:**
- Background job triggered by `ByteCreatedEvent`
- Prompt Groq: `Rate this byte 1-10 on clarity, specificity, relevance. Return JSON.`
- Store result in a new `ByteQualityScore` table: `(ByteId, Clarity, Specificity, Relevance, ComputedAt)`
- Feed ranking multiplies recency score by `(quality / 10)`

**Model:** Groq Llama 3.3 70B (already available)

---

## Phase 2 — Async Worker Container (Gemma 4 E4B, CPU-only)

Deploy a **second ACA container** running Gemma 4 E4B via llama.cpp or Ollama. Scales to zero when idle. No GPU required — runs on CPU at 2–5 tokens/sec, which is fine for all async/background tasks.

**Gemma 4 E4B specs:**
- ~9B total params, 4B effective active params
- ~10GB RAM at Q4 quantization
- Apache 2.0 license — fully commercial, no API key
- 128K context window
- CPU: 2-5 tok/s (async fine), T4 GPU: ~60 tok/s (real-time capable)

### 5. Byte-from-URL Generation
**What:** User pastes a URL (blog post, GitHub PR, paper) in the compose screen. The system fetches the page, strips HTML, and uses an LLM to generate a ByteAI-formatted post (title + 3-sentence body + suggested tags) for the user to review and edit before publishing.

**Why it matters:** Dramatically lowers the barrier to posting. Most engineers read interesting content but don't have time to write about it.

**How:**
- New endpoint: `POST /api/compose/from-url { url }`
- Backend fetches + strips HTML (HtmlAgilityPack), truncates to 4K chars
- Sends to Gemma 4 E4B with prompt: `Write a ByteAI post from this article. Return JSON: { title, body, tags }`
- Returns draft to frontend — user reviews, edits, then posts normally

**Model:** Gemma 4 E4B (async worker container, ~3-8 sec latency acceptable)

---

### 6. Comments Insight Summary
**What:** When a byte or interview accumulates 20+ comments, asynchronously generate a "Discussion summary: 3 main perspectives" pinned above the comment thread.

**Why it matters:** Long threads are overwhelming. A summary encourages more users to engage without reading 50 comments.

**How:**
- Background job triggered when `comment_count` crosses 20 (check in `CreateCommentCommandHandler`)
- Fetch top 30 comments by vote count
- Prompt Gemma 4 E4B: `Summarize these comments into 3 distinct perspectives. Be concise and neutral.`
- Store in `ByteCommentSummary (ByteId, Summary, GeneratedAt)` — regenerate every 50 new comments

**Model:** Gemma 4 E4B (async worker container)

---

### 7. Toxicity / Spam Filter
**What:** Run a lightweight binary classifier on comment and byte body at write time. Auto-reject anything above a toxicity threshold; flag borderline content for review.

**Why it matters:** As the platform grows, manual moderation doesn't scale. A classifier gate prevents the worst content from ever reaching the feed.

**How:**
- ONNX model loaded in-process alongside all-MiniLM (same `OnnxRuntimeService` wrapper)
- Model: `unitary/toxic-bert` or `martin-ha/toxic-comment-model` — both ONNX-exportable, ~500MB
- Check runs in `CreateCommentCommandHandler` and `CreateByteCommandHandler` before save
- If score > 0.85 → reject with `400 + message`; if 0.65-0.85 → save but flag `IsFlagged = true`

**Model:** Lightweight ONNX classifier (in-process, <50ms, no API cost)

---

## Phase 3 — T4 Serverless GPU Container (Gemma 4 26B MoE)

Add a **dedicated GPU workload profile** in ACA (Consumption-GPU-NC8as-T4) with **scale-to-zero**. Only billed per-second when a GPU request is active.

**Gemma 4 26B MoE specs:**
- 26B total params, **only 4B active per inference** (MoE routing)
- ~18GB VRAM at Q4 → fits comfortably on T4 (16GB with quantization tricks) or A100 (40GB)
- 256K context window
- #6 open model on Arena AI leaderboard
- Apache 2.0 license

### 8. Interview Prep Coach
**What:** User selects a company + role. The system RAGs over the stored interviews for that company/role, assembles a context window of real Q&A examples, and generates a custom mock interview session with follow-up questions and model answers.

**Why it matters:** This is ByteAI's highest-value feature — directly differentiated from LinkedIn and Glassdoor. Directly monetizable as a premium feature.

**How:**
- Endpoint: `POST /api/interviews/prep { company, role, difficulty }`
- pgvector semantic search: find top-20 interviews matching company + role embedding
- Assemble RAG context: real Q&A pairs from the platform
- Prompt Gemma 4 26B MoE: `You are an interviewer at {company}. Generate 5 interview questions with model answers based on these real examples: {context}`
- Stream response back to frontend via SSE

**Model:** Gemma 4 26B MoE on T4 GPU (real-time streaming, ~60 tok/s)

---

### 9. "Explain This Byte" (Real-Time)
**What:** One-tap button on any byte to get a plain-English explanation of the code snippet or technical concept, pitched at the user's inferred seniority level.

**Why it matters:** Makes ByteAI accessible to mid-level engineers trying to level up. Turns passive reading into active learning.

**How:**
- Endpoint: `POST /api/bytes/{id}/explain`
- Fetch byte content + user's `SeniorityType`
- Prompt: `Explain this to a {seniority} engineer in 3 sentences. Then provide one concrete example.`
- Stream response via SSE

**Model:** Gemma 4 26B MoE on T4 GPU (real-time, streaming required)

---

### 10. "People You Might Know" Recommendations
**What:** Recommend users to follow based on overlapping tech stacks and reading behavior, not just mutual follows.

**Why it matters:** Cold-start users have no following feed. This bootstraps the social graph with signal-based connections.

**How:**
- Embed each user's `TechStack[]` as a concatenated string using all-MiniLM
- Store as `User.TechStackEmbedding` (separate from `InterestEmbedding`)
- Weekly background job: for each user, pgvector query top-10 nearest users by tech stack embedding
- Exclude already-followed users
- Surface in a new `GET /api/users/recommendations` endpoint

**Model:** all-MiniLM-L6-v2 (already running) for embedding; no LLM needed

---

## Infrastructure Summary

| Phase | Infra | Models | Cost Profile |
|---|---|---|---|
| 1 | Existing single container | all-MiniLM (in-process) + Groq API | Pay-per-token on Groq only |
| 2 | + Async worker ACA container (CPU) | Gemma 4 E4B via Ollama | Fixed container cost, scales to zero |
| 3 | + Serverless GPU ACA profile (T4) | Gemma 4 26B MoE | Per-second GPU billing, scales to zero |

## Model Reference Card

| Model | Size (Q4) | Runs On | Tok/s | License | Use In ByteAI |
|---|---|---|---|---|---|
| all-MiniLM-L6-v2 | 22MB | CPU in-process | N/A (encoder) | Apache 2.0 | Embeddings, dedup, interest vectors |
| toxic-bert (ONNX) | ~500MB | CPU in-process | N/A (classifier) | Apache 2.0 | Toxicity / spam filter |
| Gemma 4 E4B | ~10GB RAM | CPU container | 2-5 tok/s | Apache 2.0 | Byte-from-URL, comment summaries |
| Gemma 4 26B MoE | ~18GB VRAM | T4 GPU (ACA) | ~60 tok/s | Apache 2.0 | Interview coach, explain-byte, streaming |
| Groq Llama 3.3 70B | External API | Groq infra | ~300 tok/s | Meta Llama 3.3 | Complex RAG, quality scoring, tagging |
