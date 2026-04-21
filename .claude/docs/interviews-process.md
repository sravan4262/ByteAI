# Interviews — Process

> **Live document.** Update this file whenever interview fetching, filtering, engagement, or AI features change.

---

## Screen: Interviews Feed

**Endpoint:** `GET /api/interviews?page=1&pageSize=20&company=Google&difficulty=hard&stack=React,Go&sort=recent`

**Handler:** `GetInterviewsWithQuestionsQuery`

### What gets returned

```csharp
InterviewWithQuestionsResponse {
  Id, AuthorId, Title, Company, Role, Difficulty,
  Language, Type, CreatedAt, UpdatedAt,
  LikeCount, CommentCount, BookmarkCount,
  Questions: [{ Id, Question, Answer, OrderIndex, LikeCount, CommentCount }]
}
```

Questions are embedded in the response, ordered by `OrderIndex`.

### Filters

| Param | Table / Column | Notes |
|---|---|---|
| `company` | `interviews.company` | ILIKE match |
| `difficulty` | `interviews.difficulty` | exact: easy/medium/hard |
| `stack` | `interview_tech_stacks → tech_stacks.name` | comma-separated |
| `sort` | — | `recent` = CreatedAt DESC (default) |
| `authorId` | `interviews.author_id` | for profile page |

### Tables queried

| Table | Why |
|---|---|
| `interviews` | Main content |
| `interview_questions` | Embedded Q&A, ordered by OrderIndex |
| `interview_tech_stacks` | Tag filter + response tags |
| `tech_stacks` | Resolve tag names |
| `interview_likes` | LikeCount |
| `interview_comments` | CommentCount |
| `interview_bookmarks` | BookmarkCount |

---

## Engagement Features

### Like Interview

| | |
|---|---|
| **Like** | `POST /api/interviews/{id}/reactions` `[Authorize]` `{ type: "like" }` |
| **Unlike** | `DELETE /api/interviews/{id}/reactions` `[Authorize]` |
| **Table** | `interview_likes` (INSERT / DELETE) |

### Bookmark Interview

| | |
|---|---|
| **Save** | `POST /api/interviews/{id}/bookmarks` `[Authorize]` |
| **Unsave** | `DELETE /api/interviews/{id}/bookmarks` `[Authorize]` |
| **Table** | `interview_bookmarks` (INSERT / DELETE) |

### Comment on Interview

| | |
|---|---|
| **Post** | `POST /api/interviews/{id}/comments` `[Authorize]` `{ body, parentId? }` |
| **List** | `GET /api/interviews/{id}/comments?page=1` |
| **Table** | `interview_comments` (threaded via `ParentCommentId`) |

### Like a Question (within an interview)

| | |
|---|---|
| **Like** | `POST /api/interviews/{id}/questions/{questionId}/like` `[Authorize]` |
| **Table** | `interview_question_likes` (INSERT / DELETE) |

### Comment on a Question

| | |
|---|---|
| **Post** | `POST /api/interviews/{id}/questions/{questionId}/comments` `[Authorize]` |
| **Table** | `interview_question_comments` |

---

## AI Feature: Ask About This Interview

> **Type: Single-Document RAG**
> No retrieval step — the interview is already known. Content is fed directly to the LLM as context and the LLM generates a grounded answer. This is not a search; nothing is looked up by similarity.

**Endpoint:** `POST /api/interviews/{id}/ask` `[Authorize]`

**Request:**
```json
{ "question": "What is the expected time complexity for this problem?" }
```

**Flow:**
```
1. Fetch interview by ID from interviews table  ← direct lookup, no embedding
2. Build RagPassage(title, body, interviewId)
3. IGroqService.RagAnswerAsync(question, [passage])
   └── Groq Llama 3.3 70B generates answer grounded in interview content only
4. Return { answer, interviewId, title }
```

No embedding used — interview fetched directly by ID. Answer scoped to that interview's content only.

> **How it differs from Search Ask:** Search Ask retrieves the top 5 relevant bytes/interviews via semantic search first, then generates across all of them. Ask About Interview skips retrieval — the content is given, not found. See `search-process.md` for the full AI feature comparison.

---

## Interview Entity Structure

**File:** `Service/ByteAI.Core/Entities/Interview.cs`

| Field | Notes |
|---|---|
| `Id` | GUID primary key |
| `AuthorId` | FK → users |
| `Title` | Interview title |
| `Body` | Context / description |
| `Company` | e.g. "Google", "Meta" |
| `Role` | e.g. "SDE II", "Staff Engineer" |
| `Difficulty` | easy / medium / hard |
| `Language` | Code language if applicable |
| `Embedding` | 768-dim vector (nomic-embed-text-v1.5) |
| `Type` | interview type |
| `IsActive` | soft delete flag |

**Embedding** is generated async via `InterviewCreatedEventHandler` (same pattern as ByteCreatedEventHandler).
