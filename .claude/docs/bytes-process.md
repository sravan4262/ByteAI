# Bytes (Feed) — Process

> **Live document.** Update this file whenever feed tabs, ranking logic, engagement features, or AI features on the bytes screen change.

---

## Screen: Feed

**Endpoint:** `GET /api/feed?filter={for_you|following|trending}&page=1&pageSize=20&stack=React,Go`

**File:** `Service/ByteAI.Core/Services/Feed/FeedService.cs` → `GetFeedAsync()`

---

## Tab: For You

> **AI type: Semantic Search (personalised)**
> Uses the user's `InterestEmbedding` vector to order content by cosine distance. No keyword matching, no generation.

### Decision tree

```
GET /api/feed?filter=for_you
  └── FeedService.GetForYouFeed(userId, pagination, tags)
        │
        ├─ userId provided AND user.InterestEmbedding exists?
        │       YES →
        │         1. Load user.InterestEmbedding (vector from users table)
        │         2. Load user's UserTechStacks (IDs from user_tech_stacks)
        │         3. Query bytes WHERE IsActive AND Embedding IS NOT NULL
        │         4. ORDER BY Embedding.CosineDistance(InterestEmbedding) ASC
        │         5. Pull candidateCount = max(skip + pageSize×3, 60)
        │         6. In-memory re-rank:
        │              a. Bytes tagged with user's tech stacks → group 0
        │              b. Rest → group 1
        │              c. Within each group: sort by cosine distance
        │         7. Skip + Take → return page
        │
        └─ Anonymous OR no InterestEmbedding yet?
                → ORDER BY CreatedAt DESC (pure recency)
```

### Tables queried

| Table | Why |
|---|---|
| `users` | Fetch `InterestEmbedding` |
| `user_tech_stacks` | Preferred stacks for soft boost |
| `bytes` | Main content, filter IsActive, order by embedding distance |
| `byte_tech_stacks` | Check if byte has preferred stack tags |
| `tech_stacks` | Resolve tag filter (stack= param) |
| `comments` | CommentCount in response |
| `user_likes` | LikeCount in response |

### Tag filter (stack= param)

Applied to all tabs:
```csharp
ByteTechStacks.Where(bts => tagNamesLower.Contains(bts.TechStack.Name.ToLower()))
```

---

## Tab: Following

```
GET /api/feed?filter=following
  └── FeedService.GetFollowingFeed(userId, pagination, tags)
        1. SELECT followingId FROM user_followings WHERE userId = me
        2. If no follows → return empty
        3. SELECT bytes WHERE AuthorId IN (followingIds) AND IsActive
        4. ORDER BY CreatedAt DESC
        5. Apply tag filter if stack= param
        6. Paginate
```

### Tables queried

| Table | Why |
|---|---|
| `user_followings` | Resolve who I follow |
| `bytes` | Filter by author, order by recency |

---

## Tab: Trending

```
GET /api/feed?filter=trending
  └── FeedService.GetTrendingFeed(pagination, tags)
        1. SELECT contentId FROM trending_events
           WHERE contentType = 'byte' AND clickedAt >= now() - 24h
           GROUP BY contentId
           ORDER BY COUNT(*) DESC
           LIMIT 200
        2. If no trending data → fall back to recency
        3. SELECT bytes WHERE Id IN (trendingIds) AND IsActive
        4. Apply tag filter
        5. Sort by position in trendingIds list (preserves click-rank order)
        6. Paginate
```

### Tables queried

| Table | Why |
|---|---|
| `trending_events` | Click counts in last 24h |
| `bytes` | Fetch bytes matching trending IDs |

---

## How InterestEmbedding Gets Built

Every time a user engages with a byte, their `InterestEmbedding` is updated:

**File:** `Service/ByteAI.Core/Events/UserEngagedWithByteEventHandler.cs`

```
User clicks/likes/bookmarks a byte
  └── UserEngagedWithByteEvent published
        └── UserEngagedWithByteEventHandler
              ├── Load byte.Embedding
              ├── Load user.InterestEmbedding (current)
              ├── new = L2Normalize(0.85 × current + 0.15 × byteEmbedding)
              └── UPDATE users SET InterestEmbedding = new
```

- **EMA decay:** 0.85/0.15 — recent content shapes interest gradually without erasing history
- **L2 normalize:** keeps the vector on the unit sphere for cosine distance correctness

---

## Engagement Features

### Like

| | |
|---|---|
| **Like** | `POST /api/bytes/{byteId}/reactions` `[Authorize]` |
| **Unlike** | `DELETE /api/bytes/{byteId}/reactions` `[Authorize]` |
| **Tables** | `user_likes` (INSERT / DELETE) |
| **Side effect** | Fires `UserEngagedWithByteEvent` → updates InterestEmbedding |

### Bookmark

| | |
|---|---|
| **Save** | `POST /api/bytes/{byteId}/bookmarks` `[Authorize]` |
| **Unsave** | `DELETE /api/bytes/{byteId}/bookmarks` `[Authorize]` |
| **List saved** | `GET /api/me/bookmarks` `[Authorize]` |
| **Tables** | `user_bookmarks` (INSERT / DELETE) |
| **Side effect** | Fires `UserEngagedWithByteEvent` → updates InterestEmbedding |

### Comment

| | |
|---|---|
| **Post** | `POST /api/bytes/{byteId}/comments` `[Authorize]` |
| **Reply** | Same endpoint with `parentCommentId` set |
| **List** | `GET /api/bytes/{byteId}/comments?page=1` |
| **Tables** | `comments` (INSERT, threaded via `ParentCommentId`) |

### View / Trending click

| | |
|---|---|
| **Track** | `POST /api/bytes/{byteId}/view` (or auto on feed load) |
| **Tables** | `trending_events` (INSERT: contentId, contentType=byte, clickedAt) |
| **Used by** | Trending tab click-count aggregation |

---

## ~~AI Feature: Ask About This Byte~~ — Replaced

> **Removed from UI.** The old `POST /api/bytes/{byteId}/ask` endpoint is commented out in `AiController.cs` but not deleted. It was a Single-Document RAG feature — user asked a question, Groq answered grounded in that one byte's 150-word body only. Provided little value because ByteAI bytes are intentionally short-form; the user can read the byte faster than formulating a question about it.

---

## Feature: Show Similar Bytes

> **Type: Semantic Search**
> No LLM, no generation. Uses the byte's stored embedding to find the closest bytes in the DB by cosine distance. Pure vector retrieval — fast and cheap.

**Endpoint:** `GET /api/bytes/{byteId}/similar` `[Authorize]` ← **new endpoint, to be implemented**

**Flow:**
```
User clicks "Show similar bytes" on byte X
  → GET /api/bytes/{byteX.id}/similar
        1. Fetch byteX.embedding from DB  ← already stored, no re-embedding needed
        2. SELECT bytes
           WHERE id != byteX.id
             AND embedding IS NOT NULL
           ORDER BY embedding <=> byteX.embedding ASC
           LIMIT 10
        3. Return top 10 closest bytes
  → Frontend navigates to /search?byteId={id}
  → Search screen detects byteId param, calls this endpoint, displays results
```

**Why the stored embedding is more accurate than a title keyword search:**
The embedding was generated from the full `title + body` of the byte — it represents the complete meaning of the content. Searching by title words alone ("React memo()") only approximates what the byte is about. The embedding captures nuance the title doesn't.

**No feature flag needed** — no LLM cost, pure DB query.

**Frontend change:** Replace "Ask about this byte" button with "Show similar bytes". On click, navigate to `/search?byteId={id}`. Search screen detects the `byteId` param and calls `GET /api/bytes/{byteId}/similar` instead of the regular search endpoint.

---

## Feed Cache (Redis — optional)

- **Class:** `RedisFeedCache`
- Feed results optionally cached per user in Redis
- **Invalidation:** when a new byte is posted, all followers' feed caches are cleared
- **File:** `Service/ByteAI.Core/Infrastructure/Cache/RedisFeedCache.cs`
- Falls back gracefully if Redis is unavailable (no caching, DB hit every request)
