---
name: todo
description: ByteAI remaining work — what's NOT yet implemented, in priority order. Reference this before starting any new feature to avoid duplication.
---

# ByteAI TODO — Remaining Work

Status as of 2026-04-09. Backend compiles (0 errors), Swagger UI works at `/swagger`. Local Supabase DB running with schema applied and seed data loaded. Frontend wired to real backend via `http.ts` + `client.ts`.

## Recently Completed ✅
- Swagger UI with Bearer security scheme, XML doc comments on all controllers
- Redis DI fix — `RedisFeedCache` always registered, `AddDistributedMemoryCache()` fallback
- Supabase JWT dev bypass — any well-formed JWT accepted in Development
- All frontend stub functions added to `UI/lib/api/client.ts`
- Frontend module errors fixed (`@/lib/mock-data`, `@/lib/schemas`, `@/lib/utils` barrels restored)
- **Local dev setup** — Supabase DB running, pgvector extension enabled, all 9 tables applied via psql
- **Seed data** — 5 seed users + 23 bytes seeded via `scripts/seed.sql` (React, TS, Rust, Go, Python, K8s, AWS, Docker, Postgres, AI/ML, Redis, Terraform, Node.js, GraphQL)
- **Frontend ↔ Backend wired** — `UI/lib/api/http.ts` base client created, `client.ts` fully rewritten to call real endpoints with mock fallback, `feed-screen.tsx` uses `api.getFeed()`
- **`.gitignore`** updated — `appsettings.Development.json` and `.env.local` excluded
- **`appsettings.Development.json`** created with Groq key placeholder
- **`UI/.env.local`** created with `NEXT_PUBLIC_API_URL=http://localhost:5239`

---

## Phase 1 — Config & Local Dev ✅ COMPLETE

Everything in this phase is done. Supabase local dev is the DB — connection string is `postgresql://postgres:postgres@127.0.0.1:54322/postgres`. No separate docker-compose needed for DB.

To restart: `supabase start` from repo root, then `cd Service && dotnet run --project ByteAI.Api`.

---

## Phase 2 — Security Hardening

### Supabase Webhook Signature Validation

`WebhooksController.cs` has a TODO for svix signature validation. This MUST be implemented before production — without it, anyone can POST fake events to /webhooks/auth`.

```csharp
// WebhooksController.cs — replace TODO with:
private bool ValidateSvixSignature(HttpRequest request, string body)
{
    var svixId = request.Headers["svix-id"].ToString();
    var svixTimestamp = request.Headers["svix-timestamp"].ToString();
    var svixSignature = request.Headers["svix-signature"].ToString();
    var webhookSecret = _config["Supabase:WebhookSecret"] ?? string.Empty;

    if (string.IsNullOrEmpty(svixId) || string.IsNullOrEmpty(svixTimestamp)
        || string.IsNullOrEmpty(svixSignature) || string.IsNullOrEmpty(webhookSecret))
        return false;

    // HMAC-SHA256 of "{svixId}.{svixTimestamp}.{body}"
    var payload = $"{svixId}.{svixTimestamp}.{body}";
    var key = Convert.FromBase64String(webhookSecret.Replace("whsec_", ""));
    using var hmac = new HMACSHA256(key);
    var computed = Convert.ToBase64String(hmac.ComputeHash(Encoding.UTF8.GetBytes(payload)));

    // svix-signature may contain multiple v1,<sig> values — check if any match
    return svixSignature.Split(' ')
        .Where(s => s.StartsWith("v1,"))
        .Any(s => s[3..] == computed);
}
```

### Rate Limiting on AI Endpoints

Currently all endpoints share the global 120 req/min limiter. AI endpoints (`/api/ai/suggest-tags`, `/api/ai/ask`) should have a stricter policy (10 req/min) to protect Groq API costs:

```csharp
// Program.cs — add second limiter
opt.AddFixedWindowLimiter("ai", limiter =>
{
    limiter.Window = TimeSpan.FromMinutes(1);
    limiter.PermitLimit = 10;
});

// AiController — apply per route
[HttpPost("suggest-tags")]
[EnableRateLimiting("ai")]
public async Task<IActionResult> SuggestTags(...)
```

---

## Phase 3 — Frontend ↔ Backend Wiring ✅ COMPLETE (core)

Core wiring done. `http.ts` base client reads `byteai_auth_token` from localStorage and attaches Bearer header. All API functions call real endpoints with mock-data fallback on error.

### Remaining frontend wiring gaps

| Feature | Status | Notes |
|---|---|---|
| Auth token flow | Complete | Supabase auth via use-auth.ts hook |
| `getFeed` | ✅ Wired | Falls back to mockPosts if backend down |
| `getPost` | ✅ Wired | Falls back to mock |
| `createPost` | ✅ Wired | Calls `POST /api/bytes` |
| `search` | ✅ Wired | Calls `GET /api/search?q=...` |
| `likePost / unlikePost` | ✅ Wired | |
| `bookmarkPost` | ✅ Wired | |
| `getProfile / updateProfile` | ✅ Wired | |
| `followUser / unfollowUser` | ✅ Wired | |
| `addComment` | ✅ Wired | |
| Notifications | Not wired | No UI screen yet |
| `byteToPost` author enrichment | Partial | Author fields hardcoded as defaults — need author join in backend `ByteResponse` |

### Auth Status


2. Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` to `UI/.env.local`

4. Add `Supabase:JwtSecret` to `appsettings.Development.json` for JWT validation

---

## Phase 4 — New AI Features (UI)

### AI Chat — Ask AI Button
Backend endpoint `POST /api/ai/ask` exists. No UI yet. Options:
- Floating chat button on every authenticated page
- Per-byte "Ask AI" panel on the detail screen
- Dedicated `/ask` page

### Tag Suggestion in Compose
Backend endpoint `POST /api/ai/suggest-tags` exists. Compose screen has no wiring to it yet. Should trigger on title/body input and display suggested tags the user can click to add.

---

## Phase 5 — Observability

### OpenTelemetry Setup (Not yet added to Program.cs)

```csharp
// Add to Program.cs
builder.Services.AddOpenTelemetry()
    .WithTracing(tracing => tracing
        .AddAspNetCoreInstrumentation()
        .AddHttpClientInstrumentation()
        .AddEntityFrameworkCoreInstrumentation()
        .AddOtlpExporter(o => o.Endpoint = new Uri(builder.Configuration["Otlp:Endpoint"]!)))
    .WithMetrics(metrics => metrics
        .AddAspNetCoreInstrumentation()
        .AddRuntimeInstrumentation()
        .AddPrometheusExporter());

// NuGet packages needed:
// OpenTelemetry.Extensions.Hosting
// OpenTelemetry.Instrumentation.AspNetCore
// OpenTelemetry.Instrumentation.Http
// OpenTelemetry.Instrumentation.EntityFrameworkCore
// OpenTelemetry.Exporter.Prometheus.AspNetCore
```

---

## Phase 6 — Infrastructure & Deployment

### Dockerfile

No `Dockerfile` exists yet. Create at `Service/Dockerfile`:

```dockerfile
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY ByteAI.sln .
COPY ByteAI.Api/ ByteAI.Api/
COPY ByteAI.Core/ ByteAI.Core/
RUN dotnet publish ByteAI.Api/ByteAI.Api.csproj -c Release -o /app

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app
COPY --from=build /app .
EXPOSE 8080
ENTRYPOINT ["dotnet", "ByteAI.Api.dll"]
```

### Container Registry

**Dev / MVP: GitHub Container Registry (ghcr.io)** — free
```bash
# Build and push
docker build -t ghcr.io/<github-username>/byteai-api:latest -f Service/Dockerfile Service/
echo $GITHUB_TOKEN | docker login ghcr.io -u <github-username> --password-stdin
docker push ghcr.io/<github-username>/byteai-api:latest
```
- Free up to 500 MB/month for private repos (then $0.008/GB)
- Integrates directly with GitHub Actions — no extra credentials needed in CI
- Azure Container Apps can pull from it using a registry secret

**Production: Azure Container Registry (ACR)** — ~$5/month (Basic tier)
- Native Azure integration — Container App uses managed identity to pull, no credentials stored
- Migrate from ghcr.io → ACR when moving to production by updating the image reference in Bicep

**Wiring ghcr.io to Azure Container App (until ACR is set up):**
```bicep
// In Container App Bicep resource
registries: [
  {
    server: 'ghcr.io'
    username: ghcrUsername  // GitHub username
    passwordSecretRef: 'ghcr-token'  // GitHub PAT with read:packages scope
  }
]
```

### Bicep IaC

`infra/bicep/` folder exists but is empty. Needs:
- `main.bicep` — Azure Container App, Key Vault, PostgreSQL Flexible Server, Redis Cache
- Add ACR module when moving off ghcr.io
- `modules/` — individual resource modules

### GitHub Actions CI/CD

No `.github/workflows/` yet. Needs:
- `ci.yml` — on push: build + test
- `cd.yml` — on main merge: build Docker image → push to ghcr.io → deploy to Container App

---

## Future Features — Web Scraping

### Use Case 1 — Nightly Content Discovery
Scrape tech content from Dev.to, Hacker News, GitHub Trending → summarize via Groq into byte format → insert into DB as system-authored bytes surfaced in a "Trending from the web" feed section.

**How:**
- `ScraperService` in `ByteAI.Core/Services/` using `AngleSharp` (HTML) + Dev.to API + HN Algolia API (no scraping needed for these two)
- `IHostedService` background job runs nightly (or use Hangfire for scheduling UI)
- MediatR event `ExternalByteDiscovered` → Groq summarizes → ONNX embeds → insert to `bytes` table with `source_url` and `author_id = system`
- NuGet: `AngleSharp` for HTML parsing, `PuppeteerSharp` only for JS-rendered pages

**New DB column needed:** `source_url TEXT` on `bytes` table to track origin and avoid duplicates.

**Sources to scrape:**
| Source | Method |
|--------|--------|
| Dev.to | Free API — `GET /api/articles?tag={stack}&per_page=30` |
| Hacker News | Algolia API — `hn.algolia.com/api/v1/search?tags={stack}` |
| GitHub Trending | HTML scrape via AngleSharp |
| Medium tech tags | HTML scrape (JS-rendered — needs PuppeteerSharp) |

---

### Use Case 2 — "Share from URL" in Compose
User pastes any URL in the compose screen → backend scrapes the page → Groq summarizes into byte format → pre-fills title, body, tags in compose form.

**How:**
- New endpoint: `POST /api/ai/summarize-url` — accepts `{ url: string }`
- Backend: fetch HTML via `HttpClient`, parse with `AngleSharp`, extract main content, send to Groq with summarize prompt
- Frontend: "Paste URL" button in compose screen → calls endpoint → auto-fills form fields
- Extend `POST /api/ai/suggest-tags` to also accept a URL (scrape + tag in one call)

**Security note:** Validate URL is HTTP/HTTPS, block private IP ranges (SSRF risk) before fetching.

---

## Existing Tests

`ByteAI.Api.Tests` project exists but has no test files yet — it's an empty shell. Priority test files to create:

1. `Commands/Bytes/CreateByteCommandHandlerTests.cs`
2. `Commands/Feed/GetFeedQueryHandlerTests.cs`
3. `Services/SearchServiceTests.cs`
4. `Integration/BytesEndpointTests.cs`

See `testing.md` for patterns and fixtures.

---

## Known Tech Debt

| Item | File | Notes |
|---|---|---|
| Stub ONNX tokenizer | `OnnxEmbedder.cs` | Replace with `FastBertTokenizer` |
| No svix validation | `WebhooksController.cs` | Security risk — implement before prod |
| `AsNoTracking()` missing in some queries | `FeedService.cs`, `SearchService.cs` | Add for read-only queries |
| Trending score computed in-memory | `FeedService.cs` | Move to SQL window function for scale |
| RRF merges all results before paging | `SearchService.cs` | Limit both result sets to 2×limit before merge |
| No `Retry-After` header on 429 | `Program.cs` | Required by rate limiter best practice |


## AI Agent
See if possible to include some sort of AI agent within this application