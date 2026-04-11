# ByteAI — AI Agent Roadmap

## What Makes These Agents (Not Scripts)
A script executes fixed steps. An agent **observes** current state, **plans** what to do next, **acts** using tools, and **reflects** to retry or adjust. Claude claude-haiku-4-5 acts as the orchestrator brain; Groq handles content generation; tools interface with Postgres and external APIs.

## Agent Stack
| Component | Tech |
|---|---|
| Orchestrator brain | Claude claude-haiku-4-5 (Anthropic SDK — tool-use loop) |
| Content generation | Groq Llama 3.3 70B (OpenAI-compatible endpoint) |
| Embeddings | nomic-embed-text-v1.5 (in-process ONNX, same as production) |
| DB access | psycopg2 → same PostgreSQL + pgvector instance |
| Language | Python (standalone, not part of the C# backend) |

## Agent Ecosystem Map
```
ByteAI Agent Ecosystem
│
├── Data Layer
│   ├── Seeding Agent          ← fills DB with bytes + interviews
│   ├── Trending Harvester     ← daily fresh content from HN/GitHub/Reddit
│   └── Content Gap Agent      ← weekly coverage audit per tech stack
│
├── User Layer
│   ├── Writing Coach          ← draft → publish assistant (conversational)
│   ├── Onboarding Concierge   ← replaces boring signup form with dialogue
│   └── Interview Prep Coach   ← mock interview session with scoring
│
├── Trust Layer
│   ├── Fact-Check Agent       ← flags technically incorrect bytes
│   └── Moderation Agent       ← nuanced content review with written rationale
│
└── Growth Layer
    ├── SEO Amplifier          ← cross-platform distribution (X, LinkedIn, dev.to)
    └── Newsletter Curator     ← weekly digest, no human editor needed
```

---

## Priority Order
| Agent | Value | Complexity | When |
|---|---|---|---|
| Seeding Agent | High | Medium | Now |
| Writing Coach | High | Low | After seeding |
| Onboarding Concierge | High | Low | Before launch |
| Trending Harvester | High | Medium | Post-launch |
| Interview Prep Coach | Very High | High | Phase 3 |
| Fact-Check Agent | Medium | Medium | Post-launch |
| Newsletter Curator | Medium | Low | Post-launch |
| Moderation Agent | Medium | High | At scale |
| SEO Amplifier | Medium | Medium | Post-launch |
| Content Gap Agent | Low | Low | Post-launch |

---

## Agent 1 — Seeding Agent ⏳
**What:** Autonomous agent that observes content gaps in the DB, plans what to generate, calls Groq in batches, validates quality, and inserts bytes + interviews across 22 tech stacks. Goal: 30 bytes + 30 interviews per stack.
**How it works:**
- Claude observes: calls `get_tech_stacks()` + `check_content_gaps()` across all stacks → builds a priority list (biggest gap first)
- Claude plans: batches topic generation per stack, rotates company/role combos for interviews
- Claude acts: `generate_topics()` → `generate_byte()` → `quality_score()` → `dedup_check()` → `insert_byte()`. Same loop for interviews.
- Claude reflects: quality score < 6 → regenerate; dedup hit → skip and generate new topic
- Runs as a one-shot CLI: `python agent.py --target-bytes 30 --target-interviews 30`
- Extensible: adding new content types = adding 2 tools (`generate_X`, `insert_X`). Agent loop unchanged.
**Tools:** `get_tech_stacks`, `check_content_gaps`, `generate_topics`, `generate_byte`, `generate_interview`, `quality_score`, `dedup_check`, `insert_byte`, `insert_interview`, `report_progress`
**Tech stacks to seed:** React, Angular, Vue, Next.js, TypeScript, .NET/C#, Node.js, Python, Java, Go, Flutter, React Native, Swift, Kotlin, PostgreSQL, MongoDB, Redis, Docker, Kubernetes, AWS, Azure, ML/AI
**Interview combos:** Companies (Google, Microsoft, Amazon, Meta, Apple, Netflix, Stripe, Airbnb, Uber, Atlassian) × Roles (Senior SWE, Frontend Engineer, Backend Engineer, Fullstack, ML Engineer, DevOps/SRE, Mobile Engineer)
**Project structure:**
```
seeding-agent/
├── agent.py              ← Claude tool-use loop + orchestration
├── tools/
│   ├── db_tools.py       ← get_stacks, check_gaps, insert_byte, insert_interview
│   ├── groq_tools.py     ← gen_topics, gen_byte, gen_interview
│   └── validation.py     ← quality_score, dedup_check
├── config.py             ← stack list, company/role combos, targets
├── requirements.txt
└── .env                  ← DB_URL, GROQ_API_KEY, ANTHROPIC_API_KEY
```

---

## Agent 2 — Writing Coach Agent ⏳
**What:** User pastes a draft byte → agent reads it, asks 2-3 clarifying questions ("what's the key takeaway for a junior dev?"), then rewrites/improves it collaboratively. Multi-turn conversational loop, not a one-shot improve button.
**How it works:**
- User submits draft → agent calls `analyze_draft()` to score clarity, specificity, relevance
- Agent asks targeted questions based on what's weak (low clarity → asks for simpler explanation; low specificity → asks for a concrete example or code snippet)
- User replies → agent incorporates feedback and rewrites
- Agent calls `check_similar_bytes()` to ensure the improved byte isn't duplicating existing content
- Final output: improved `{ title, body, codeSnippet }` ready to post via normal `POST /api/bytes`
- Exposed as `POST /api/ai/writing-coach` (streaming SSE for conversational feel)
**Tools:** `analyze_draft`, `suggest_code_snippet`, `check_similar_bytes`, `rewrite_byte`, `score_improvement`

---

## Agent 3 — Onboarding Concierge Agent ⏳
**What:** New user signs up → agent starts a short conversation ("What do you build? What are you learning?") and sets up their entire profile — tech stacks, seniority, interests, interest embedding, feed preferences — through dialogue instead of a boring form.
**How it works:**
- Agent asks 3-4 open questions, parses natural language answers
- Calls `match_tech_stacks(user_description)` — embeds the user's answer and finds nearest tech stack vectors
- Calls `infer_seniority(description)` — maps self-description to SeniorityType enum
- Calls `seed_interest_embedding(matched_stacks)` — averages the matched stack embeddings as starting `InterestEmbedding`
- Calls `set_user_profile()` — writes everything to DB in one transaction
- Calls `suggest_first_bytes()` — returns 5 bytes to show immediately on first feed load
- Exposed as `POST /api/ai/onboarding` (SSE streaming, multi-turn)
**Tools:** `match_tech_stacks`, `infer_seniority`, `seed_interest_embedding`, `set_user_profile`, `suggest_first_bytes`

---

## Agent 4 — Trending Harvester Agent ⏳
**What:** Runs daily. Fetches what's trending in tech from Hacker News, GitHub Trending, and Reddit tech subs. Identifies topics with no existing byte coverage. Generates bytes and posts them under a `@ByteAIDaily` seed account.
**How it works:**
- Fetches: HN Algolia API (top 20 today) + GitHub Trending API (top repos by language) + Reddit `/r/programming` hot posts
- Calls `check_topic_coverage(topic)` — embeds topic title, cosine search in DB. If max similarity < 0.4, topic is uncovered.
- For uncovered topics: `generate_byte(topic)` → `quality_score()` → `insert_byte(author = @ByteAIDaily)`
- Runs as a scheduled job (cron or Azure Container App scheduled trigger)
- Rate-aware: max 10 new bytes per day to avoid flooding the feed
**Tools:** `fetch_hn_trending`, `fetch_github_trending`, `fetch_reddit_hot`, `check_topic_coverage`, `generate_byte`, `quality_score`, `insert_byte`
**Schedule:** Daily at 08:00 UTC

---

## Agent 5 — Interview Prep Coach Agent ⏳
**What:** User picks a company + role → agent RAGs over real stored interviews → generates a full mock session → evaluates user's answers → gives structured feedback with a readiness score. True multi-turn agent loop.
**How it works:**
- Agent calls `rag_search_interviews(company, role)` — top 10 semantic matches from stored interviews
- Agent generates 5 mock questions grounded in real patterns from the RAG results
- User answers each question → agent calls `evaluate_answer(question, answer, context)` → gives feedback per answer
- After all questions: agent calls `calculate_readiness_score()` → returns `{ score, strengths[], gaps[], suggested_bytes[] }`
- `suggested_bytes` are real bytes from DB that address the identified gaps
- Exposed as `POST /api/interviews/prep-coach` (SSE streaming)
**Tools:** `rag_search_interviews`, `generate_mock_question`, `evaluate_answer`, `calculate_readiness_score`, `suggest_gap_filling_bytes`
**Note:** This is the Phase 3 roadmap item 11 reframed as a proper agent loop.

---

## Agent 6 — Fact-Check Agent ⏳
**What:** After a byte is published, agent reads its technical claims and reasons about correctness. Flags potentially wrong information with a confidence score and adds a soft "unverified claim" badge. Does not delete content — surfaces it for author review.
**How it works:**
- Triggered async post-publish (via `ByteCreatedEvent`, fire-and-forget)
- Agent calls `extract_technical_claims(body)` — Groq identifies discrete factual claims ("useState is synchronous", "Go has a GC")
- For each claim: `verify_via_rag(claim)` — cosine search across all bytes + interviews for corroborating or contradicting content
- If contradicted with high confidence: `flag_byte(byteId, claim, confidence)` — sets `IsFlagged = true`, stores reason
- Author gets a notification with specific flagged claim and why
**Tools:** `extract_technical_claims`, `verify_via_rag`, `search_documentation_bytes`, `flag_byte`, `notify_author`

---

## Agent 7 — Moderation Agent ⏳
**What:** Goes beyond the Phase 2 toxicity ONNX classifier (which is binary). This agent *reasons* about edge cases — borderline content, context-dependent posts, appeals — and makes nuanced decisions with a written rationale stored for audit trail.
**How it works:**
- Triggered when toxicity classifier score is in the 0.65–0.85 borderline range (flagged but not auto-rejected)
- Agent reads byte + author history + community standards policy (stored as RAG context)
- Calls `assess_content(byte, policy_context)` → reasons step-by-step, returns `{ decision, rationale, confidence }`
- `approve` → clears flag; `reject` → removes byte, notifies author with rationale; `escalate` → queues for human review
- All decisions + rationale stored in `ModerationLog` for audit
**Tools:** `read_byte`, `get_author_history`, `rag_search_policy`, `approve`, `reject`, `escalate`, `log_decision`

---

## Agent 8 — Newsletter Curator Agent ⏳
**What:** Every Sunday, agent scans the week's bytes, picks the best 7 per domain (frontend, backend, devops, mobile, AI/ML), writes transition copy between them, and generates a full weekly digest newsletter. No human editor.
**How it works:**
- Fetches all bytes from last 7 days with engagement data (likes, views, bookmarks)
- Calls `rank_by_engagement(bytes)` + `cluster_by_domain(bytes)` → top 7 per domain
- Calls `ensure_diversity(selected)` — checks no two consecutive bytes are from the same author or tech stack
- Calls `write_digest(selected_bytes)` — Groq writes intro, transitions, and a closing "this week in tech" paragraph
- Calls `send_newsletter(digest)` — sends via email provider (Resend/SendGrid)
**Tools:** `fetch_week_bytes`, `rank_by_engagement`, `cluster_by_domain`, `ensure_diversity`, `write_digest`, `send_newsletter`
**Schedule:** Sundays at 09:00 UTC

---

## Agent 9 — SEO Amplifier Agent ⏳
**What:** Takes top-performing bytes (high likes + views in last 7 days), generates platform-specific versions — X/Twitter thread, LinkedIn post, dev.to article — and queues them for distribution under the ByteAI brand account.
**How it works:**
- Weekly: `fetch_top_bytes(limit=5, window_days=7)` — top bytes by engagement
- For each: generates 3 formats in parallel:
  - X thread: `generate_twitter_thread(byte)` — 5-7 tweets, hook → detail → CTA
  - LinkedIn: `generate_linkedin_post(byte)` — 150 words, professional tone, hashtags
  - dev.to: `generate_devto_article(byte)` — expanded version with full code, canonical URL back to ByteAI
- `schedule_post(platform, content, time)` — staggers posts across the week
- `track_referral_clicks(byte_id)` — monitors inbound traffic from each platform
**Tools:** `fetch_top_bytes`, `generate_twitter_thread`, `generate_linkedin_post`, `generate_devto_article`, `schedule_post`, `track_referral_clicks`

---

## Agent 10 — Content Gap Agent ⏳
**What:** Runs weekly. Scans the DB to identify which tech stacks are underrepresented relative to user interest and search volume. Reports a prioritised list of gaps and optionally triggers the Seeding Agent for the top 3 stacks.
**How it works:**
- `get_stack_coverage()` — bytes + interviews count per tech stack
- `get_search_volume_by_stack()` — how many search queries per stack in last 7 days (from search logs)
- `get_interest_by_stack()` — how many users have each stack in their `UserTechStacks`
- Computes coverage ratio: `content_count / (search_volume + interest_count)` — lower = bigger gap
- Top 3 gap stacks → triggers Seeding Agent with `--stacks angular,rust,kotlin --target-bytes 10`
**Tools:** `get_stack_coverage`, `get_search_volume_by_stack`, `get_interest_by_stack`, `compute_gap_score`, `trigger_seeding_agent`
**Schedule:** Mondays at 06:00 UTC
