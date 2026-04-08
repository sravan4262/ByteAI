# CLAUDE.md — ByteAI Master Instructions

## 🚀 Project Vision & Stack
**ByteAI** is a tech-focused short-content social media platform (Inshorts for Tech).
- **Backend:** .NET 8 (C# 12), Clean Architecture, EF Core, PostgreSQL.
- **Frontend:** React (Vite), PWA, High-Density UI.
- **Infrastructure:** Azure, Docker, GitHub Actions.

## 🧠 Core Philosophy (The "Soul")
Always adhere to the 5 core principles defined in `.claude/guides/soul.md`:
1. **Agent-First:** Treat the AI as a Senior Engineer, not a chatbot.
2. **Plan Before Execute:** No code changes without a confirmed plan.
3. **TDD:** Write failing tests before implementation.
4. **Security-First:** Identify trust boundaries in every feature.
5. **Immutability:** Favor immutable data structures and pure functions.

## 🛠️ Operational Workflow

### 1. Planning Phase
Before starting any feature, trigger the planning sequence:
- **Command:** Use `/plan` (logic in `.claude/planning/plan-command.md`).
- **Agents:** Consult `.claude/planning/architect-agent.md` for system design and `.claude/planning/planner-agent.md` for task breakdown.
- **Validation:** Use `.claude/product/product-lens.md` to score feature viability and ICE impact.

### 2. Implementation Phase
- **Database Patterns:** Strictly follow **`.claude/skills/backend/postgres-patterns.md`** for schema design, indexing, and RLS.
- **Workflow:** Use `/feature-dev` (logic in `.claude/planning/feature-dev-command.md`).
- **Backend Standards:** Strictly follow `.claude/backend/dotnet-patterns.md` (Primary Constructors, Minimal APIs).
- **Frontend Standards:** Follow `.claude/frontend/frontend-patterns.md` (Virtualization for feeds, Zod forms).
- **General Rules:** Adhere to `.claude/quality-security/coding-standards.md` (e.g., 50-line method limit).

### 3. Verification & Quality Phase
- **Gatekeeper:** Every task must pass the `.claude/quality-security/verification-loop.md`.
- **Testing:** Use `.claude/quality-security/csharp-testing.md` (xUnit/Moq) for backend and Playwright for E2E.
- **Security:** Auto-invoke `.claude/quality-security/security-reviewer-agent.md` for Auth or API changes.
- **Database Audit:** For schema or query changes, invoke `.claude/agents/database-reviewer.md` to verify **PostgreSQL** performance and migration safety.
- **Review:** Run `/code-review` (logic in `.claude/commands/code-review-command.md`).

## 📉 Token & Context Optimization
- **Efficiency:** Use `.claude/token-optimization/search-first.md` before coding to avoid reinventing wheels.
- **Budgeting:** Refer to `.claude/token-optimization/token-budget-advisor.md` for response depth.
- **Routing:** Route boilerplate to Haiku and complex logic to Sonnet per `.claude/token-optimization/agentic-engineering.md`.

## 📡 Domain-Specific Logic
- **Feed Algorithm:** Refer to `.claude/social-seo/social-graph-ranker.md` for weighted ranking.
- **SEO:** Consult `.claude/social-seo/seo-specialist-agent.md` for tech-content discoverability.
- **Integrations:** Reference `.claude/social-seo/x-api.md` for cross-platform posting logic.

## ⌨️ Common Commands
- `/plan`: Generate implementation plan.
- `/feature-dev`: Start guided 7-phase development.
- `/tdd`: Enter Red-Green-Refactor loop.
- `/code-review`: Perform local or PR audit.
- `/optimize`: Trigger `.claude/planning/prompt-optimizer.md`.

## 📂 Memory Management
- **Persistence:** Update `.claude/planning/codebase-onboarding.md` or a `PROGRESS.md` after major milestones.
- **Mode Switching:** Refer to `.claude/contexts/` (`dev.md`, `research.md`, `review.md`) to adjust behavior.