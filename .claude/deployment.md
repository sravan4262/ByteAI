# ByteAI Deployment Plan — Progress Tracker

## Status Legend
- `[ ]` Not started
- `[~]` In progress
- `[x]` Done

---

## Phase 2 — Health Check Enhancements (ByteAI.Api)
_Independent. Can start immediately._

- [x] Add NuGet packages: `AspNetCore.HealthChecks.Npgsql`, `.Redis`, `.Uris`
- [x] Create `Service/ByteAI.Api/HealthChecks/OnnxModelHealthCheck.cs`
- [x] Create `Service/ByteAI.Api/HealthChecks/HealthJson.cs` (JSON response writer)
- [x] Add `IsModelLoaded` property to `Service/ByteAI.Core/Infrastructure/AI/OnnxEmbedder.cs`
- [x] Replace inline `/health` in `Program.cs` with full health checks middleware
- [x] Register `/health/live` (liveness — no deps) and `/health/ready` (readiness — DB + Redis + ONNX)
- [x] Keep `GET /health` as redirect alias to `/health/ready`

---

## Phase 4 — Terraform Infrastructure
_Independent. Can start immediately in parallel with Phase 2._

- [x] Create `infra/terraform/main.tf` — provider, resource group, remote state backend (Azure Blob)
- [x] Create `infra/terraform/variables.tf`
- [x] Create `infra/terraform/outputs.tf` — SWA hostname, SWA API key, gateway FQDN, API FQDN
- [x] Create `infra/terraform/container_env.tf` — Log Analytics workspace + Container Apps Environment
- [x] Create `infra/terraform/container_apps.tf` — `byteai-api` + `byteai-gateway` Container Apps (`revision_mode = "Multiple"`)
- [x] Create `infra/terraform/static_web_app.tf` — Azure Static Web Apps (Standard SKU)
- [x] Create `infra/terraform/custom_domain.tf` — custom domain + managed cert binding on SWA + gateway
- [x] Create `infra/terraform/terraform.tfvars.example`
- [x] Add Terraform entries to `.gitignore` (tfvars, .terraform/, state files)

---

## Phase 3 — Dockerfile Fixes
_Depends on understanding project structure (done). Gateway project must exist before Dockerfile.gateway._

- [x] Create `Service/Dockerfile.api` (replaces ByteAI.Api/Dockerfile), fix build context to include `ByteAI.Core/`
- [x] Add ONNX model download step in `Dockerfile.api` (pinned to HuggingFace commit `e9b6763`)
- [x] Create `Service/Dockerfile.gateway`
- [x] Create `UI/Dockerfile` (Next.js standalone)
- [x] Enable `output: 'standalone'` in `UI/next.config.mjs`

---

## Phase 1 — YARP Gateway Project
_Depends on Phase 3 Dockerfile structure._

- [x] Create `Service/ByteAI.Gateway/ByteAI.Gateway.csproj` with `Yarp.ReverseProxy` + `Serilog.AspNetCore`
- [x] Create `Service/ByteAI.Gateway/Program.cs` — YARP configured from code (upstream URL from `ApiUpstreamUrl` config)
- [x] Create `Service/ByteAI.Gateway/appsettings.json` — defaults for `ApiUpstreamUrl` and `ApiKeys`
- [x] Create `Service/ByteAI.Gateway/Middleware/ApiKeyMiddleware.cs` — validate `X-Api-Key`; skip `/health/*`; allow Clerk JWT passthrough
- [x] Create `Service/ByteAI.Gateway/HealthChecks/UpstreamHealthCheck.cs` — polls `byteai-api /health/ready`
- [x] Register `/health/live` and `/health/ready` on gateway
- [x] Add `ByteAI.Gateway` to `Service/ByteAI.sln`
- [x] Create `Service/Dockerfile.gateway`

---

## Phase 5 — GitHub Actions CI/CD Workflows
_Depends on Phases 3 + 4 (working images + live Azure resources)._

- [x] Create `.github/workflows/ci.yml` — PR checks: backend `dotnet test` + frontend `pnpm test` in parallel
- [x] Create `.github/workflows/cd-backend.yml` — blue-green deploy for API + Gateway Container Apps
  - [x] Build & push `ghcr.io/.../byteai-api:<sha>` and `ghcr.io/.../byteai-gateway:<sha>` to GHCR
  - [x] Detect active revision label (blue/green) via `az containerapp revision list`
  - [x] Deploy new revision to inactive label (0% traffic)
  - [x] Health gate: poll API `runningState` every 10s up to 3 min
  - [x] Label inactive Gateway revision → HTTP health check `/health/ready`
  - [x] Swap: set inactive to 100% traffic on both API and Gateway
- [x] Create `.github/workflows/cd-frontend.yml` — SWA blue-green deploy
  - [x] Build & push `ghcr.io/.../byteai-ui:<sha>` to GHCR
  - [x] Deploy to SWA staging environment via `Azure/static-web-apps-deploy@v1`
  - [x] Health gate: curl staging URL
  - [x] Deploy to SWA production; close staging slot
- [x] Create `.github/workflows/supabase.yml` — DB schema + migrations + lookup seeds
- [x] Create `.github/workflows/terraform.yml` — manual `workflow_dispatch` with plan/apply choice

---

## Phase 6 — Secrets & OIDC Setup
_Depends on Phase 4 (need Azure resources to exist)._

- [ ] Set up Azure OIDC (Workload Identity Federation) — `az ad app create` + federated credential for GitHub repo
- [ ] Add GitHub secrets: `AZURE_CLIENT_ID`, `AZURE_TENANT_ID`, `AZURE_SUBSCRIPTION_ID`
- [ ] Add GitHub secrets: `SWA_DEPLOY_TOKEN` (from `terraform output swa_api_key`)
- [ ] Add GitHub secrets: `SUPABASE_DB_URL`, `SUPABASE_SERVICE_ROLE_KEY`
- [ ] Add Container App secrets via Terraform vars: `CLERK_AUTHORITY`, `GROQ_API_KEY`, `REDIS_URL`, `DATABASE_URL`, `API_KEYS`
- [ ] Add GitHub secrets: `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `NEXT_PUBLIC_API_URL`

---

## Phase 7 — Custom Domain
_Depends on Phase 4 (Terraform) + Phase 6 (secrets). Do after DNS is ready._

- [ ] Buy domain from registrar
- [ ] Run `terraform apply` with `custom_domain` variable set
- [ ] Add DNS CNAME records at registrar:
  - `@`   → SWA default hostname (frontend)
  - `www` → SWA default hostname (frontend)
  - `api` → Gateway Container App FQDN
- [ ] Verify Azure auto-provisions TLS certificate (`cname-delegation`)

---

## Supabase Migrations Setup
_One-time setup. Do alongside Phase 5._

- [x] Establish `supabase/migrations/` naming convention: `YYYYMMDDHHMMSS_description.sql`
- [ ] Create first migration baseline: `supabase/migrations/20260415000000_initial_schema.sql` — snapshot of current `tables/` DDL (needed before deploying schema changes incrementally)

---

## Notes

- **ONNX model** (`nomic-embed-text-v1.5.onnx`) is gitignored. Downloaded during Docker build from HuggingFace, pinned to commit `e9b6763023c676ca8431644204f50c2b100d9aab`. Zero-vector fallback is active if download fails.
- **GHCR auth**: Uses `GITHUB_TOKEN` automatically — no extra secret needed for image push.
- **Terraform state**: Stored in Azure Blob Storage (`byteaitfstate` storage account). Created manually once before `terraform init`.
- **SWA blue-green**: Staging environment = green slot. Production = blue. Swap is a single `az staticwebapp environment swap` call.
- **Container Apps blue-green**: `revision_mode = "Multiple"` with labeled revisions (`blue`/`green`). Traffic weights controlled by `az containerapp ingress traffic set`.
