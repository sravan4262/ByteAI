# ByteAI — AI Features Roadmap

## Current AI Foundation

| Component | Tech | Status |
|---|---|---|
| Semantic embeddings | nomic-embed-text-v1.5 (ONNX, in-process, 768-dim, 8192-token) | ✅ Done |
| BertTokenizer | Microsoft.ML.Tokenizers — real WordPiece, replaces stub hash tokenizer | ✅ Done |
| Task prefixes | `search_document:` for stored content, `search_query:` for queries | ✅ Done |
| Vector search | pgvector + RRF (full-text PlainToTsQuery + cosine fusion, threshold 0.5) | ✅ Done |
| Feed personalization | User `InterestEmbedding` → cosine distance ranking | ✅ Done |
| Auto-embed on byte create | `ByteCreatedEvent` → embed → store | ✅ Done |
| LLM gateway | Groq API — Llama 3.3 70B (free tier: 1,000 req/day, 30 RPM) | ✅ Done |

---

## Phase 1 — No New Infrastructure ✅ COMPLETE (6/6)

### 1. Auto-Tag Extraction ✅
**What:** After a byte is saved, Groq extracts tech stack tags and populates `ByteTechStacks`.
**How it works:**
- `ByteCreatedEvent` now carries `Title`, `AuthorId`, `Body`, `CodeSnippet`
- `ByteCreatedEventHandler` calls `IGroqService.SuggestTagsAsync` (fire-and-forget `Task.Run`)
- Matches returned tag names against `TechStack.Name` (case-insensitive) in DB
- Inserts matched `ByteTechStack` records (up to 5, duplicate-safe)
**Files:** `ByteCreatedEvent.cs`, `ByteCreatedEventHandler.cs`, `IGroqService.cs`, `GroqService.cs`

---

### 2. Near-Duplicate Detection ✅
**What:** Before saving a new byte, checks cosine similarity against existing bytes. If similarity > 92%, returns a 409 with the duplicate's info. User can bypass with `?force=true`.
**How it works:**
- `ByteService.CreateByteAsync` embeds `title + body + code` with `EmbedQueryAsync`
- Queries pgvector: `WHERE CosineDistance(embedding, queryVec) < 0.08`
- Throws `DuplicateContentException(existingId, existingTitle, similarity)`
- `BytesController` catches it and returns `409 Conflict` with `{ error, existingId, existingTitle, similarity% }`
- `POST /api/bytes?force=true` bypasses the check
**Files:** `DuplicateContentException.cs`, `ByteService.cs`, `IByteService.cs`, `IBytesBusiness.cs`, `BytesBusiness.cs`, `BytesController.cs`

---

### 3. Byte Quality Score ✅
**What:** Groq scores each published byte on Clarity, Specificity, and Relevance (1–10 each). Stored in `bytes.byte_quality_scores`.
**How it works:**
- `ByteCreatedEventHandler` calls `IGroqService.ScoreQualityAsync` (fire-and-forget `Task.Run`)
- Groq returns `{ clarity, specificity, relevance }` JSON; Overall = average of three
- Upserts into `ByteQualityScore` entity
- Future use: feed ranking multiplier, moderation dashboard
**Files:** `ByteQualityScore.cs`, `ByteQualityScoreConfiguration.cs`, `IGroqService.cs`, `GroqService.cs`, `ByteCreatedEventHandler.cs`, `AppDbContext.cs`
**Migration:** `supabase/migrations/003_byte_quality_scores.sql`

> ⚠️ **Scores are computed and stored but NOT yet consumed anywhere downstream.**
> Two follow-through items are deferred:
> - **Feed ranking multiplier** — join `byte_quality_scores.overall` into the feed query, weight it against recency decay. Pure backend, no new AI work.
> - **Author-facing quality indicator** — expose score in the byte ViewModel, show Clarity / Specificity / Relevance breakdown on the detail screen so authors see how their content rated.

---

### 4. Dynamic Interest Embedding ✅
**What:** User's `InterestEmbedding` drifts toward content they engage with via exponential moving average (EMA).
**How it works:**
- On like (`CreateReactionCommandHandler`) or bookmark (`BookmarkService`) → publishes `UserEngagedWithByteEvent`
- `UserEngagedWithByteEventHandler` fetches the byte's embedding, runs EMA:
  `new = L2Normalize(0.85 × current + 0.15 × byte_embedding)`
- If user has no `InterestEmbedding` yet, sets it directly to the byte's embedding
- Feed personalization uses `InterestEmbedding` for cosine ranking automatically
**Files:** `UserEngagedWithByteEvent.cs`, `UserEngagedWithByteEventHandler.cs`, `ReactionCommandHandlers.cs`, `BookmarkService.cs`

---

### 5. Semantic Search ✅
**What:** Hybrid search combining full-text (PostgreSQL `plainto_tsquery`) and vector similarity (pgvector cosine distance) via Reciprocal Rank Fusion (RRF). Returns the best blend of exact keyword matches and semantically similar results.
**How it works:**
- Query is embedded with `EmbedQueryAsync` (uses `search_query:` prefix for nomic)
- Two parallel queries run: FTS with `plainto_tsquery` + pgvector `ORDER BY embedding <=> queryVec`
- Results are merged using RRF scoring (`1 / (k + rank)`) — a result appearing in both lists scores highest
- Vector results filtered to cosine distance < 0.5 to prevent unrelated content from leaking in
- Applies to bytes, interviews, and people (people uses username/displayName LIKE match)
**Endpoints:** `GET /api/search?q=...&type=bytes|interviews|all`, `GET /api/search/people?q=...`
**Files:** `SearchService.cs`, `SearchBusiness.cs`, `SearchQueryHandler.cs`, `SearchController.cs`

---

### 6. RAG — Retrieval-Augmented Generation ✅
**What:** Three RAG modes letting users ask natural language questions, answered by Groq LLM grounded in retrieved content.
- **Option A** — Ask about a specific byte: one-tap "ASK AI" button on the detail page surfaces an answer scoped to that byte's content.
- **Option B** — Freeform ask: on the search screen with no type selected, the search bar becomes an NLP question box. Groq searches bytes + interviews, picks the top passages, and synthesises a blended answer.
- **Option C** — Type-scoped ask: in Bytes or Interviews mode, users can tap the ASK toggle; the search+RAG is scoped to that content type. Answers include clickable source cards linking back to the original posts.
**How it works:**
- `RagPassage(Title, Body, SourceId)` record carries each retrieved passage to the LLM.
- `IGroqService.RagAnswerAsync` builds a numbered context block from up to 10 passages, asks Groq Llama 3.3 70B to synthesise an answer, instructs the model to cite passage numbers.
- `POST /api/bytes/{id}/ask` (Option A): fetches byte from DB, wraps it in a single `RagPassage`, returns `{ answer, sourceId, sourceTitle }`.
- `POST /api/ai/search-ask` (Options B+C): embeds the question with `EmbedQueryAsync`, calls `SearchBytesAsync` + `SearchInterviewsAsync` (top 5 each), builds passages list, returns `{ answer, sources[] }`.
- Frontend: detail-screen shows an expandable ASK AI panel with Q&A input; search-screen detects RAG mode (no tab or ASK toggle) and renders the answer block with numbered source cards.
**Files:** `IGroqService.cs`, `GroqService.cs`, `AiController.cs`, `AiViewModels.cs`, `client.ts`, `detail-screen.tsx`, `search-screen.tsx`

---

## Phase 1.5 — Content Validation Gates (No New Infrastructure) ✅ COMPLETE (1/1)

### 7. Tech-Relevance & Anti-Gibberish Validation ✅
**What:** Three-stage pre-save pipeline that rejects non-tech content and gibberish before a byte is persisted. Cheapest gate runs first; Groq is only hit for borderline cases.
**How it works:**
- **Stage 1 — Entropy check (~1ms, free):** Computes Shannon entropy + average word length on `title + body`. Rejects if `entropy < 3.0` or avg word length < 2.5 — catches random-character spam before any embedding call. Throws `InvalidContentException`.
- **Stage 2 — Embedding cosine vs tech corpus (~50ms, free):** `TechDomainAnchors` singleton pre-computes nomic embeddings for 10 tech anchor phrases at startup (`"software development and programming"`, `"machine learning and AI"`, `"system design and architecture"`, etc.). Content is embedded with `EmbedQueryAsync`; max cosine similarity is taken across all anchors. `< 0.20` → hard reject; `> 0.30` → pass; `0.20–0.30` → escalates to Stage 3.
- **Stage 3 — Groq binary classification (~500ms, 1 req):** Only reached for borderline content. Groq returns `{ isTechRelated, isCoherent, reason }`. `isTechRelated: false` → `400` with `reason` shown to the user. Fails open (passes) if Groq is unavailable, so the pipeline never blocks on API downtime.
- `BytesController` catches `InvalidContentException` → `400 { error: "INVALID_CONTENT", reason: "..." }`.
- Pipeline runs before the existing dedup check inside `ByteService.CreateByteAsync`.
**Files:** `InvalidContentException.cs`, `TechDomainAnchors.cs`, `IGroqService.cs`, `GroqService.cs`, `ByteService.cs`, `BytesController.cs`, `Program.cs`

---

## Phase 1.6 — AI Code Formatter (No New Infrastructure) ✅ COMPLETE (1/1)

### 7b. AI Code Formatter ✅
**What:** Dual-strategy code formatter inside a reusable `CodeEditor` component. Instantly formats web languages locally via Prettier; sends compiled/scripting languages to Groq for LLM-based formatting. Language must be selected before the textarea unlocks (language-first gate).
**How it works:**
- **Prettier (local, ~instant):** JS, TS, JSX, TSX, HTML, CSS, SCSS, JSON, YAML, Markdown, GraphQL — uses Prettier v3 standalone with dynamic plugin imports. Plugins passed as whole module objects (not `.default`) per Prettier v3 ESM API.
- **Groq (LLM, ~1-2s):** All other languages (C#, Java, Python, Go, Rust, Swift, Kotlin, Scala, Ruby, PHP, Dart, C, C++, Bash, etc.) — calls `POST /api/ai/format-code` which invokes `IGroqService.FormatCodeAsync`.
- Language picker shows 35+ languages, each tagged `✦ Prettier` (green) or `AI` (accent) so users know which formatter will run.
- Textarea + FORMAT button disabled until a language is selected (overlay with hint text).
- `FormatCodeAsync` prompt: `"Format the following {language} code according to standard style conventions. Return ONLY the formatted code — no explanation, no markdown fences, no extra text."`
- Component is used in the compose screen (create) and the byte edit panel (detail screen).
**Endpoint:** `POST /api/ai/format-code` → `{ formatted: string }`
**Files:** `code-editor.tsx` (UI component), `IGroqService.cs`, `GroqService.cs`, `AiController.cs`, `AiViewModels.cs`, `client.ts`

---

## Phase 2 — Async Worker Container (Gemma 4 E4B, CPU-only)

Deploy a **second ACA container** running Gemma 4 E4B via llama.cpp or Ollama. Scales to zero when idle.

**Gemma 4 E4B specs:**
- ~9B total params, 4B effective active params
- ~10GB RAM at Q4 quantization
- Apache 2.0 license — fully commercial, no API key
- 128K context window
- CPU: 2-5 tok/s (async fine), T4 GPU: ~60 tok/s (real-time capable)

### 8. Byte-from-URL Generation ⏳
**What:** User pastes a URL → system fetches + strips HTML → Gemma generates a ByteAI post draft for review.
**How:**
- `POST /api/compose/from-url { url }`
- Backend fetches + strips HTML (HtmlAgilityPack), truncates to 4K chars
- Sends to Gemma 4 E4B: `Write a ByteAI post from this article. Return JSON: { title, body, tags }`
- Returns draft to frontend — user reviews, edits, posts normally
**Model:** Gemma 4 E4B (async worker container, ~3-8 sec latency acceptable)

---

### 9. Comments Insight Summary ⏳
**What:** When a byte accumulates 20+ comments, generate a "3 main perspectives" summary pinned above the thread.
**How:**
- Triggered when `comment_count` crosses 20
- Fetch top 30 comments by vote count
- Prompt Gemma 4 E4B: `Summarize into 3 distinct perspectives`
- Store in `ByteCommentSummary (ByteId, Summary, GeneratedAt)` — regenerate every 50 new comments
**Model:** Gemma 4 E4B (async worker container)

---

### 10. Toxicity / Spam Filter ⏳
**What:** Lightweight ONNX classifier on comment/byte body at write time. Auto-reject above threshold; flag borderline content.
**How:**
- ONNX model loaded in-process: `toxic-bert` or `martin-ha/toxic-comment-model` (~500MB)
- Runs in `CreateCommentCommandHandler` and `CreateByteCommandHandler` before save
- Score > 0.85 → reject 400; score 0.65-0.85 → save but flag `IsFlagged = true`
**Model:** Lightweight ONNX classifier (in-process, <50ms, no API cost)

---

## Phase 3 — T4 Serverless GPU Container (Gemma 4 26B MoE)

### 11. Interview Prep Coach ⏳
**What:** User selects company + role → system RAGs over stored interviews → generates a custom mock interview session with follow-up questions and model answers.
**How:**
- `POST /api/interviews/prep { company, role, difficulty }`
- pgvector semantic search: top-20 interviews matching company + role embedding
- RAG context assembled from real Q&A pairs
- Gemma 4 26B MoE streams response via SSE
**Model:** Gemma 4 26B MoE on T4 GPU (~60 tok/s)

---

### 12. "Explain This Byte" (Real-Time) ⏳
**What:** One-tap explanation of any byte's code/concept, pitched at the user's seniority level.
**How:**
- `POST /api/bytes/{id}/explain`
- Fetch byte content + user's `SeniorityType`
- Prompt: `Explain this to a {seniority} engineer in 3 sentences. Provide one concrete example.`
- Stream via SSE
**Model:** Gemma 4 26B MoE on T4 GPU (streaming required)

---

### 13. "People You Might Know" Recommendations ⏳
**What:** Recommend users to follow based on overlapping tech stacks and reading behavior.
**How:**
- Embed each user's `TechStack[]` as a concatenated string
- Store as `User.TechStackEmbedding`
- Weekly background job: pgvector top-10 nearest users by tech stack embedding
- `GET /api/users/recommendations`
**Model:** nomic-embed-text-v1.5 (already running) — no LLM needed

---

## Infrastructure Summary

| Phase | Infra | Models | Cost Profile |
|---|---|---|---|
| 1 ✅ | Existing single container | nomic-embed-text-v1.5 (in-process) + Groq API | Free (Groq free tier: 1k req/day) |
| 2 | + Async worker ACA container (CPU) | Gemma 4 E4B via Ollama | Fixed container cost, scales to zero |
| 3 | + Serverless GPU ACA profile (T4) | Gemma 4 26B MoE | Per-second GPU billing, scales to zero |

## Model Reference Card

| Model | Size (Q4) | Runs On | Tok/s | License | Use In ByteAI |
|---|---|---|---|---|---|
| nomic-embed-text-v1.5 | ~550MB (137MB quantized) | CPU in-process | N/A (encoder) | Apache 2.0 | Embeddings, dedup, interest vectors, search |
| toxic-bert (ONNX) | ~500MB | CPU in-process | N/A (classifier) | Apache 2.0 | Toxicity / spam filter (Phase 2) |
| Gemma 4 E4B | ~10GB RAM | CPU container | 2-5 tok/s | Apache 2.0 | Byte-from-URL, comment summaries (Phase 2) |
| Gemma 4 26B MoE | ~18GB VRAM | T4 GPU (ACA) | ~60 tok/s | Apache 2.0 | Interview coach, explain-byte, streaming (Phase 3) |
| Groq Llama 3.3 70B | External API | Groq infra | ~300 tok/s | Meta Llama 3.3 | Auto-tagging, quality scoring, RAG answers (Phase 1) |
