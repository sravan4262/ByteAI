# CLAUDE.md — ByteAI Master Instructions

## 🚀 Project Vision & Stack
**ByteAI** is a tech-focused short-content social media platform (Inshorts for Tech).
- **Frontend:** Next.js 16, React 19, TypeScript, Tailwind v4, shadcn/ui — hosted on Azure Static Web Apps.
- **Auth:** Clerk (Magic Link · Google · Facebook · Phone OTP) — issues JWTs.
- **API Gateway:** YARP Reverse Proxy on ASP.NET Core 8 — JWT validation, rate limiting, routing.
- **Microservices (Azure Container Apps, ASP.NET Core 8):** User Service · Bytes Service · Feed Service · Search Service · AI Service · Notification Service.
- **Data:** PostgreSQL + pgvector (Azure Flexible) · MongoDB/Cosmos DB · Redis (ACI).
- **Messaging:** RabbitMQ via CloudAMQP (MassTransit) — event-driven between services.
- **AI:** ONNX Runtime (all-MiniLM-L6-v2, in-process, 384-dim embeddings) · Groq API (Llama 3.3 70B, NLP/RAG).
- **Observability:** OpenTelemetry · Jaeger · Prometheus + Grafana.
- **Infrastructure:** Azure Container Apps, Bicep IaC, GitHub Actions CI/CD.

## 🧠 Core Philosophy (The "Soul")
Always adhere to the 5 core principles defined in `.claude/guides/soul.md`:
1. **Agent-First:** Route work to the right specialist agent proactively.
2. **Plan Before Execute:** No code changes without a confirmed plan.
3. **TDD:** Write failing tests before implementation.
4. **Security-First:** Identify trust boundaries in every feature.
5. **Immutability:** Favor immutable data structures and pure functions.

## 🛠️ Operational Workflow

### 1. Planning Phase
Before starting any feature, trigger the planning sequence:
- **Command:** Use `/plan` (logic in `.claude/commands/plan-command.md`).
- **Agents:** Consult `.claude/agents/architect-agent.md` for system design and `.claude/agents/planner-agent.md` for task breakdown.
- **Validation:** Use `.claude/skills/product/product-lens.md` to score feature viability and ICE impact.

### 2. Implementation Phase
- **Database Patterns:** Strictly follow `.claude/skills/backend/postgres-patterns.md` for schema design, indexing, and RLS.
- **Workflow:** Use `/feature-dev` (logic in `.claude/commands/feature-dev-command.md`).
- **Backend Standards:** Strictly follow `.claude/skills/backend/dotnet-patterns.md` (Primary Constructors, Minimal APIs).
- **Frontend Standards:** Follow `.claude/skills/frontend/frontend-patterns.md` (Virtualization for feeds, Zod forms).
- **General Rules:** Adhere to `.claude/skills/quality/coding-standards.md` (e.g., 50-line method limit).

### 3. Verification & Quality Phase
- **Gatekeeper:** Every task must pass `.claude/skills/quality/verification-loop.md`.
- **Testing:** Use `.claude/skills/quality/csharp-testing.md` (xUnit/Moq) for backend and `.claude/skills/quality/e2e-testing.md` for Playwright E2E.
- **Security:** Auto-invoke `.claude/agents/security-reviewer-agent.md` for Auth or API changes.
- **Database Audit:** For schema or query changes, invoke `.claude/agents/database-reviewer.md` to verify PostgreSQL performance and migration safety.
- **Review:** Run `/code-review` (logic in `.claude/commands/code-review-command.md`).

## 📉 Token & Context Optimization
- **Efficiency:** Use `.claude/guides/optimization/search-first.md` before coding to avoid reinventing wheels.
- **Budgeting:** Refer to `.claude/guides/optimization/token-budget-advisor.md` for response depth.
- **Routing:** Route boilerplate to Haiku and complex logic to Sonnet per `.claude/guides/optimization/agentic-engineering.md`.

## 📡 Domain-Specific Logic
- **Feed Algorithm:** Refer to `.claude/skills/social/social-graph-ranker.md` for weighted ranking.
- **SEO:** Consult `.claude/agents/seo-specialist-agent.md` for tech-content discoverability.
- **Integrations:** Reference `.claude/skills/social/x-api.md` for cross-platform posting logic.

## ⌨️ Common Commands
- `/plan`: Generate implementation plan.
- `/feature-dev`: Start guided 7-phase development.
- `/tdd`: Enter Red-Green-Refactor loop.
- `/code-review`: Perform local or PR audit.
- `/optimize`: Trigger `.claude/commands/prompt-optimizer.md`.
- `/verify`: Run `.claude/skills/quality/verification-loop.md`.

## 📂 Memory Management
- **Persistence:** Update `.claude/memory/codebase-onboarding.md` or `.claude/memory/PROGRESS.md` after major milestones.
- **Mode Switching:** Refer to `.claude/memory/` (`dev.md`, `research.md`, `review.md`) to adjust behavior.

## 🗂️ File Map (Canonical Paths)

### Agents (`.claude/agents/`)
| Agent | File | Trigger |
|-------|------|---------|
| Architect | `architect-agent.md` | System design, new features |
| Planner | `planner-agent.md` | Task breakdown, complex changes |
| Code Reviewer | `code-reviewer-agent.md` | After every code change |
| Security Reviewer | `security-reviewer-agent.md` | Auth, API, user-input code |
| Database Reviewer | `database-reviewer.md` | SQL, schema, migrations |
| Performance Optimizer | `performance-optimizer.md` | Bottlenecks, bundle size |
| SEO Specialist | `seo-specialist-agent.md` | Discoverability, meta, structured data |

### Commands (`.claude/commands/`)
| Command | File |
|---------|------|
| `/plan` | `plan.md` |
| `/feature-dev` | `feature-dev.md` |
| `/tdd` | `tdd.md` |
| `/code-review` | `code-review.md` |
| `/optimize` | `prompt-optimizer.md` |

### Skills (`.claude/skills/`)
| Domain | Files |
|--------|-------|
| Backend | `backend/dotnet-patterns.md`, `backend/postgres-patterns.md`, `backend/api-design.md`, `backend/database-migrations.md`, `backend/backend-patterns.md` |
| Frontend | `frontend/frontend-patterns.md`, `frontend/design-system.md`, `frontend/frontend-design.md`, `frontend/nextjs-turbopack.md` |
| Quality | `quality/coding-standards.md`, `quality/tdd-workflow.md`, `quality/verification-loop.md`, `quality/csharp-testing.md`, `quality/e2e-testing.md`, `quality/security-review.md`, `quality/benchmark.md` |
| Deployment | `deployment/docker-patterns.md`, `deployment/github-ops.md`, `deployment/git-workflow.md`, `deployment/deployment-patterns.md` |
| Social/SEO | `social/social-graph-ranker.md`, `social/seo.md`, `social/x-api.md` |
| Product | `product/product-lens.md`, `product/product-capability.md` |
