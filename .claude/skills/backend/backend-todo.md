---
name: backend-todo
description: ByteAI backend remaining work — what's NOT yet implemented, in priority order. Reference this before starting any new backend feature to avoid duplication.
---

# Backend TODO — Remaining Work

Status as of 2026-04-09. Backend code compiles and has 0 errors. The items below are missing, incomplete, or not yet wired up.

---

## Phase 4 — Config & Local Dev (Blocker for any real testing)

### appsettings.json / appsettings.Development.json

`appsettings.json` exists but connection strings and secrets are placeholders. These must be filled before running the app:

```json
{
  "ConnectionStrings": {
    "Postgres": "Host=localhost;Port=5432;Database=byteai;Username=postgres;Password=<dev-pw>",
    "Redis": ""
  },
  "Clerk": {
    "Authority": "https://<your-clerk-instance>.clerk.accounts.dev",
    "WebhookSecret": "<svix-signing-secret>"
  },
  "Ai": {
    "OnnxModelPath": "models/all-MiniLM-L6-v2.onnx",
    "GroqApiKey": "<groq-api-key>"
  },
  "Cors": {
    "AllowedOrigin": "http://localhost:3000"
  }
}
```

- `appsettings.Development.json` should NOT be committed (add to `.gitignore`)
- Production secrets → Azure Key Vault / GitHub Actions Secrets

### ONNX Model File

- `OnnxEmbedder` gracefully returns zero-vectors if model file is absent (logged as warning)
- Download `all-MiniLM-L6-v2.onnx` from HuggingFace and place at the path in `Ai:OnnxModelPath`
- Tokenizer is currently a stub (hash-mod) — replace with `BertTokenizer` from `FastBertTokenizer` NuGet when vocab file is available

### docker-compose.yml (Local Dev)

Missing. Needed to spin up Postgres + pgvector + Redis locally:

```yaml
# docker-compose.yml (to be created at repo root or Service/)
services:
  postgres:
    image: pgvector/pgvector:pg16
    environment:
      POSTGRES_DB: byteai
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: devpassword
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

volumes:
  pgdata:
```

### Supabase Local Setup

Tables exist as SQL files in `supabase/tables/` but haven't been applied to local DB:

```bash
# One-time setup
supabase init
supabase start
supabase db push    # applies all supabase/tables/*.sql
```

---

## Phase 5 — Security Hardening

### Clerk Webhook svix Signature Validation

`WebhooksController.cs` has a TODO for svix signature validation. This MUST be implemented before production — without it, anyone can POST fake events to `/webhooks/clerk`.

```csharp
// WebhooksController.cs — replace TODO with:
private bool ValidateSvixSignature(HttpRequest request, string body)
{
    var svixId = request.Headers["svix-id"].ToString();
    var svixTimestamp = request.Headers["svix-timestamp"].ToString();
    var svixSignature = request.Headers["svix-signature"].ToString();
    var webhookSecret = _config["Clerk:WebhookSecret"] ?? string.Empty;

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

## Phase 6 — Frontend ↔ Backend Wiring

### UI `lib/api/` → Real HTTP Calls

The frontend `UI/lib/api/` folder was restructured with organized modules, but many calls still hit mock data or are incomplete stubs. Wire up each module to the real backend:

| Module | Real Endpoint |
|---|---|
| `bytes.ts` | `GET /api/bytes`, `POST /api/bytes`, `GET /api/bytes/{id}` |
| `feed.ts` | `GET /api/feed?filter=for_you\|following\|trending` |
| `search.ts` | `GET /api/search?q=...&limit=20` |
| `notifications.ts` | `GET /api/notifications`, `PUT /api/notifications/{id}/read` |
| `users.ts` | `GET /api/users/{id}`, `PUT /api/users/me` |
| `auth.ts` | Clerk client SDK (not direct API calls) |

### Clerk Auth in Frontend

Frontend uses Clerk for auth. Backend validates Clerk JWTs. The connection:
1. User signs in via Clerk → gets JWT
2. Next.js passes JWT as `Authorization: Bearer <token>` header on every API call
3. `AddClerkJwt()` in `Program.cs` validates the JWT against Clerk's JWKS endpoint

Ensure `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` are in the frontend `.env.local`.

---

## Phase 7 — Observability

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

## Phase 8 — Infrastructure & Deployment

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

### Bicep IaC

`infra/` folder exists but is empty. Needs:
- `main.bicep` — Azure Container App, ACR, Key Vault, PostgreSQL Flexible Server, Redis Cache
- `modules/` — individual resource modules

### GitHub Actions CI/CD

No `.github/workflows/` yet. Needs:
- `ci.yml` — on push: build + test
- `cd.yml` — on main merge: build Docker image → push to ACR → deploy to Container App

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
