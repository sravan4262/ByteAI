# Search — Process

> **Live document.** Update this file whenever search endpoints, ranking logic, embedding strategy, column definitions, or AI search features change.

---

## The Two Search Features — Key Distinction

These are the two search-related features a user interacts with. They serve completely different jobs.

| | `GET /api/search` (SearchController) | `POST /api/ai/search-ask` (AiController) |
|---|---|---|
| **User intent** | "Find me React bytes" | "How do I use console.log?" |
| **Input** | A keyword / topic | A question |
| **What it returns** | A ranked list of bytes/interviews to browse | One synthesised answer + source references |
| **LLM involved?** | No | Yes — Groq Llama 3.3 70B |
| **How it works** | FTS + semantic search → RRF merge | Semantic retrieval of top 5 bytes → Groq reads them → writes one answer |
| **User does what with result** | Scrolls through and reads the bytes themselves | Reads the answer; bytes are cited as sources |
| **Analogy** | Google search results | Asking ChatGPT, but grounded in ByteAI content only |
| **Frontend wired?** | Yes — search screen | **No — backend exists, not yet wired to UI** |
| **Feature flag** | None | `ai-search-ask` |

> Same underlying data (bytes in the DB), two completely different jobs. SearchController **surfaces the bytes** for the user to read. AiController SearchAsk **reads the bytes for the user** and distils one answer.

> **Show Similar Bytes** also lands on the search screen — it calls `GET /api/bytes/{byteId}/similar` (new endpoint) and pre-populates results using the byte's stored embedding. Not a search the user typed; a discovery flow triggered from a byte detail.

---

## AI Feature Types — Master Reference

ByteAI has several AI-powered features that are easy to confuse. Here is how they differ:

| Feature | Type | Retrieval? | Generation? | Embedding used? | Where |
|---|---|---|---|---|---|
| For You feed ranking | **Semantic Search** | Yes — cosine distance on all bytes | No | `user.InterestEmbedding` vs `bytes.embedding` | Feed screen |
| `GET /api/search` — keyword + semantic | **Hybrid Search** | Yes — FTS + vector, merged via RRF | No | Always embeds the typed query | Search screen |
| ~~Ask About Byte~~ *(removed, replaced)* | ~~Single-Doc RAG~~ | — | — | — | Replaced by Show Similar Bytes |
| Show Similar Bytes | **Semantic Search** | Yes — cosine distance on stored embedding | No | `byteX.embedding` vs all `bytes.embedding` | Byte detail screen → search screen |
| Ask About Interview | **Single-Doc RAG** | No — interview given by ID | Yes — Groq LLM | None | Interview detail screen |
| `POST /api/ai/search-ask` | **Multi-Doc RAG** | Yes — top 5 bytes via semantic search | Yes — Groq LLM | Embedded question | Search screen (not wired yet) |
| Content validation (gate 2) | **Embedding Similarity** | No DB query | No | New content vs hardcoded anchors | Post creation |
| Duplicate detection (gate 4) | **Embedding Similarity** | Yes — tight threshold DB query | No | New content vs existing bytes | Post creation |
| Groq content validation (gate 3) | **LLM Classification** | No | No — classifies, doesn't generate | None | Post creation |

### Definitions

**Semantic Search** — Converts text to a vector and finds the closest vectors in the database using cosine distance. No LLM generation. Fast, pure retrieval.

**Full-Text Search (FTS)** — Keyword matching with stemming and stop-word removal via PostgreSQL `tsvector`. No embeddings, no LLM. Returns results ranked by term frequency.

**Hybrid Search** — Runs FTS and semantic search in parallel, then merges results using Reciprocal Rank Fusion (RRF). Results that appear in both lists score higher. Best of both: keyword precision + semantic recall.

**Single-Document RAG** — The document is already known (given by ID). No retrieval step. The document's content is sent to the LLM as context, and the LLM generates a grounded answer. The "retrieval" is a direct DB lookup, not similarity search.

**Multi-Document RAG** — First retrieves the top N relevant documents via semantic search, then feeds all of them as context to the LLM, which synthesises a single answer across all sources. Two steps: retrieve → generate.

**Embedding Similarity** — Computes the cosine distance between two vectors (or a vector and a fixed set of anchors) to make a binary decision (reject/accept). Not search — no ranked list is produced, no content is surfaced to the user.

**LLM Classification** — Sends raw text to an LLM and asks it to classify (coherent? tech-related?). No retrieval, no context injection. Pure prompt → structured response.

---

---

## The Two Search Columns

Every `bytes.bytes` row (and `interviews.interviews`) has two columns that power all search and AI features:

| Column | Type | Written by | What it stores |
|---|---|---|---|
| `search_vector` | `tsvector` | PostgreSQL (auto, on insert/update) | Stemmed keywords from `title + body` |
| `embedding` | `vector(768)` | App (ONNX, async after insert) | Semantic meaning of `title + body` |

### How `search_vector` is populated

PostgreSQL generates it automatically — no app code touches it:

```sql
search_vector tsvector GENERATED ALWAYS AS (
    to_tsvector('english'::regconfig,
        coalesce(title, '') || ' ' || coalesce(body, ''))
) STORED
```

- Strips stop words ("the", "is", "a")
- Stems words ("running" → "run", "performance" → "perform")
- GIN indexed for fast lookups

### How `embedding` is populated

Written asynchronously by `ByteCreatedEventHandler` after every byte insert:

```
POST /api/bytes
  └── CreateByteAsync → publishes ByteCreatedEvent
        └── ByteCreatedEventHandler
              └── EmbedDocumentAsync("title + body")
                    └── OnnxEmbedder.EmbedDocument(text)
                          ├── prepends "search_document: " (nomic-specific prefix)
                          ├── BertTokenizer → token IDs (max 512)
                          ├── ONNX inference → nomic-embed-text-v1.5 → 768-dim
                          └── mean pool → L2 normalize → float[768]
              └── UpdateEmbeddingAsync → saves Vector(float[768]) to DB
```

### Asymmetric prefixes (nomic-embed-text-v1.5 requirement)

| Context | Prefix |
|---|---|
| Bytes/interviews stored in DB | `"search_document: " + text` |
| Search queries | `"search_query: " + text` |

Wrong prefix → poor semantic matching. This is a model-level requirement, not optional.

---

## Screen: Search

Three distinct features live on the search screen, each with different logic.

---

## Feature 1: Hybrid Search (Keyword + Semantic)

> **Type: Hybrid Search** — FTS (full-text search) and semantic search run in parallel and are merged via RRF. No LLM generation. Finds content, doesn't answer questions.

**Endpoint:** `POST /api/search`

**Request:**
```json
{
  "q": "react performance optimization",
  "type": "bytes",
  "limit": 20
}
```

**Types:** `bytes` | `interviews` | `people` | `all`

---

### Decision tree — what embedding is used for the vector leg

**File:** `Service/ByteAI.Core/Commands/Search/SearchQueryHandler.cs`

```
Request arrives
  │
  ├─ Query string provided?
  │       YES → queryEmbedding = EmbedQueryAsync("search_query: " + q)  ← always
  │
  └─ No query string AND user logged in AND has InterestEmbedding?
          YES → queryEmbedding = user.InterestEmbedding  ← personalised discovery only
          NO  → queryEmbedding stays null (FTS only, or empty)
```

> **Explicit query always wins.** When the user types something they have clear intent — embed what they typed. `InterestEmbedding` is only used when there is no query string, for personalised discovery (no query = "show me stuff I'd like").

### The 4 scenarios

| Scenario | FTS (`search_vector`) | Vector (`embedding`) | Vector source |
|---|---|---|---|
| Query typed, not logged in | ✓ runs | ✓ runs | embedded query string |
| Query typed, logged in, any interests | ✓ runs | ✓ runs | embedded query string |
| No query, logged in, has interests | ✗ empty | ✓ runs | user's InterestEmbedding |
| No query, no interests / logged out | ✗ empty | ✗ null | — |

---

### FTS leg (always runs if q provided)

**File:** `Service/ByteAI.Core/Services/Search/SearchService.cs` → `SearchBytesAsync()`

```sql
SELECT b.Id, ts_rank(b.search_vector, query) AS rank
FROM bytes b
WHERE b.IsActive
  AND b.search_vector @@ PLAINTO_TSQUERY('english', 'react performance optimization')
ORDER BY rank DESC
LIMIT limit * 2
```

- Uses `search_vector` (GENERATED column, GIN indexed)
- `PLAINTO_TSQUERY` handles phrase matching + stemming
- Returns ranked list of byte IDs

### Vector leg (runs only if `queryEmbedding != null`)

```sql
SELECT b.Id, b.Embedding <=> queryEmbedding AS distance
FROM bytes b
WHERE b.IsActive
  AND b.Embedding IS NOT NULL
  AND b.Embedding <=> queryEmbedding < 0.3
ORDER BY distance ASC
LIMIT limit * 2
```

- `<=>` is pgvector cosine distance operator
- Threshold 0.3 = cosine similarity > 0.7 (meaningful semantic match only)

### RRF merge

```
For each result at rank i (1-based):
  score += 1.0 / (60 + i)

FTS results scored independently, vector results scored independently.
Scores summed per byteId:
  → appears in both lists → higher combined score → floats to top
  → appears in one list only → lower score

Final list sorted by combined score descending.
Top N fetched as full entities.
```

**Example — "react performance" typed, logged-in user, no interests yet:**

```
FTS  → PlainToTsQuery("react performance")
       → matches bytes with "react" + "perform" in title/body
       → [byteA rank 1, byteC rank 2, byteF rank 3]

Vector → embed("search_query: react performance")
         → cosine distance < 0.3 on bytes.embedding
         → [byteB rank 1, byteA rank 2, byteD rank 3]

RRF  → score = Σ 1/(60 + rank)
       → byteA appears in both → floats to top
       → final: [byteA, byteB, byteC, byteD, byteF ...]
```

### Interviews search

Identical RRF approach on `interviews` table using `interviews.search_vector` and `interviews.embedding`.

### People search

```sql
SELECT * FROM users
WHERE username ILIKE '%query%'
   OR display_name ILIKE '%query%'
```

No embedding involved. Pure substring match.

---

## Feature 2: Search Ask (RAG)

> **Type: Multi-Document RAG** — First retrieves the top 5 relevant bytes via semantic search (embedding similarity), then feeds all 5 as context to Groq to generate a synthesised answer. Two steps: retrieve → generate. Answers questions, doesn't just find content.
>
> **Status: Backend implemented (`POST /api/ai/search-ask`), not yet wired to the search screen UI.**

**Endpoint:** `POST /api/ai/search-ask` `[Authorize]` `[RequireFeatureFlag("ai-search-ask")]`

**Request:**
```json
{
  "question": "How do I avoid unnecessary re-renders in React?",
  "type": "bytes"
}
```

**Flow:**
```
1. IEmbeddingService.EmbedQueryAsync("search_query: " + question)
   └── Always embeds the question — InterestEmbedding NOT used here
2. SearchService.SearchBytesAsync(question, queryVec, top=5)
   └── RRF hybrid search → top 5 most relevant bytes
3. Collect title + body of each as RagPassage[]
4. IGroqService.RagAnswerAsync(question, passages)
   └── Groq Llama 3.3 70B synthesises answer across all 5 passages
5. Return { answer, sources: [{ byteId, title }] }
```

**Key difference from Ask About Byte:**

| | Ask About Byte | Search Ask |
|---|---|---|
| Byte selection | Given by ID | Top 5 via vector retrieval |
| Scope | Single byte only | Multiple bytes synthesised |
| Embedding used | None (direct DB fetch) | Query embedded for retrieval |
| Endpoint | `POST /api/bytes/{id}/ask` | `POST /api/ai/search-ask` |

---

## Feature 3: AI Suggestions / Autocomplete

> **Type: No AI** — Simple prefix match on `tech_stacks.name`. No embeddings, no LLM.

**Endpoint:** `GET /api/search/suggestions?q=react`

- Returns tech stack names, popular query completions
- No AI involved — simple prefix match on `tech_stacks.name`

---

## Where `embedding` Is Used Beyond Search

| Feature | Column used | How |
|---|---|---|
| Hybrid search — semantic leg | `bytes.embedding` | Cosine distance to queryEmbedding / InterestEmbedding |
| For You feed ranking | `bytes.embedding` vs `users.interest_embedding` | Order by cosine distance |
| Search Ask RAG retrieval | `bytes.embedding` | Top 5 semantically closest bytes |
| Content validation (gate 2) | computed on-the-fly | vs `TechDomainAnchors` — cosine sim < 0.15 → reject |
| Duplicate detection | computed on-the-fly | cosine distance < 0.08 → reject |
| Ask About Byte | — | Not used; byte fetched by ID directly |

## Where `search_vector` Is Used

| Feature | Used? |
|---|---|
| Hybrid search — FTS leg | ✓ always (if query provided) |
| For You feed | ✗ |
| Search Ask RAG | ✗ |
| Ask About Byte | ✗ |
| Content validation / duplicate detection | ✗ |
