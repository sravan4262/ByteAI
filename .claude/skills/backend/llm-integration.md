# LLM Integration Guide — ByteAI

> **Last updated:** 2026-04-23  
> **Provider decision:** Gemini Flash 2.0 for all LLM features (moderation, RAG, quality scoring, tag suggestions, code formatting)  
> **Embeddings:** ONNX in-process (`nomic-embed-text-v1.5`, 768-dim) — unchanged, no API dependency

---

## AI Feature Map

| Feature | Where | Blocking? | Current Provider | Target Provider |
|---|---|---|---|---|
| Content moderation | `ByteService` create/update | Yes | Groq Llama 3.3 70B | **Gemini Flash 2.0** |
| Quality scoring | `ByteCreatedEventHandler` async | No | Groq Llama 3.3 70B | **Gemini Flash 2.0** |
| Tag suggestions | `ByteCreatedEventHandler` async | No | Groq Llama 3.3 70B | **Gemini Flash 2.0** |
| RAG answer synthesis | `AiController.SearchAsk` | Yes | Groq Llama 3.3 70B | **Gemini Flash 2.0** |
| Direct Q&A | `AiController.Ask` | Yes | Groq Llama 3.3 70B | **Gemini Flash 2.0** |
| Code formatting | `AiController.FormatCode` | Yes | Groq Llama 3.3 70B | **Gemini Flash 2.0** |
| Semantic search embeddings | `OnnxEmbedder` in-process | Yes | ONNX nomic-embed-text-v1.5 | **Unchanged** |
| Draft save/update | `DraftService` | — | None | **None — intentional** |

---

## Content Moderation Pipeline

### Architecture

```
User POST ─► [1] Entropy Check ─► [2] Embedding Similarity ─► [3] LLM Gate ─► DB Save
                  (sync, free)        (sync, ONNX in-proc)      (sync, Gemini)
                       ▼                      ▼                       ▼
                  400 Gibberish         400 Off-topic           422 Invalid Content
```

### Moderation Tiers

| Tier | Stages | Latency | Cost | Use For |
|------|--------|---------|------|---------|
| **Full** | Entropy + Embedding + LLM | ~500ms | Gemini API call | Bytes, Interviews |
| **Light** | Entropy + Embedding | ~80ms | Free (ONNX) | Interview Q&A |
| **Minimal** | Entropy only | ~5ms | Free | Comments |
| **None** | – | 0ms | Free | Likes, views, bookmarks |

### Moderation Coverage (Current → Target)

| Content Type | Current | Target Tier | Rationale |
|---|---|---|---|
| Bytes (create + update) | Full ✅ | Full | Primary content, high visibility |
| Interviews | None ❌ | Full | Same stakes as bytes |
| Interview Q&A | None ❌ | Light | Conversational, LLM overkill |
| Comments (bytes) | None ❌ | Minimal | Tech-gate on comments is hostile UX |
| Interview Comments | None ❌ | Minimal | Same as above |
| **Drafts (save/update)** | None ✅ | **None — intentional** | Partial content by definition; fields are nullable. Moderation runs at publish time when the user posts to `/api/bytes` or `/api/interviews`. Never moderate drafts. |

### Draft publish flow

Drafts are work-in-progress — `DraftService.SaveDraftAsync` intentionally skips all validation since title, body, and other fields are nullable and the user may not have finished writing.

The moderation gate fires at **publish time**, not at draft save time:

```
User clicks "Publish" in draft editor
        │
        ▼
POST /api/bytes  (or /api/interviews)
   with draft content as the request body
        │
        ▼
Full moderation pipeline runs (Entropy → Embedding → Gemini LLM gate)
        │
        ▼
Byte/Interview created, Draft can be deleted by client
```

The draft entity itself is not promoted to a byte — the client sends a fresh POST with the draft content. There is no server-side "publish draft" endpoint. This means:
- No changes to `DraftService` or `DraftsController` for moderation
- No LLM calls touch the draft flow
- The Gemini migration has zero impact on drafts

---

## Stage 1 — Entropy Check

**File:** `ByteService.cs` → `IsGibberish()` — extract to `ContentModerationService` when extending to other types.

```csharp
// Thresholds — tuned for English tech content
const double MinShannonEntropy = 3.0;   // keyboard mash is ~1.5
const double MinAvgWordLength  = 2.5;   // filters single-char spam
const double MinVowelRatio     = 0.15;  // normal English ~38%
const double MaxSymbolDensity  = 0.25;  // high punctuation = spam
const int    MinCombinedLength = 15;    // reject "lol" posts
```

Throws `InvalidContentException("Content appears to be gibberish")` on fail.

---

## Stage 2 — Embedding Similarity

**Files:** `EmbeddingService.cs`, `TechDomainAnchors.cs`, `OnnxEmbedder.cs`  
**Model:** `nomic-embed-text-v1.5` (768-dim, 8192 token context) via ONNX — in-process singleton, zero cost, no API dependency.  
**Task prefixes (required by nomic):** `search_document:` for stored content, `search_query:` for user input.

```csharp
// 10 tech domain anchors in TechDomainAnchors.cs
"software development and programming"
"cloud infrastructure and devops"
"machine learning and artificial intelligence"
"system design and software architecture"
"databases and data engineering"
"cybersecurity and networking"
"web and mobile development"
"algorithms and data structures"
"developer tools and version control"
"open source and software engineering"

const double MinCosineSimilarity = 0.15;  // permissive — only rejects clear non-tech
```

**Tuning:** 0.20–0.25 = stricter, 0.10 = more permissive (e.g. for interview comments).

---

## Stage 3 — LLM Gate

**Provider (target):** Google Gemini Flash 2.0  
**Endpoint:** `https://generativelanguage.googleapis.com/v1beta/openai/chat/completions` (OpenAI-compatible)  
**Model name:** `gemini-2.0-flash`  
**Prompt style:** JSON-schema-constrained, temperature 0.3, max 80 tokens.

```
Rules sent to model:
- isTechRelated: true if ANY mention of technology, language, framework, tool, concept. Be generous.
- isCoherent:    false ONLY for random keyboard mashing or completely unintelligible text.
- reason:        one short phrase (max 20 words).
```

**Fail-closed vs fail-open:**
- Bytes, Interviews → fail-closed: throw `ServiceUnavailableException` (HTTP 503) on null
- Comments → fail-open: pass through on null (blocking comments on outage is bad UX)

---

## Provider Decision

### Why Gemini Flash 2.0

| Criterion | Groq (current) | Gemini Flash 2.0 (target) |
|---|---|---|
| RPM limit | 30 RPM (both models share pool) | None — pay-per-use |
| RPD limit | 1K/day (70B), 14.4K/day (8B) | None |
| Load balancer needed | Yes (`GroqLoadBalancer`, ~140 lines) | No |
| Feature flag toggling on quota exhaustion | Yes | No |
| Context window | 128K | 1M tokens |
| RAG suitability | Good | Excellent (large context fits many passages without truncation) |
| JSON compliance | Very good | Very good |
| Speed | Very fast (LPU silicon) | Fast |
| Cost | Free (with hard limits) | $0.075/M input, $0.30/M output |
| Cost estimate (1K bytes/day) | Free until quota hit | ~$0.15/day all-in |

### Why not the alternatives

| Provider | Reason skipped |
|---|---|
| Groq | 30 RPM + 1K RPD primary quota creates hard ceiling; load balancer is complexity for free tier limits |
| DeepSeek | Servers in China — data privacy concern; slower inference |
| Cerebras | Good option but adds another API key; Gemini covers all use cases in one provider |
| Fireworks | Good price but splitting moderation and RAG across providers adds complexity |

---

## Migration Plan: Groq → Gemini Flash

### Files to delete

| File | Why |
|---|---|
| `Service/ByteAI.Core/Services/AI/GroqLoadBalancer.cs` | Entire class is Groq-specific RPM/RPD tracking — not needed with pay-per-use |
| `Service/tests/ByteAI.Api.Tests/Unit/Services/GroqLoadBalancerTests.cs` | Tests for deleted class |

### Files to rename

| Old | New | Change |
|---|---|---|
| `IGroqService.cs` | `ILlmService.cs` | Rename interface + update record comments (remove "Groq" references) |
| `GroqService.cs` | `GeminiService.cs` | Full replacement — see implementation notes below |

### Files to update

| File | Change |
|---|---|
| `Program.cs` | Remove `GroqLoadBalancer` singleton; update HttpClient registration to `ILlmService, GeminiService`; remove 429 skip from retry policy (Gemini doesn't use model fallback internally) |
| `AiController.cs` | `IGroqService groq` → `ILlmService llm`; update constructor param name; update XML doc comments |
| `ByteCreatedEventHandler.cs` | `IGroqService groq` → `ILlmService llm` |
| `ByteService.cs` | `IGroqService` → `ILlmService` |
| `appsettings.json` | Remove `Groq` block; add `Gemini: { ApiKey: "" }` |

### GeminiService implementation notes

Gemini exposes an OpenAI-compatible endpoint — `GeminiService` is structurally identical to `GroqService` with these differences:

```csharp
// Base URL
"https://generativelanguage.googleapis.com/v1beta/openai/chat/completions"

// Model
"gemini-2.0-flash"

// Config key
config["Gemini:ApiKey"]

// No GroqLoadBalancer dependency — remove balancer parameter from constructor
// Replace balancer.IsAvailable check with:
if (string.IsNullOrEmpty(apiKey)) { logger.LogWarning(...); return null; }

// No model fallback logic — remove GetModel(), GetFallback(), RecordRpd() calls
// No RPM/RPD retry branching in SendAsync — let the standard resilience handler retry 5xx
// Remove the 429 special-case block (no model switching needed)
```

All prompt strings, JSON parsing, temperature, and max token values stay identical.

### Program.cs DI diff

```csharp
// Remove:
builder.Services.AddSingleton<GroqLoadBalancer>();
builder.Services.AddHttpClient<IGroqService, GroqService>()
    .AddStandardResilienceHandler()
    .Configure(options =>
    {
        // ... existing config ...
        // Skip 429 — GroqService handles those internally with model fallback.
        options.Retry.ShouldHandle = args => args.Outcome switch { ... };
    });

// Add:
builder.Services.AddHttpClient<ILlmService, GeminiService>()
    .AddStandardResilienceHandler()
    .Configure(options =>
    {
        options.AttemptTimeout.Timeout          = TimeSpan.FromSeconds(20);
        options.CircuitBreaker.SamplingDuration = TimeSpan.FromSeconds(60);
        options.TotalRequestTimeout.Timeout     = TimeSpan.FromSeconds(45);
        options.Retry.MaxRetryAttempts          = 2;
        options.Retry.BackoffType               = DelayBackoffType.Exponential;
        options.Retry.UseJitter                 = true;
        // Retry on network errors and 5xx — Gemini 429s are transient, also retry
        options.Retry.ShouldHandle = args => args.Outcome switch
        {
            { Exception: HttpRequestException }               => PredicateResult.True(),
            { Result: { } r } when (int)r.StatusCode >= 500  => PredicateResult.True(),
            { Result: { } r } when (int)r.StatusCode == 429  => PredicateResult.True(),
            _                                                  => PredicateResult.False(),
        };
    });
```

### appsettings.json diff

```json
// Remove:
"Groq": {
  "ApiKey": "",
  "Model": "llama-3.3-70b-versatile"
}

// Add:
"Gemini": {
  "ApiKey": ""
}
```

### Test changes

- **Delete** `GroqLoadBalancerTests.cs` — class no longer exists
- **Update** `ByteServiceTests.cs` — mock `ILlmService` instead of `IGroqService` (method signatures unchanged)
- **Update** `ByteCreatedEventHandlerTests.cs` — same mock rename

---

## Quality Scoring (Async Background)

Runs in `ByteCreatedEventHandler` after save — never blocks the request. Pattern is unchanged; only the injected interface renames.

```csharp
_ = Task.Run(async () =>
{
    var score = await _llm.ScoreQualityAsync(notification.Title, notification.Body, CancellationToken.None);
    if (score is null) return;
    // ... save to ByteQualityScores ...
});
```

---

## Exception Reference

| Exception | HTTP | When to throw |
|---|---|---|
| `InvalidContentException(reason)` | 422 | Any moderation stage fails |
| `DuplicateContentException(id, title, similarity)` | 409 | Near-duplicate detected (bytes only) |
| `ServiceUnavailableException` | 503 | LLM API unreachable on fail-closed content types |

---

## Deployment Impact

### What you need to do first (one-time setup)

**1. Get a Gemini API key**
- Go to [Google AI Studio](https://aistudio.google.com) → sign in with Google
- Click **Get API key** → **Create API key in new project** (or existing project)
- Copy the key — it starts with `AIza...`
- No billing required for development (free tier: 15 RPM, 1M tokens/day on Flash)
- For production traffic: enable billing in Google Cloud Console (pay-per-use kicks in above free limits)

**2. Add the secret to GitHub**
- Go to your repo → **Settings → Secrets and variables → Actions**
- Click **New repository secret**
- Name: `GEMINI_API_KEY`, Value: your key
- After the migration is live and confirmed working: delete `GROQ_API_KEY`

**3. Update your local dev config**

Option A — `appsettings.Development.json` (gitignored):
```json
{
  "Gemini": {
    "ApiKey": "AIza..."
  }
}
```

Option B — .NET user secrets (recommended, never touches disk in the repo):
```bash
cd Service/ByteAI.Api
dotnet user-secrets set "Gemini:ApiKey" "AIza..."
dotnet user-secrets remove "Groq:ApiKey"   # clean up old key
```

---

### Secrets changing

| Secret | Location | Action |
|---|---|---|
| `GROQ_API_KEY` | GitHub repo secrets | **Remove** after migration is confirmed live |
| `GEMINI_API_KEY` | GitHub repo secrets | **Add** before deploying the migration |

No other secrets change — Supabase, database, CORS, and Azure credentials are all unaffected.

---

### Pipeline files that need changes

#### `deploy.service.yml` — one line change

This is the only pipeline file that references the API key. It injects env vars into the Azure Container App revision at deploy time.

```yaml
# Line 173–179 — current:
--set-env-vars \
  "ConnectionStrings__Postgres=${{ secrets.DATABASE_URL }}" \
  "Groq__ApiKey=${{ secrets.GROQ_API_KEY }}" \       ← remove this
  "Cors__AllowedOrigin=${{ secrets.FRONTEND_URL }}" \
  ...

# After migration:
--set-env-vars \
  "ConnectionStrings__Postgres=${{ secrets.DATABASE_URL }}" \
  "Gemini__ApiKey=${{ secrets.GEMINI_API_KEY }}" \   ← add this
  "Cors__AllowedOrigin=${{ secrets.FRONTEND_URL }}" \
  ...
```

> **Note:** Double underscores (`Gemini__ApiKey`) are the ASP.NET Core convention for nested config in environment variables. This maps to `config["Gemini:ApiKey"]` at runtime.

#### `ci.build-test.yml` — no changes needed

CI builds and runs unit tests only. Tests mock `ILlmService` (formerly `IGroqService`) — no real API is called. No secrets are passed to the test runner.

#### `infra.terraform.yml` — no changes needed

Terraform provisions Azure infrastructure only (Container Apps, networking, etc.). API keys are never stored in Terraform — they're injected at deploy time by `deploy.service.yml`.

#### `deploy.ui.yml` and `deploy.db.yml` — no changes needed

Frontend and database migration pipelines have no dependency on the LLM provider.

---

### Azure Container App — what actually happens at runtime

The `--set-env-vars` in `deploy.service.yml` sets environment variables directly on the Container App revision. Azure stores these as plain env vars on the container (not Azure Key Vault — consider moving to Key Vault references for production hardening).

At runtime, ASP.NET Core reads `Gemini__ApiKey` from the environment and maps it to `config["Gemini:ApiKey"]`, which `GeminiService` reads via `config["Gemini:ApiKey"]`.

**If `GEMINI_API_KEY` secret is missing or empty when the pipeline runs**, `GeminiService.ChatAsync` logs a warning and returns `null` — which causes HTTP 503 on any byte post attempt. The container will still start and pass health checks (the ONNX embedder is independent), but all LLM features will be broken. Always verify the secret exists before triggering a deploy.

---

### Deployment sequence for the migration

Do this in order to avoid a broken production window:

```
1. Add GEMINI_API_KEY to GitHub repo secrets
2. Implement code changes (GeminiService, rename ILlmService, remove GroqLoadBalancer)
3. Push to main → CI runs (build + tests pass)
4. CI triggers deploy.service.yml → blue-green deploy
5. New revision starts at 0% traffic, health probes run
6. Traffic swaps to new revision, smoke test hits /health/ready
7. If smoke fails → auto-rollback to previous revision (still running GroqService)
8. Confirm Gemini calls are working in production logs
9. Remove GROQ_API_KEY from GitHub secrets
```

The blue-green setup in `deploy.service.yml` means zero-downtime — if `GeminiService` has a bug, the auto-rollback returns 100% traffic to the previous Groq-based revision within seconds of the smoke test failure.
