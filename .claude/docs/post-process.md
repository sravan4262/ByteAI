# Post Creation — Process

> **Live document.** Update this file whenever byte/interview creation pipeline, validation gates, or event handlers change.

---

## Create Byte

**Endpoint:** `POST /api/bytes` `[Authorize]`

**Request:**
```json
{
  "title": "React memo() — When It Helps and When It Doesn't",
  "body": "Content goes here...",
  "codeSnippet": "const Comp = memo(() => ...)",
  "language": "typescript",
  "type": "article"
}
```

**Types:** `article` | `tutorial` | `snippet` | `discussion`

---

### Validation Gates (sequential, hard-reject on failure)

**File:** `Service/ByteAI.Core/Services/Bytes/ByteService.cs` → `CreateByteAsync()`

```
Gate 1 — Anti-Gibberish Entropy Check                     [heuristic, no AI]
  └── IsGibberish(title, body)
  └── Reject: "Content appears to be gibberish"

Gate 2 — Tech Relevance Check                             [embedding similarity, not search]
  └── Embed (title + body) via OnnxEmbedder
  └── Compare against hardcoded TechDomainAnchors vectors
  └── MaxSimilarity < 0.15 → Reject: "not tech-related"
  └── Cheap CPU check — runs before any Groq call
  └── This is NOT search — no DB query, no retrieval.
      Just cosine similarity between the new content and anchor vectors.

Gate 3 — Groq Content Validation                          [LLM classification, not RAG]
  └── IGroqService.ValidateTechContentAsync(title, body)
  └── Returns: { IsCoherent, IsTechRelated, Reason }
  └── Not coherent OR not tech-related → Reject with Groq's reason
  └── Groq unavailable → Reject: "Could not verify content relevance" (fail closed)
  └── This is NOT RAG — no context is retrieved. Groq classifies the raw content directly.

Gate 4 — Near-Duplicate Detection                         [embedding similarity, not search]
  └── Embed (title + body)
  └── SELECT bytes WHERE Embedding.CosineDistance(queryVec) < 0.08
  └── Threshold 0.08 = cosine similarity > 0.92 — only near-identical reposts caught
  └── Match found → 409 Conflict: { existingId, existingTitle, similarity }
  └── User can resubmit with force=true to bypass this gate only
  └── This is NOT semantic search — threshold is extremely tight (>0.92 sim).
      It only blocks exact or near-verbatim duplicates, not topically similar content.
```

---

### Entity Creation

```
INSERT bytes (Id, AuthorId, Title, Body, CodeSnippet, Language, Type, CreatedAt, UpdatedAt)
```

---

### ByteCreatedEvent → ByteCreatedEventHandler

**File:** `Service/ByteAI.Core/Events/ByteCreatedEventHandler.cs`

Fires immediately after INSERT. Steps run in order:

```
Step 1 — Generate & Store Embedding (awaited)
  └── IEmbeddingService.EmbedDocumentAsync(title + body)
        └── OnnxEmbedder: "search_document: " + text
              └── BertTokenizer → ONNX inference → 768-dim → mean pool → L2 normalize
  └── UPDATE bytes SET embedding = vector WHERE id = byteId
  └── Logged; failure is non-fatal (byte still visible, just won't appear in vector search)

Step 2 — Auto-Tag Extraction (fire-and-forget, own DI scope)
  └── Fetch all tech_stack names from DB
  └── IGroqService.SuggestTagsAsync(title, body, codeSnippet, allowedTags)
        └── Groq Llama 3.3 70B returns matching tag names from allowedTags
  └── Resolve names → tech_stack IDs
  └── INSERT byte_tech_stacks (new tags only, skip existing)
  └── Logged: "Auto-tagged byte {id} with {n} tags: {names}"

Step 3 — Quality Scoring (fire-and-forget, own DI scope)
  └── IGroqService.ScoreQualityAsync(title, body)
        └── Returns: { Clarity, Specificity, Relevance, Overall } (0–10 each)
  └── UPSERT byte_quality_scores
  └── Logged: "Quality score stored for byte..."

Step 4 — Badge Check (awaited)
  └── IBadgeService.CheckAndAwardAsync(authorId, BadgeTrigger.BytePosted)
  └── Awards badges: first_byte, byte_streak_7, byte_streak_30, etc.

Step 5 — Feed Cache Invalidation
  └── SELECT followerId FROM user_followers WHERE userId = authorId
  └── For each follower: RedisFeedCache.InvalidateAsync(followerId)
  └── So followers see the new byte on next feed load
```

### Tables touched across the full pipeline

| Table | Operation | When |
|---|---|---|
| `bytes` | INSERT | Immediately |
| `bytes.embedding` | UPDATE | Step 1 (async) |
| `byte_tech_stacks` | INSERT | Step 2 (async) |
| `byte_quality_scores` | UPSERT | Step 3 (async) |
| `user_badges` | INSERT (conditional) | Step 4 |
| Redis feed keys | DELETE | Step 5 |

---

## Create Interview

**Endpoint:** `POST /api/interviews` `[Authorize]`

**Request:**
```json
{
  "title": "Google SDE II — System Design Round",
  "body": "Context description...",
  "company": "Google",
  "role": "SDE II",
  "difficulty": "hard",
  "language": "python",
  "questions": [
    { "question": "Design a URL shortener", "answer": "Use consistent hashing...", "orderIndex": 1 }
  ]
}
```

**Pipeline:**
```
1. INSERT interviews (same validation gates as bytes)
2. INSERT interview_questions (ordered by OrderIndex)
3. InterviewCreatedEvent published
   └── InterviewCreatedEventHandler
         ├── EmbedDocumentAsync(title + body) → UPDATE interviews.embedding
         ├── SuggestTagsAsync → INSERT interview_tech_stacks
         ├── ScoreQualityAsync → UPSERT interview_quality_scores
         └── BadgeCheck + CacheInvalidation (same as bytes)
```

---

## Draft Save

**Endpoint:** `PUT /api/drafts/{draftId}` (or `POST /api/drafts`)

Saves partial post state without going through validation gates. Stored in `drafts` table. Retrieved when user re-opens post composer.
