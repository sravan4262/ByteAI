# Claude Code Reference — ByteAI

Curated from [everything-claude-code](https://github.com/disler/everything-claude-code). All files here are directly relevant to building ByteAI (social media platform).

---

## guides/
Start here. Core philosophy and advanced patterns.

| File | What It Is |
|------|------------|
| [shortform-guide.md](guides/shortform-guide.md) | Quick reference: skills, commands, hooks, MCPs, keyboard shortcuts |
| [longform-guide.md](guides/longform-guide.md) | Advanced: token optimization, model routing, session memory, parallel worktrees |
| [security-guide.md](guides/security-guide.md) | Agent security: prompt injection, sandboxing, approval boundaries, kill switches |
| [soul.md](guides/soul.md) | 5 core principles: Agent-First, TDD, Security-First, Immutability, Plan Before Execute |

---

## token-optimization/
Keep context lean and costs low during long sessions.

| File | What It Is |
|------|------------|
| [token-budget-advisor.md](token-optimization/token-budget-advisor.md) | Offers 4 response depth levels (25/50/75/100%) before answering |
| [context-budget.md](token-optimization/context-budget.md) | Audits your setup and ranks top 3 token-wasting components |
| [agentic-engineering.md](token-optimization/agentic-engineering.md) | Routes tasks to right model: Haiku (boilerplate), Sonnet (impl), Opus (architecture) |
| [search-first.md](token-optimization/search-first.md) | Search npm/GitHub before writing code — avoid reinventing wheels |
| [ai-first-engineering.md](token-optimization/ai-first-engineering.md) | Operating model for AI-generated code: evals, review behavior, test bar |

---

## product/
Validate what to build before building it.

| File | What It Is |
|------|------------|
| [product-lens.md](product/product-lens.md) | 7 hard diagnostic questions, ICE scoring, user journey audit |
| [product-capability.md](product/product-capability.md) | Translates PRD → implementation contracts with trust boundaries and rollout strategy |

---

## planning/
Architecture and feature planning before touching code.

| File | What It Is |
|------|------------|
| [planner-agent.md](planning/planner-agent.md) | Phased plans with exact file paths, risks, and success criteria |
| [architect-agent.md](planning/architect-agent.md) | System design, trade-offs, CQRS/event sourcing, data models, API contracts |
| [plan-command.md](planning/plan-command.md) | `/plan` — creates plan and waits for your confirmation before coding |
| [feature-dev-command.md](planning/feature-dev-command.md) | `/feature-dev` — 7-phase guided workflow from discovery to review |
| [prompt-optimizer.md](planning/prompt-optimizer.md) | Rewrites your prompts to be more effective; detects stack/intent/scope |
| [codebase-onboarding.md](planning/codebase-onboarding.md) | Auto-generates CLAUDE.md for any codebase; useful when handing context to Claude |

---

## frontend/
React, Next.js, design systems, feeds, and UI.

| File | What It Is |
|------|------------|
| [frontend-patterns.md](frontend/frontend-patterns.md) | React composition, virtualization (feeds), React Query, Zod forms, memoization |
| [frontend-design.md](frontend/frontend-design.md) | Typography, motion, visual systems — for UIs that feel designed, not generic |
| [design-system.md](frontend/design-system.md) | Generates cohesive design tokens (colors, spacing, typography) from your codebase |
| [nextjs-turbopack.md](frontend/nextjs-turbopack.md) | Next.js 16+ faster dev builds, bundle analyzer, file-system caching |

---

## backend/
APIs, feeds, notifications, database.

| File | What It Is |
|------|------------|
| [dotnet-patterns.md](backend/dotnet-patterns.md) | ASP.NET Core 8 patterns: minimal APIs, middleware, DI, EF Core, MassTransit — directly matches your stack |
| [backend-patterns.md](backend/backend-patterns.md) | Node.js/Express reference — use for concepts (repository, caching, rate limiting); translate to C# |
| [api-design.md](backend/api-design.md) | Resource naming, pagination, error responses, versioning — feeds live or die here |
| [postgres-patterns.md](backend/postgres-patterns.md) | Index types, Row Level Security (user privacy), connection pooling |
| [database-migrations.md](backend/database-migrations.md) | Zero-downtime schema changes, backfill patterns, rollback strategies |

---

## quality-security/
Tests, verification, and security enforcement.

| File | What It Is |
|------|------------|
| [tdd-workflow.md](quality-security/tdd-workflow.md) | Red-Green-Refactor, 80%+ coverage, tests before code |
| [csharp-testing.md](quality-security/csharp-testing.md) | xUnit, Moq, FluentAssertions, integration tests with WebApplicationFactory — matches your ASP.NET Core 8 stack |
| [e2e-testing.md](quality-security/e2e-testing.md) | Playwright: Page Object Model, auth fixtures, CI integration, flaky test strategies |
| [verification-loop.md](quality-security/verification-loop.md) | 6-phase gate before every PR: build → type-check → lint → test → security → diff |
| [security-review.md](quality-security/security-review.md) | OWASP Top 10, auth patterns, input validation, secrets management |
| [coding-standards.md](quality-security/coding-standards.md) | Naming, immutability, 50-line limit, 4-level nesting limit |
| [benchmark.md](quality-security/benchmark.md) | Core Web Vitals targets, API p95 latency, bundle size — git-tracked baselines |
| [security-reviewer-agent.md](quality-security/security-reviewer-agent.md) | Auto-invoked after writing auth, uploads, or API endpoints |
| [code-reviewer-agent.md](quality-security/code-reviewer-agent.md) | Pre-PR review by severity: CRITICAL → HIGH → MEDIUM → LOW |
| [code-review-command.md](quality-security/code-review-command.md) | `/code-review` — local diff or GitHub PR review |
| [tdd-command.md](quality-security/tdd-command.md) | `/tdd` — TDD cycle entry point |

---

## social-seo/
Social graph, discoverability, and platform integrations.

| File | What It Is |
|------|------------|
| [social-graph-ranker.md](social-seo/social-graph-ranker.md) | Weighted graph ranking for connections, "people you may know", bridge scoring |
| [seo.md](social-seo/seo.md) | Technical SEO, Core Web Vitals, structured data, sitemaps — for public profiles/posts |
| [x-api.md](social-seo/x-api.md) | X/Twitter API: OAuth, posting, threads, rate limits, cross-posting |
| [seo-specialist-agent.md](social-seo/seo-specialist-agent.md) | Audits crawlability, canonical issues, JSON-LD, heading hierarchy |

---

## deployment/
CI/CD, containers, Git, and GitHub operations.

| File | What It Is |
|------|------------|
| [deployment-patterns.md](deployment/deployment-patterns.md) | CI/CD, blue-green deploys, canary releases, health checks, rollback |
| [docker-patterns.md](deployment/docker-patterns.md) | Multi-container local dev: app + Postgres + Redis + media service |
| [git-workflow.md](deployment/git-workflow.md) | GitHub Flow, commit conventions, PR templates, conflict resolution |
| [github-ops.md](deployment/github-ops.md) | Issue triage, PR management, CI debugging, release management via `gh` CLI |

---

## agents/
Specialist subagents to delegate heavy analysis.

| File | What It Is |
|------|------------|
| [performance-optimizer.md](agents/performance-optimizer.md) | Profiles feed rendering, bundle size, React anti-patterns, DB query perf |
| [database-reviewer.md](agents/database-reviewer.md) | PostgreSQL: query optimization, schema design, RLS, connection pooling |

---

## contexts/
Load these into Claude for mode-specific behavior.

| File | What It Is |
|------|------------|
| [dev.md](contexts/dev.md) | Dev mode: write code first, run tests after, keep commits atomic |
| [research.md](contexts/research.md) | Research mode: read widely before concluding, document findings |
| [review.md](contexts/review.md) | Review mode: prioritize by severity (critical > high > medium > low) |

---

## Suggested Workflow

```
Before a feature:  /plan → review architect-agent.md → product-lens if unsure
During coding:     /feature-dev → tdd-workflow → security-reviewer auto-triggers
Before PR:         verification-loop → /code-review
Weekly:            benchmark baselines + seo audit
Pre-launch:        deployment-patterns checklist + security-guide
```
