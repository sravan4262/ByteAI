# CLAUDE.md — ByteAI Master Instructions

## 🚀 Project Vision & Stack
**ByteAI** is a tech-focused short-content social media platform (Inshorts for Tech).

> **Architecture phase: Monolith-first.** Single ASP.NET Core 8 API. Microservices extraction deferred.

- **Frontend:** Next.js 16, React 19, TypeScript, Tailwind v4, shadcn/ui — hosted on Azure Static Web Apps.
- **Auth:** Supabase Auth (Magic Link · Google · Phone OTP) — issues JWTs (HS256) validated directly in the monolith.
- **Backend:** Single ASP.NET Core 8 Web API (`Service/ByteAI.Api`) — Minimal APIs, vertical slice by feature.
- **In-process events:** MediatR — replaces RabbitMQ for now (e.g. ByteCreated → embed → tag).
- **Data:** PostgreSQL + pgvector (Azure Flexible Server) · Redis for feed cache (optional MVP).
- **AI:** ONNX Runtime (all-MiniLM-L6-v2, 384-dim, in-process singleton) · Groq API (Llama 3.3 70B, NLP/RAG).
- **Observability:** OpenTelemetry + Serilog (structured logs) · Prometheus + Grafana.
- **Infrastructure:** Single Azure Container App, Bicep IaC, GitHub Actions CI/CD.

> **Future migration path:** Features are vertical slices — each can be extracted to its own service by moving its `Features/<Domain>/` folder and its DB tables. No rewrite needed.

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
| Backend | `backend/dotnet-patterns.md`, `backend/db/postgres.md`, `backend/testing.md`, `backend/security.md`, `backend/todo.md` |
| Frontend | `frontend/frontend-patterns.md`, `frontend/design.md`, `frontend/testing.md` |
| Quality | `quality/coding-standards.md`, `quality/verification-loop.md`, `quality/benchmark.md`, `frontend/e2e-testing.md` |
| Deployment | `deployment/docker-patterns.md`, `deployment/github-ops.md`, `deployment/git-workflow.md`, `deployment/deployment-patterns.md` |
| Social/SEO | `social/social-graph-ranker.md`, `social/seo.md`, `social/x-api.md` |
| Product | `product/product-lens.md`, `product/product-capability.md` |
