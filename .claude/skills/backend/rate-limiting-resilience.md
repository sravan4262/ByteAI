# Rate Limiting & Resilience Guide — ByteAI

> **Last updated:** 2026-04-23  
> **Scope:** All API endpoints across 17 controllers — rate limiting policy assignment and Polly circuit breaker coverage.

---

## Current Infrastructure

### Rate Limiting (Program.cs)

All policies are partitioned per Supabase user ID (`sub` claim), falling back to IP address. Rejection returns RFC 6585 JSON with `Retry-After` header.

| Policy | Type | Window | Limit | Queue | Used On |
|---|---|---|---|---|---|
| `ai` | Sliding window | 1 min | 10 req | 0 | AI endpoints (burst-safe) |
| `write` | Fixed window | 1 min | 10 req | 0 | Content creation |
| `search` | Fixed window | 1 min | 10 req | 0 | Search |
| `social` | Fixed window | 1 min | 10 req | 0 | Reactions, comments, follows |
| `support` | Fixed window | 1 min | 5 req | 0 | Feedback submission |
| `auth` | Fixed window | 5 min | 3 req | 0 | **Missing — needs to be added** |

`UseRateLimiter()` is applied globally in the middleware pipeline.

### Polly Resilience (Program.cs)

Only one external HTTP client has a resilience pipeline:

| Client | Handler | Attempt Timeout | Total Timeout | Retries | Circuit Breaker |
|---|---|---|---|---|---|
| `ILlmService` (Gemini) | `AddStandardResilienceHandler` | 20s | 45s | 2 (exp backoff + jitter) | 60s sampling window |
| `IAvatarService` (Supabase Storage) | None | — | — | — | **Missing** |

---

## Full Endpoint Audit

### Current coverage

| Controller | Endpoint | Method | Rate Limit | External Call | Resilience |
|---|---|---|---|---|---|
| **Auth** | `/api/auth/provision` | POST | ❌ None | No | — |
| **Auth** | `/api/auth/account` | DELETE | ❌ None | No | — |
| **Users** | `/api/users/{id}` | GET | ❌ None | No | — |
| **Users** | `/api/users/username/{u}` | GET | ❌ None | No | — |
| **Users** | `/api/users/me` | GET | ❌ None | No | — |
| **Users** | `/api/users/{id}/followers` | GET | ❌ None | No | — |
| **Users** | `/api/users/{id}/following` | GET | ❌ None | No | — |
| **Users** | `/api/users/me/profile` | PUT | ❌ None | No | — |
| **Users** | `/api/users/me/socials` | GET | ❌ None | No | — |
| **Users** | `/api/users/me/socials` | PUT | ❌ None | No | — |
| **Users** | `/api/users/me/preferences` | GET | ❌ None | No | — |
| **Users** | `/api/users/me/preferences` | PUT | ❌ None | No | — |
| **Users** | `/api/users/me/avatar` | POST | ❌ None | **Supabase Storage** | ❌ No Polly |
| **Bytes** | `/api/bytes` | GET | ❌ None | No | — |
| **Bytes** | `/api/bytes/{id}` | GET | ❌ None | No | — |
| **Bytes** | `/api/bytes` | POST | ✅ `write` | Gemini (moderation) | ✅ via ILlmService |
| **Bytes** | `/api/bytes/{id}` | PUT | ❌ None | Gemini (moderation) | ✅ via ILlmService |
| **Bytes** | `/api/bytes/{id}` | DELETE | ❌ None | No | — |
| **Bytes** | `/api/me/bytes` | GET | ❌ None | No | — |
| **Bytes** | `/api/bytes/{id}/view` | POST | ✅ `social` | No | — |
| **Comments** | `/api/bytes/{id}/comments` | GET | ❌ None | No | — |
| **Comments** | `/api/bytes/{id}/comments` | POST | ✅ `social` | No | — |
| **Comments** | `/api/comments/{id}` | PUT | ❌ None | No | — |
| **Comments** | `/api/comments/{id}` | DELETE | ❌ None | No | — |
| **Interviews** | `/api/interviews/companies` | GET | ❌ None | No | — |
| **Interviews** | `/api/interviews/roles` | GET | ❌ None | No | — |
| **Interviews** | `/api/interviews/locations` | GET | ❌ None | No | — |
| **Interviews** | `/api/interviews` | GET | ❌ None | No | — |
| **Interviews** | `/api/interviews/{id}` | GET | ❌ None | No | — |
| **Interviews** | `/api/interviews` | POST | ✅ `write` | No | — |
| **Interviews** | `/api/interviews/with-questions` | POST | ✅ `write` | No | — |
| **Interviews** | `/api/interviews/{id}` | PUT | ❌ None | No | — |
| **Interviews** | `/api/interviews/{id}` | DELETE | ❌ None | No | — |
| **Interviews** | `/api/interviews/{id}/comments` | POST | ✅ `social` | No | — |
| **Interviews** | `/api/interviews/{id}/comments` | GET | ❌ None | No | — |
| **Interviews** | `/api/interviews/{id}/comments/{id}` | DELETE | ❌ None | No | — |
| **Interviews** | `/api/interviews/{id}/reactions` | POST | ✅ `social` | No | — |
| **Interviews** | `/api/interviews/{id}/reactions` | DELETE | ❌ None | No | — |
| **Interviews** | `/api/interviews/{id}/bookmarks` | POST | ✅ `social` | No | — |
| **Interviews** | `/api/interviews/questions/{id}/likes` | POST | ✅ `social` | No | — |
| **Interviews** | `/api/interviews/questions/{id}/likes` | DELETE | ❌ None | No | — |
| **Interviews** | `/api/interviews/questions/{id}/comments` | POST | ✅ `social` | No | — |
| **Interviews** | `/api/interviews/questions/{id}/comments` | GET | ❌ None | No | — |
| **Interviews** | `/api/interviews/questions/comments/{id}` | DELETE | ❌ None | No | — |
| **Interviews** | `/api/me/interviews` | GET | ❌ None | No | — |
| **Interviews** | `/api/me/interview-bookmarks` | GET | ❌ None | No | — |
| **AI** | `/api/ai/ask` | POST | ✅ `ai` | Gemini | ✅ via ILlmService |
| **AI** | `/api/ai/search-ask` | POST | ✅ `ai` | Gemini | ✅ via ILlmService |
| **AI** | `/api/ai/format-code` | POST | ✅ `ai` | Gemini | ✅ via ILlmService |
| **AI** | `/api/bytes/{id}/similar` | GET | ✅ `search` | No (pgvector ANN query) | — |
| **Search** | `/api/search` | GET | ✅ `search` | No | — |
| **Follow** | `/api/users/{id}/follow` | POST | ✅ `social` | No | — |
| **Follow** | `/api/users/{id}/follow` | DELETE | ❌ None | No | — |
| **Reactions** | `/api/bytes/{id}/reactions` | POST | ✅ `social` | No | — |
| **Reactions** | `/api/bytes/{id}/reactions` | DELETE | ❌ None | No | — |
| **Reactions** | `/api/bytes/{id}/reactions` | GET | ❌ None | No | — |
| **Reactions** | `/api/bytes/{id}/likes` | GET | ❌ None | No | — |
| **Bookmarks** | `/api/bytes/{id}/bookmarks` | POST | ❌ None | No | — |
| **Bookmarks** | `/api/me/bookmarks` | GET | ❌ None | No | — |
| **Drafts** | `/api/me/drafts` | POST | ❌ None | No | — |
| **Drafts** | `/api/me/drafts` | GET | ❌ None | No | — |
| **Drafts** | `/api/me/drafts/{id}` | DELETE | ❌ None | No | — |
| **Notifications** | `/api/notifications` | GET | ❌ None | No | — |
| **Notifications** | `/api/notifications/{id}/read` | PUT | ❌ None | No | — |
| **Notifications** | `/api/notifications/read-all` | PUT | ❌ None | No | — |
| **Notifications** | `/api/notifications/{id}` | DELETE | ❌ None | No | — |
| **Notifications** | `/api/notifications/unread-count` | GET | ❌ None | No | — |
| **Admin** | All `/api/admin/**` | ALL | ❌ None | No | — |
| **Lookup** | All `/api/lookup/**` | GET | ✅ `[DisableRateLimiting]` | No | — |
| **FeatureFlags** | `/api/feature-flags` | GET | ❌ None | No | — |
| **Support** | `/api/support/feedback` | POST | ✅ `support` | No | — |
| **Support** | `/api/support/feedback/history` | GET | ❌ None | No | — |

---

## What Needs to Change

### Priority 1 — High (security / abuse risk)

#### New `auth` policy — account endpoints are completely unprotected

`POST /api/auth/provision` creates a user profile on every call. `DELETE /api/auth/account` is irreversible. Both are high-value targets for account farming and destructive scripting. They have no rate limit at all.

Add to `AddRateLimiter` in `Program.cs`:
```csharp
opt.AddPolicy<string>("auth", ctx => RateLimitPartition.GetFixedWindowLimiter(
    PartitionByUser(ctx),
    _ => new FixedWindowRateLimiterOptions
    {
        Window            = TimeSpan.FromMinutes(5),
        PermitLimit       = 3,
        QueueLimit        = 0,
        AutoReplenishment = true,
    }));
```

Apply in `AuthController.cs`:
```csharp
[HttpPost("provision")]
[EnableRateLimiting("auth")]   // ← add

[HttpDelete("account")]
[EnableRateLimiting("auth")]   // ← add
```

#### Polly resilience on `AvatarService`

`AvatarService` makes an outbound HTTP PUT to Supabase Storage with no timeout, no retry, no circuit breaker. If Supabase Storage is slow, the avatar upload hangs the thread until ASP.NET's 100s default. If it's down, every upload blocks and throws `InvalidOperationException` with no structured retry.

Add to `Program.cs` alongside the existing `ILlmService` registration:
```csharp
builder.Services.AddHttpClient<IAvatarService, AvatarService>()
    .AddStandardResilienceHandler()
    .Configure(options =>
    {
        options.AttemptTimeout.Timeout          = TimeSpan.FromSeconds(15);
        options.TotalRequestTimeout.Timeout     = TimeSpan.FromSeconds(30);
        options.Retry.MaxRetryAttempts          = 1;   // uploads are idempotent (x-upsert: true)
        options.Retry.BackoffType               = DelayBackoffType.Constant;
        options.CircuitBreaker.SamplingDuration = TimeSpan.FromSeconds(60);
        options.Retry.ShouldHandle = args => args.Outcome switch
        {
            { Exception: HttpRequestException }              => PredicateResult.True(),
            { Result: { } r } when (int)r.StatusCode >= 500 => PredicateResult.True(),
            _                                                => PredicateResult.False(),
        };
    });
```

Also add rate limiting on the avatar upload endpoint in `UsersController.cs`:
```csharp
[HttpPost("me/avatar")]
[EnableRateLimiting("write")]   // ← add
```

---

### Priority 2 — Medium (consistency / spam prevention)

#### PUT on bytes and interviews run the Gemini moderation pipeline but have no rate limit

`PUT /api/bytes/{id}` and `PUT /api/interviews/{id}` both call Gemini when content changes — same cost as a POST. The create endpoints have `write` limits; the update endpoints don't. An attacker can spam updates to burn Gemini quota.

`BytesController.cs`:
```csharp
[HttpPut("{byteId:guid}")]
[EnableRateLimiting("write")]   // ← add
```

`InterviewsController.cs`:
```csharp
[HttpPut("{id:guid}")]
[EnableRateLimiting("write")]   // ← add
```

#### Comment updates have no limit

`PUT /api/comments/{id}` is unprotected. Rapid edits can be used to spam notifications or cycle through content to evade moderation.

`CommentsController.cs`:
```csharp
[HttpPut("{commentId:guid}")]
[EnableRateLimiting("social")]   // ← add
```

#### Follow/unfollow asymmetry

`POST /api/users/{id}/follow` has `social` rate limit. `DELETE /api/users/{id}/follow` does not. Follow-bot patterns work by rapidly following then unfollowing — the unfollow is the attack vector.

`FollowController.cs`:
```csharp
[HttpDelete("{userId:guid}/follow")]
[EnableRateLimiting("social")]   // ← add
```

#### Byte bookmarks unprotected

`POST /api/bytes/{id}/bookmarks` has no limit. Interview bookmarks (`POST /api/interviews/{id}/bookmarks`) do have `social`. Inconsistent.

`BookmarksController.cs`:
```csharp
[HttpPost("{byteId:guid}/bookmarks")]
[EnableRateLimiting("social")]   // ← add
```

---

### Priority 3 — Low (good hygiene)

#### Draft saves

`POST /api/me/drafts` is a DB write on every autosave. Aggressive clients (or bugs) can spam this. Add `write` limit.

`DraftsController.cs`:
```csharp
[HttpPost]
[EnableRateLimiting("write")]   // ← add
```

---

## What Deliberately Has No Rate Limiting

| Category | Reason |
|---|---|
| All `GET` reads (feed, bytes list, profiles, notifications, reactions) | Handled at the gateway/CDN layer; adding per-endpoint limits adds noise without benefit at this stage |
| All `/api/admin/**` | Admin role is trusted; rate limiting admins creates friction with no payoff |
| `/api/lookup/**` | Already `[DisableRateLimiting]` — static reference data, correct |
| Content `DELETE` (delete byte, delete interview, delete comment) | Users won't spam delete their own content; these are irreversible with no abuse incentive |
| `GET /api/feature-flags` | Cheap DB read, public endpoint, low risk |

---

## What Deliberately Has No Circuit Breaker

| Dependency | Why no Polly needed |
|---|---|
| `OnnxEmbedder` / `EmbeddingService` | ONNX runs in-process — no network call |
| Supabase JWT validation | JWT is validated locally using the shared secret — no outbound HTTP per request |
| PostgreSQL / EF Core | Npgsql has built-in transient retry; adding Polly on top is redundant for a single DB |

---

## Target State After Changes

| Policy | Endpoints |
|---|---|
| `auth` | POST `/api/auth/provision`, DELETE `/api/auth/account` |
| `write` | POST `/api/bytes`, PUT `/api/bytes/{id}`, POST `/api/interviews`, POST `/api/interviews/with-questions`, PUT `/api/interviews/{id}`, POST `/api/users/me/avatar`, POST `/api/me/drafts` |
| `social` | POST/DELETE `/api/users/{id}/follow`, POST `/api/bytes/{id}/comments`, PUT `/api/comments/{id}`, POST `/api/bytes/{id}/reactions`, POST `/api/bytes/{id}/bookmarks`, POST `/api/bytes/{id}/view`, POST `/api/interviews/{id}/comments`, POST `/api/interviews/{id}/reactions`, POST `/api/interviews/{id}/bookmarks`, POST `/api/interviews/questions/{id}/likes`, POST `/api/interviews/questions/{id}/comments` |
| `search` | GET `/api/search`, GET `/api/bytes/{id}/similar` |
| `ai` | POST `/api/ai/ask`, POST `/api/ai/search-ask`, POST `/api/ai/format-code` |
| `support` | POST `/api/support/feedback` |
| `[DisableRateLimiting]` | All `/api/lookup/**` |
| None (intentional) | All GETs, Admin, content DELETEs, notifications, feature flags |

---

## Implementation Checklist

- [ ] Add `auth` policy to `Program.cs`
- [ ] `AuthController` — add `[EnableRateLimiting("auth")]` to provision + delete account
- [ ] `Program.cs` — add `AddStandardResilienceHandler` to `IAvatarService` HttpClient
- [ ] `UsersController` — add `[EnableRateLimiting("write")]` to avatar upload
- [ ] `BytesController` — add `[EnableRateLimiting("write")]` to PUT
- [ ] `InterviewsController` — add `[EnableRateLimiting("write")]` to PUT
- [ ] `CommentsController` — add `[EnableRateLimiting("social")]` to PUT
- [ ] `FollowController` — add `[EnableRateLimiting("social")]` to DELETE unfollow
- [ ] `BookmarksController` — add `[EnableRateLimiting("social")]` to POST byte bookmark
- [ ] `DraftsController` — add `[EnableRateLimiting("write")]` to POST save draft
- [ ] `BytesController` — add `[EnableRateLimiting("search")]` to GET similar bytes (`/api/bytes/{id}/similar`)
