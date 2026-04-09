# ByteAI — Progress Log

## Milestone 0 — Session Initialized (2026-04-08)

### What's Done
- **UI Shell** — Complete. Next.js 16, React 19, TypeScript, Tailwind v4, shadcn/ui.
  - Screens: Auth, Onboarding, Feed, Compose, Search, Profile, Post Detail, Comments, Interviews
  - Routing: `/feed`, `/search`, `/profile`, `/compose`, `/post/[id]`, `/interviews`, `/auth`
  - API layer (`UI/lib/api.ts`) — fully stubbed with mock data, all TODOs
  - Mock data in `UI/lib/mock-data.ts`
- **.claude setup** — All agents, commands, skills, guides, memory installed and path-corrected.
  - Agents: architect, planner, code-reviewer, security-reviewer, database-reviewer, performance-optimizer, seo-specialist
  - Commands: /plan, /feature-dev, /tdd, /code-review, /optimize
  - `settings.json` created with safe permission defaults

### What's NOT Done (Backend — 0%)
- `Service/` directory is empty — no .NET code
- `DB/` directory is empty — no migrations
- No real API endpoints
- No auth integration (Clerk JWT)
- No database schema

### Architecture (Designed, Not Built)
- YARP Gateway → 6 microservices (User, Bytes, Feed, Search, AI, Notification)
- PostgreSQL + pgvector on Azure DB Flexible Server
- MongoDB (Azure Cosmos DB) for document storage
- Redis cache on Azure Container Instance
- Clerk Auth issuing JWTs
- RabbitMQ (CloudAMQP) for async messaging
- ONNX Runtime (all-MiniLM-L6-v2) for embeddings in-container
- Groq API (Llama 3.3 70B) for LLM/NLP

### Next Decision Required
Monolith-first vs. direct microservices for the backend bootstrap.

---

## Milestone 1 — UI Restructure + Polish (2026-04-08)

### UI Architecture Overhaul
- **Folder structure** refactored to industry standard:
  - `app/(auth)/` — unauthenticated routes (`/`, `/onboarding`)
  - `app/(app)/` — authenticated routes (`/feed`, `/interviews`, `/search`, `/compose`, `/profile`, `/post/[id]`, `/post/[id]/comments`)
  - `components/features/` — feature-sliced components (auth, feed, compose, search, profile, interviews, onboarding, detail, comments)
  - `components/layout/` — shared layout primitives (AppShell, PhoneFrame, Avatar, ByteAILogo, AuthGuard)
- **Route groups**: 9 clean routes, all building successfully with Next.js 16 Turbopack

### Auth & Session
- `proxy.ts` — Next.js 16 middleware (renamed from `middleware.ts`, export renamed `proxy` per Next.js 16 API)
- `hooks/use-auth.ts` — SPA auth persistence via localStorage (`byteai_auth_state`) + cookies (`byteai_auth`, `byteai_onboarded`)
- `hooks/use-local-storage.ts` — SSR-safe localStorage hook
- `AuthGuard` component — client-side guard in `(app)/layout.tsx` to catch stale cookies and redirect unauthenticated users to `/`
- Cookie sync on mount — prevents stale 30-day cookies from bypassing auth after clearing localStorage

### Component Decomposition
- `FeedScreen` split into: `FeedHeader`, `FeedFilters`, `PostCard`, `FollowingList`, `FeedScreen`
- `AuthScreen` split into: `LoginForm`, `SignupForm`, `GoogleIcon`, `AuthScreen`
- All screens now use `useRouter()` internally — no more `onNavigate`/`onViewPost`/`onViewComments` prop drilling

### Emoji → Lucide React
- All emoji/SVG icons replaced with Lucide throughout: `Home`, `Briefcase`, `Search`, `SquarePen`, `User`, `Heart`, `MessageSquare`, `Bookmark`, `Share2`, `BadgeCheck`, `Bell`, `Plus`, `ChevronLeft`, `Lightbulb`, `X`, `Code2`, `Pencil`, `Github`, `Globe`, `Lock`, `LogOut`, `Smartphone`

### Forms
- Zod + react-hook-form on all auth forms (`loginEmailSchema`, `loginPhoneSchema`, `signupEmailSchema`, `signupPhoneSchema` in `lib/schemas.ts`)
- Field-level error messages, live username availability indicator

### Bug Fixes
- Removed `pb-[180px]` on feed post articles (was causing massive blank gap)
- Fixed `handleBookmark` and `handleShare` in feed/interviews not calling `setPosts()` — state now updates correctly
- Fixed compose code editor from `<input>` (single-line) to `<textarea>` with line numbers
- Fixed Next.js 16 async `params` — `post/[id]/page.tsx` uses `await params`
- Fixed `seniorityLevels`/`domains` in onboarding — were `{id, label, icon}[]` objects, not strings

### Animated ByteAI Logo
- New `ByteAILogo` component (`components/layout/byteai-logo.tsx`) with shimmer sweep + glow orb animation
- Three sizes: `sm` (headers), `md` (sidebar), `lg` (auth screen)
- Used consistently in: sidebar, onboarding header, compose header, auth screen

### Feed Personalization
- FOR_YOU tab now defaults to user's onboarding preferences (filters posts by `feedPreferences` when no specific stack selected)
- Specific stack filter overrides preference filter
- Tech stack chip row replaced with `SearchableDropdown` — alphabetical, live search

### Searchable Dropdowns
- New reusable `SearchableDropdown` component (`components/ui/searchable-dropdown.tsx`)
- Search input at top, alphabetical options, accent color variants (accent/cyan/green/purple)
- Used in: feed tech stack filter, interviews company filter, interviews technology filter

### UI/UX Fixes
- Sidebar nav label: `BYTES` → `BITS`
- Feed header: `BYTES` → `BITS`
- Dropdown z-index fixed — filter bars get `relative z-20` to render above post cards (backdrop-filter stacking context issue)
- Search filters reduced to `ALL / BYTES / PEOPLE` only
- Compose ESC key: clears all content (text, code, tags) with toast confirmation
- Toast feedback (sonner) on: like, bookmark, share, post, draft save, login, logout, ESC clear

### Font Size Pass
Bumped all tiny mono text up one step across auth, onboarding, profile, feed, and dropdown components:
- Labels: `text-[8px]` → `text-[10px]`
- Buttons/tabs: `text-[9px]` → `text-[11px]`
- Input fields: `text-[11px]` → `text-sm`
- Section headers: `text-[8px]` → `text-[11px]`
- Stat grid labels: `text-[6.5px]` → `text-[9px]`
- Badge names: `text-[7px]` → `text-[9px]`

### Loading Skeletons
- `loading.tsx` added for `/feed`, `/interviews`, `/search`, `/profile` routes

### Still TODO (UI)
- Connect real user identity from Clerk to Avatar/initials (currently hardcoded `AX`)
- Onboarding data not yet persisted to backend
- Search filter `PEOPLE` tab has no separate UI (shows bytes for all filters currently)
- Profile photo upload not wired
- Notification bell has no real data
