# ByteAI — Progress Log

---

## Current State (2026-04-10)

| Layer | Status |
|-------|--------|
| UI Shell | Complete — all screens running, module errors fixed |
| Backend Structure | Complete — 3-project solution, 0 build errors |
| Database Schema | Complete — 9 SQL tables applied to local Supabase DB |
| Seed Data | Complete — 5 users + 23 bytes via `scripts/seed.sql` |
| Backend API | Complete — all controllers with Swagger docs, Supabase JWT validation |
| AI Endpoints | Complete — `/api/ai/suggest-tags`, `/api/ai/ask` (Groq) exist; no UI yet |
| Frontend ↔ Backend | Wired — `http.ts` base client, `client.ts` calls real endpoints, feed uses `api.getFeed()` |
| Supabase Auth | Complete — Supabase JWTs, hooks/use-auth.ts |
| CI/CD / IaC | Not started |

---

## Milestone 4 — Solution Reorganization ✅ (2026-04-09)

Moved `ByteAI.sln` and `tests/` from repo root into `Service/` so the backend is fully self-contained.

```
repo/
├── UI/              ← Next.js frontend (standalone: cd UI && pnpm dev)
├── Service/         ← .NET backend (standalone: cd Service && dotnet build)
│   ├── ByteAI.sln
│   ├── ByteAI.Api/
│   ├── ByteAI.Core/
│   └── tests/
│       └── ByteAI.Api.Tests/
├── supabase/        ← SQL schema source of truth
└── infra/           ← docker-compose, Bicep (future)
```

- `ByteAI.Api.Tests.csproj` now references both `ByteAI.Api` and `ByteAI.Core` projects.
- `dotnet build Service/ByteAI.sln` → 0 errors, 0 warnings ✅

---

## Milestone 3 — Backend Restructure ✅ (2026-04-09)

### Architecture: 3-Project Solution + Table-First Database

| Project | Type | Responsibility |
|---------|------|----------------|
| `ByteAI.Api` | ASP.NET Core 9 Web API | Controllers, ViewModels, Mappers, Auth |
| `ByteAI.Core` | Class Library (net9.0) | Entities, EF Fluent configs, Validators, Services, Commands, Events |
| `ByteAI.Tests` | xUnit Class Library | All unit + integration tests |

**Dependency graph:** `ByteAI.Tests → ByteAI.Api → ByteAI.Core`

**Table-first rule:** `supabase/tables/*.sql` is the schema source of truth. EF Core reads from existing tables via `IEntityTypeConfiguration<T>`. `dotnet ef migrations add` is banned.

### What Was Built

**`supabase/tables/`** — 9 SQL files
- `users.sql` — `interest_embedding vector(384)`, unique on `supabase_user_id` and `username`
- `bytes.sql` — generated `tsvector`, HNSW index on embedding, GIN on `search_vector` and `tags`
- `comments.sql` — `parent_id` FK for threading
- `reactions.sql` — composite PK `(byte_id, user_id)`, CHECK `type IN ('like')`
- `bookmarks.sql` — composite PK `(byte_id, user_id)`
- `follows.sql` — composite PK, `CHECK (follower_id <> following_id)`
- `notifications.sql` — `jsonb payload`, partial index on unread
- `badges.sql` — unique `(user_id, badge_type)`
- `drafts.sql`

**`Service/ByteAI.Core/`**
- `Entities/` — 9 entities (`User`, `Byte`, `Comment`, `Reaction`, `Bookmark`, `Follow`, `Notification`, `Badge`, `Draft`)
- `Entities/Configurations/` — 9 `IEntityTypeConfiguration<T>` classes (one per table)
- `Validators/` — `UserValidator`, `ByteValidator` (FluentValidation)
- `Commands/Bytes/` — `CreateByteCommand`, `UpdateByteCommand`, `DeleteByteCommand`, `GetBytesQuery`, `GetByteByIdQuery` + handlers
- `Commands/Users/` — `GetUserByIdQuery`, `GetUserByUsernameQuery`, `UpdateProfileCommand`, `GetFollowersQuery`, `GetFollowingQuery` + handlers
- `Commands/Comments/` — create, delete, get + handlers
- `Commands/Bookmarks/` — create, delete, get user bookmarks + handlers
- `Commands/Reactions/` — add, remove, get counts + handlers
- `Commands/Follow/` — `FollowUserCommand`, `UnfollowUserCommand` + handlers
- `Commands/Feed/` — `GetFeedQuery` with in-memory scoring (followed bytes first, `(likes×10 + comments×5) / (days+1)`)
- `Events/` — `ByteCreatedEvent`, `ByteReactedEvent`, `UserFollowedEvent`
- `Infrastructure/Persistence/AppDbContext.cs` — `ApplyConfigurationsFromAssembly`, no auto-migrate
- `Infrastructure/PagedResult.cs` — `PagedResult<T>`, `PaginationParams`, `ReactionsCount`
- `GlobalUsings.cs` — `global using Byte = ByteAI.Core.Entities.Byte` (disambiguates from `System.Byte`)

**`Service/ByteAI.Api/`**
- `Controllers/` — `BytesController`, `UsersController`, `CommentsController`, `ReactionsController`, `BookmarksController`, `FollowController`, `FeedController`
- `ViewModels/` — immutable `sealed record` request/response types per domain
- `ViewModels/Common/` — `ApiResponse<T>`, `ApiError`, `PagedResponse<T>`
- `Mappers/` — static extension methods: `ToResponse()`, `ToCommand()`
- `Common/Auth/SupabaseJwtExtensions.cs — AddSupabaseJwt(), GetSupabaseUserId()`
- `GlobalUsings.cs` — same `Byte` alias
- `Program.cs` — MediatR + FluentValidation scan `ByteAI.Core` assembly; no auto-migrate

**`dotnet build` → 0 errors, 0 warnings ✅**

---

## Milestone 2 — UI Shell ✅ (2026-04-08)

### Folder Structure

```
UI/
├── app/
│   ├── (auth)/                   ← unauthenticated routes
│   │   ├── page.tsx              ← / (Auth screen)
│   │   ├── onboarding/page.tsx
│   │   └── layout.tsx
│   ├── (app)/                    ← authenticated routes (wrapped by AuthGuard)
│   │   ├── feed/page.tsx + loading.tsx
│   │   ├── interviews/page.tsx + loading.tsx
│   │   ├── search/page.tsx + loading.tsx
│   │   ├── profile/page.tsx + loading.tsx
│   │   ├── compose/page.tsx
│   │   ├── post/[id]/page.tsx
│   │   ├── post/[id]/comments/page.tsx
│   │   └── layout.tsx            ← mounts AppShell + AuthGuard
│   ├── globals.css
│   └── layout.tsx                ← root layout (ThemeProvider, Toaster)
├── components/
│   ├── features/                 ← feature-sliced screen components
│   │   ├── auth/                 ← AuthScreen, LoginForm, SignupForm, GoogleIcon
│   │   ├── feed/                 ← FeedScreen, FeedHeader, FeedFilters, PostCard, FollowingList
│   │   ├── compose/              ← ComposeScreen
│   │   ├── comments/             ← CommentsScreen
│   │   ├── detail/               ← DetailScreen
│   │   ├── interviews/           ← InterviewsScreen
│   │   ├── onboarding/           ← OnboardingScreen
│   │   ├── profile/              ← ProfileScreen
│   │   └── search/               ← SearchScreen
│   ├── layout/                   ← shared structural primitives
│   │   ├── app-shell.tsx         ← sidebar nav + bottom nav
│   │   ├── auth-guard.tsx        ← client-side auth redirect
│   │   ├── avatar.tsx
│   │   ├── byteai-logo.tsx       ← animated shimmer logo (sm/md/lg)
│   │   └── phone-frame.tsx
│   └── ui/                       ← shadcn/ui primitives + custom
│       ├── searchable-dropdown.tsx ← reusable searchable select
│       └── [all shadcn primitives]
├── hooks/
│   ├── use-auth.ts               ← SPA auth state (localStorage + cookies)
│   ├── use-local-storage.ts      ← SSR-safe localStorage hook
│   └── use-mobile.ts
├── lib/
│   ├── api.ts                    ← typed API client (stubbed — all mock)
│   ├── mock-data.ts              ← placeholder data for all screens
│   ├── schemas.ts                ← Zod schemas for auth forms
│   └── utils.ts                  ← cn() and helpers
├── styles/globals.css
└── proxy.ts                      ← Next.js 16 middleware (auth cookie check)
```

### Key Decisions
- Route groups `(auth)` / `(app)` enforce auth boundary at the layout level
- `AuthGuard` component prevents stale cookies bypassing auth after clearing localStorage
- `use-auth.ts` persists state to `localStorage` (`byteai_auth_state`) + cookies (`byteai_auth`, `byteai_onboarded`)
- All screens use `useRouter()` internally — no prop-drilled navigation callbacks
- Icons: Lucide React throughout (no emojis or custom SVGs)
- Forms: Zod + react-hook-form on all auth forms (`lib/schemas.ts`)
- Toast feedback (sonner): like, bookmark, share, post, draft save, login, logout, ESC clear
- Feed FOR_YOU tab defaults to onboarding preferences when no stack selected
- `SearchableDropdown` used in: feed tech stack filter, interviews company + technology filters

### What Still Uses Mock Data
- `lib/api.ts` — fully stubbed, all endpoints return mock data
- Avatar initials hardcoded as `AX` (resolved from Supabase session)
- Onboarding preferences not persisted to backend
- Notification bell has no real data

---

## Milestone 6 — Local Dev Setup + Frontend Wiring ✅ (2026-04-10)

### Local Dev Environment
- Supabase local dev running — DB at `postgresql://postgres:postgres@127.0.0.1:54322/postgres`
- pgvector extension enabled (`CREATE EXTENSION IF NOT EXISTS vector`)
- All 9 tables applied via psql in dependency order
- Fixed `bytes.sql` generated column: removed non-immutable `array_to_string(tags)` from `search_vector` expression
- Seed data loaded from `scripts/seed.sql`: 5 users + 23 bytes across 14 tech stacks
- Fixed `bytes_type_check` constraint — seed uses `'article'` not `'byte'`

### Frontend Wiring
- Created `UI/lib/api/http.ts` — base fetch client with auth header, reads token from `localStorage('byteai_auth_token')`
- Rewrote `UI/lib/api/client.ts` — all data-fetching functions call real backend endpoints, fall back to mock data on error
- `byteToPost()` mapper converts `ByteResponse` (backend) → `Post` (frontend shape)
- `feed-screen.tsx` replaced mock state with `useEffect` → `api.getFeed()` with loading state
- Created `UI/.env.local` with `NEXT_PUBLIC_API_URL=http://localhost:5239`
- Created `Service/ByteAI.Api/appsettings.Development.json` (gitignored)
- Updated `.gitignore` — excludes `appsettings.Development.json` and `.env.local`
- Renamed `backend-todo.md` → `todo.md`, updated to reflect completed phases

### Next Up
1. Run backend: `cd Service && dotnet run --project ByteAI.Api`
2. Get dev JWT from jwt.io (payload: `{"sub": "seed_alex"}`)
3. Set in browser localStorage: `localStorage.setItem('byteai_auth_token', '<jwt>')`
4. Feed screen should load real bytes from DB
5. Auth complete — Supabase auth in use with useAuth() hook

---

## Milestone 5 — Backend Polish & UI Fixes ✅ (2026-04-09)

### Backend
- Added full Swagger UI (`/swagger`) with Bearer security scheme and XML doc comments on all 11 controllers
- Fixed DI startup crash: `RedisFeedCache` always registered; `AddDistributedMemoryCache()` as fallback when Redis not configured
- Added Supabase JWT validation (HS256) with dev bypass for local testing
- `Program.cs` configures Supabase JWT bearer via AddSupabaseJwt()

### Frontend
- Fixed Turbopack workspace root confusion — added `turbopack.root` to `next.config.mjs`
- Restored missing barrel files deleted during UI reorganization:
  - `UI/lib/mock-data.ts` → re-exports from `lib/api/__mocks__/mock-data`
  - `UI/lib/schemas.ts` → re-exports from `lib/validation/schemas`
  - `UI/lib/utils.ts` → re-exports from `lib/utils/` (cn, string, date, array, number)
- Created `UI/lib/api/__mocks__/api.ts` with correct frontend `Post` and `Comment` types matching component usage
- Added all missing stub functions to `UI/lib/api/client.ts`:
  - `likePost`, `unlikePost`, `bookmarkPost`, `sharePost`, `reactToPost`, `addComment`, `voteComment`
  - `saveOnboardingData`, `updateFeedPreferences`, `updateTechStack`, `updateTheme`, `updateNotificationSettings`, `updatePrivacy`
  - `search`, `getReachEstimate`, `saveDraft`, `createPost`
- Exported `Post` and `Comment` types from `@/lib/api` (frontend shape, not domain shape)

---

## Pending Phases

| Phase | Description |
|-------|-------------|
| Next | Wire `UI/lib/api/client.ts` to real backend HTTP calls (replace all stubs) |
| Done | Supabase access_token sent as Authorization: Bearer on all API requests |
| Next | AI Chat UI — floating "Ask AI" button or per-byte panel (endpoint exists, no UI) |
| Next | Tag suggestion in compose screen (endpoint exists, not wired) |
| Infra | docker-compose.yml for local Postgres + Redis dev |
| Infra | Supabase webhook signature validation |
| Infra | AI rate limiter on `/api/ai/*` (stricter than global 120 req/min) |
| Infra | OpenTelemetry tracing + Prometheus metrics |
| Infra | Dockerfile, Bicep IaC, GitHub Actions CI/CD |
| Quality | Write tests — `ByteAI.Api.Tests` project is empty |
