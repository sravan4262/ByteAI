# Implementation Plan: UI Folder Restructure

## Requirements Restatement

The ByteAI UI folder exists but lacks organizational clarity. Key sections (types, constants, tests) are missing or scattered. This plan reorganizes `UI/` to be:
1. **Self-documenting** — folder names match responsibility (no ambiguity)
2. **Feature-scalable** — each domain in `features/` is isolated and ownable
3. **Standards-aligned** — matches `frontend-patterns.md` structure
4. **Type-safe** — centralized shared types eliminates duplicates
5. **Test-ready** — parallel test structure mirrors source structure

**Outcome:** A pristine folder structure that scales to 20+ features without decay.

---

## Current Problems

| Problem | Location | Impact |
|---------|----------|--------|
| No `types/` folder — types scattered in components | `components/*/` | Duplicated type definitions; no single source of truth |
| No `constants/` folder — magic numbers in code | `lib/api.ts`, `components/` | Hard to tweak (e.g. DEBOUNCE_DELAY_MS, PAGE_SIZE) |
| No `utils/` subfolder — all utils flat in `lib/` | `lib/utils.ts` | Doesn't scale; no categorization (string, date, array utils) |
| No `tests/` folder structure | Root or scattered | Hard to find test files; no clear test organization |
| `lib/` mixes concerns — api, schemas, mocks, utils | `lib/` | Should be `lib/api/`, `lib/validation/`, `lib/mocking/` |
| `features/` subcomponents not organized | `features/feed/*.tsx` | No clear hierarchy (FeedScreen vs FeedHeader vs FeedFilters) |
| No clear exports — no `index.ts` barrel files | All folders | Forces long import paths |

---

## Target Structure

```
UI/
├── app/                              ← Next.js 16 routes (NO CHANGES)
│   ├── (auth)/
│   │   ├── page.tsx
│   │   ├── onboarding/page.tsx
│   │   └── layout.tsx
│   ├── (app)/
│   │   ├── feed/page.tsx + loading.tsx
│   │   ├── profile/page.tsx + loading.tsx
│   │   ├── compose/page.tsx
│   │   ├── post/[id]/page.tsx + loading.tsx
│   │   ├── search/page.tsx + loading.tsx
│   │   ├── interviews/page.tsx + loading.tsx
│   │   └── layout.tsx
│   ├── globals.css
│   ├── layout.tsx
│   └── api/                          ← API route handlers (future)
├── components/
│   ├── features/                     ← domain screens + subcomponents
│   │   ├── auth/
│   │   │   ├── auth-screen.tsx
│   │   │   ├── login-form.tsx
│   │   │   ├── signup-form.tsx
│   │   │   ├── google-icon.tsx
│   │   │   └── index.ts              ← BARREL EXPORT
│   │   ├── feed/
│   │   │   ├── feed-screen.tsx       ← top-level: state + layout
│   │   │   ├── feed-header.tsx       ← subcomponent
│   │   │   ├── feed-filters.tsx      ← subcomponent
│   │   │   ├── post-card.tsx         ← reusable card
│   │   │   ├── following-list.tsx    ← subcomponent
│   │   │   └── index.ts              ← BARREL EXPORT
│   │   ├── compose/
│   │   │   ├── compose-screen.tsx
│   │   │   ├── compose-form.tsx      ← form logic separated
│   │   │   ├── tag-input.tsx         ← reusable in compose
│   │   │   └── index.ts
│   │   ├── profile/
│   │   │   ├── profile-screen.tsx
│   │   │   ├── profile-header.tsx
│   │   │   ├── profile-tabs.tsx
│   │   │   ├── edit-profile-modal.tsx
│   │   │   └── index.ts
│   │   ├── detail/
│   │   │   ├── detail-screen.tsx
│   │   │   ├── byte-metadata.tsx
│   │   │   ├── byte-actions.tsx
│   │   │   └── index.ts
│   │   ├── comments/
│   │   │   ├── comments-screen.tsx
│   │   │   ├── comment-thread.tsx
│   │   │   ├── comment-form.tsx
│   │   │   └── index.ts
│   │   ├── search/
│   │   │   ├── search-screen.tsx
│   │   │   ├── search-input.tsx
│   │   │   ├── search-results.tsx
│   │   │   └── index.ts
│   │   ├── interviews/
│   │   │   ├── interviews-screen.tsx
│   │   │   ├── interview-filters.tsx
│   │   │   ├── interview-card.tsx
│   │   │   └── index.ts
│   │   ├── onboarding/
│   │   │   ├── onboarding-screen.tsx
│   │   │   ├── tech-stack-selector.tsx
│   │   │   └── index.ts
│   │   └── index.ts                  ← BARREL EXPORT all features
│   ├── layout/                       ← structural primitives only
│   │   ├── app-shell.tsx
│   │   ├── auth-guard.tsx
│   │   ├── avatar.tsx
│   │   ├── byteai-logo.tsx
│   │   ├── phone-frame.tsx
│   │   └── index.ts
│   ├── ui/                           ← shadcn/ui + custom (NO CHANGES)
│   │   ├── searchable-dropdown.tsx
│   │   ├── [all shadcn primitives]
│   │   └── index.ts
│   └── index.ts                      ← BARREL EXPORT components
├── hooks/
│   ├── use-auth.ts
│   ├── use-local-storage.ts
│   ├── use-mobile.ts
│   ├── use-query.ts                  ← NEW: generic data fetching hook
│   ├── use-debounce.ts               ← NEW: already in patterns, extract
│   ├── use-intersection.ts           ← NEW: for infinite scroll
│   └── index.ts                      ← BARREL EXPORT
├── lib/
│   ├── api/
│   │   ├── client.ts                 ← base fetch wrapper
│   │   ├── endpoints.ts              ← typed endpoint definitions
│   │   ├── index.ts
│   │   └── __mocks__/                ← mock data for testing
│   │       └── mock-api.ts
│   ├── validation/
│   │   ├── schemas.ts                ← Zod schemas
│   │   ├── validators.ts             ← custom validators
│   │   └── index.ts
│   ├── utils/
│   │   ├── string.ts                 ← string helpers
│   │   ├── array.ts                  ← array helpers
│   │   ├── date.ts                   ← date helpers
│   │   ├── cn.ts                     ← classname utility
│   │   ├── index.ts
│   │   └── __tests__/
│   │       ├── string.test.ts
│   │       └── array.test.ts
│   ├── constants/
│   │   ├── app.ts                    ← APP_NAME, LOGO_URL, etc.
│   │   ├── api.ts                    ← DEBOUNCE_MS, PAGE_SIZE, MAX_RETRIES
│   │   ├── limits.ts                 ← MAX_POST_LENGTH, MIN_USERNAME_LENGTH
│   │   ├── routes.ts                 ← route paths as constants
│   │   └── index.ts
│   ├── types/
│   │   ├── domain.ts                 ← BytePost, User, Comment, Reaction, etc.
│   │   ├── api.ts                    ← ApiResponse, PagedResponse, ApiError
│   │   ├── forms.ts                  ← LoginForm, CreateByteForm, etc.
│   │   ├── index.ts
│   │   └── __readme.md               ← guidance: "Add new types here, not in components/"
│   ├── mock-data.ts                  ← placeholder data (eventually DELETE)
│   └── index.ts
├── types/                            ← OPTIONAL: if lib/types/ not enough
│   ├── index.d.ts                    ← global type augmentations (if needed)
│   └── ...
├── tests/                            ← NEW: test infrastructure
│   ├── setup.ts                      ← test configuration (Jest, React Testing Library)
│   ├── fixtures/                     ← shared test data
│   │   ├── user-fixtures.ts
│   │   ├── byte-fixtures.ts
│   │   └── index.ts
│   ├── mocks/                        ← global mocks
│   │   ├── handlers.ts               ← MSW handlers (if using)
│   │   └── index.ts
│   └── __readme.md                   ← testing guidelines
├── styles/
│   ├── globals.css
│   ├── animations.css                ← NEW: reusable animations
│   ├── tokens.css                    ← NEW: Tailwind token overrides
│   └── __readme.md
├── proxy.ts                          ← Next.js 16 middleware (NO CHANGES)
├── package.json                      ← (NO CHANGES)
├── tsconfig.json                     ← (OPTIONAL: update path aliases)
├── jest.config.js                    ← NEW: test runner config
├── .eslintrc.json                    ← (OPTIONAL: add stricter rules)
└── __readme.md                       ← NEW: folder structure guide
```

---

## Implementation Phases

### **Phase 1: Create Backbone Folders & Barrel Exports** (30 min)

**Goal:** Establish new folder structure without moving files.

**Tasks:**
1. Create folders (no files yet):
   ```bash
   mkdir -p lib/api lib/validation lib/utils lib/constants lib/types
   mkdir -p hooks/__tests__
   mkdir -p components/features/__tests__
   mkdir -p tests/fixtures tests/mocks
   mkdir -p styles
   ```

2. Create empty `index.ts` (barrel exports) in each:
   - `lib/index.ts`
   - `lib/api/index.ts`
   - `lib/validation/index.ts`
   - `lib/utils/index.ts`
   - `lib/constants/index.ts`
   - `lib/types/index.ts`
   - `hooks/index.ts`
   - `components/index.ts`
   - `components/features/index.ts`
   - `components/layout/index.ts`
   - `components/ui/index.ts`
   - Each `components/features/*/index.ts` (auth, feed, compose, etc.)

3. Add TSConfig path aliases (optional):
   ```json
   {
     "compilerOptions": {
       "paths": {
         "@/*": ["./*"],
         "@/components/*": ["./components/*"],
         "@/lib/*": ["./lib/*"],
         "@/hooks/*": ["./hooks/*"],
         "@/types/*": ["./lib/types/*"],
         "@/constants/*": ["./lib/constants/*"]
       }
     }
   }
   ```

**Files Changed:**
- Create ~20 `index.ts` files + update `tsconfig.json`

**Risks:** LOW — purely additive, no breaking changes

---

### **Phase 2: Consolidate Types** (1 hour)

**Goal:** Create single source of truth for all TypeScript types.

**Tasks:**
1. Create `lib/types/domain.ts`:
   ```typescript
   export interface BytePost {
     id: string
     title: string
     content: string
     // ... match backend ViewModels
   }
   
   export interface User {
     id: string
     username: string
     // ...
   }
   
   export interface Comment {
     id: string
     // ...
   }
   ```

2. Create `lib/types/api.ts`:
   ```typescript
   export interface ApiResponse<T> {
     data: T
     error?: string
     status: number
   }
   
   export interface PagedResponse<T> {
     items: T[]
     page: number
     pageSize: number
     total: number
   }
   ```

3. Create `lib/types/forms.ts`:
   ```typescript
   export interface LoginFormData {
     email: string
     password: string
   }
   
   export interface CreateByteFormData {
     title: string
     content: string
     tags: string[]
   }
   ```

4. Update `lib/types/index.ts` (barrel export):
   ```typescript
   export * from './domain'
   export * from './api'
   export * from './forms'
   ```

5. Delete scattered type definitions from components

**Files Changed:**
- Create `lib/types/domain.ts`, `api.ts`, `forms.ts`, `index.ts`
- Remove type definitions from `components/**/*.ts(x)`

**Risks:** MEDIUM — ensure types match current component usage before deleting

---

### **Phase 3: Extract Constants** (45 min)

**Goal:** Remove magic numbers/strings from code.

**Tasks:**
1. Create `lib/constants/api.ts`:
   ```typescript
   export const DEBOUNCE_DELAY_MS = 500
   export const PAGE_SIZE = 20
   export const MAX_RETRIES = 3
   export const RETRY_DELAY_MS = 1000
   export const API_TIMEOUT_MS = 10000
   ```

2. Create `lib/constants/limits.ts`:
   ```typescript
   export const MAX_POST_LENGTH = 300
   export const MIN_USERNAME_LENGTH = 3
   export const MAX_USERNAME_LENGTH = 20
   export const MAX_TAGS = 5
   ```

3. Create `lib/constants/routes.ts`:
   ```typescript
   export const ROUTES = {
     HOME: '/',
     ONBOARDING: '/onboarding',
     FEED: '/feed',
     PROFILE: (username: string) => `/profile/${username}`,
     COMPOSE: '/compose',
     POST_DETAIL: (id: string) => `/post/${id}`,
     POST_COMMENTS: (id: string) => `/post/${id}/comments`,
     SEARCH: '/search',
     INTERVIEWS: '/interviews',
   }
   ```

4. Create `lib/constants/app.ts`:
   ```typescript
   export const APP_NAME = 'ByteAI'
   export const APP_DESCRIPTION = 'Tech news in bite-sized format'
   export const APP_VERSION = '0.1.0'
   ```

5. Update `lib/constants/index.ts` (barrel export)

**Files Changed:**
- Create `lib/constants/*`
- Update imports in `components/**`, `hooks/**`, `lib/api.ts`

**Risks:** LOW — mostly search & replace in imports

---

### **Phase 4: Reorganize `lib/` Subfolders** (1.5 hours)

**Goal:** Categorize utilities by concern.

**Tasks:**
1. Create `lib/utils/` substructure:
   ```bash
   mkdir -p lib/utils/__tests__
   ```

2. Move/create utility files:
   - `lib/utils/cn.ts` ← extract from current `utils.ts`
   - `lib/utils/string.ts` ← string helpers (capitalize, truncate, slug, etc.)
   - `lib/utils/array.ts` ← array helpers (flatten, unique, chunk, etc.)
   - `lib/utils/date.ts` ← date helpers (formatDate, isRecent, etc.)
   - `lib/utils/number.ts` ← number formatting (formatBytes, toK, etc.)
   - `lib/utils/index.ts` ← barrel export all

3. Move `lib/api.ts` → `lib/api/client.ts`
4. Create `lib/api/endpoints.ts` (typed endpoint definitions):
   ```typescript
   export const API_ENDPOINTS = {
     BYTES: {
       GET_ALL: '/api/bytes',
       GET_ONE: (id: string) => `/api/bytes/${id}`,
       CREATE: '/api/bytes',
       UPDATE: (id: string) => `/api/bytes/${id}`,
       DELETE: (id: string) => `/api/bytes/${id}`,
     },
     FEED: {
       GET: '/api/feed',
     },
     // ... other endpoints
   }
   ```

5. Move `lib/schemas.ts` → `lib/validation/schemas.ts`
6. Update `lib/validation/index.ts`

7. Delete `lib/utils.ts` (after consolidation)
8. Rename `lib/mock-data.ts` → `lib/api/__mocks__/mock-data.ts`

**Files Changed:**
- Reorganize 5+ files into new structure
- Update 50+ import paths across codebase

**Risks:** HIGH — lots of import path churn; easy to miss a file

**Mitigation:**
- Use IDE "Find & Replace" carefully
- Run `npm run type-check` after each step
- Test build: `npm run build`

---

### **Phase 5: Reorganize `components/features/` Subcomponents** (1.5 hours)

**Goal:** Clearly hierarchize feature components (screen → smart components → dumb components).

**Current state (example from feed):
```
components/features/feed/
├── feed-screen.tsx         ← top-level ✓
├── feed-header.tsx         ← subcomponent ✓
├── feed-filters.tsx        ← subcomponent ✓
├── post-card.tsx           ← reusable ✓
└── following-list.tsx      ← subcomponent ✓
```

**Tasks:**
1. Within each feature folder, add comments to clarify hierarchy:
   ```typescript
   // components/features/feed/feed-screen.tsx
   /**
    * TOP-LEVEL SCREEN COMPONENT
    * - Manages feed state
    * - Owns data fetching
    * - Composes subcomponents
    * - Handles errors + loading
    */
   
   // components/features/feed/feed-header.tsx
   /**
    * SUBCOMPONENT
    * - Receives props from FeedScreen
    * - No independent state
    * - Displays only
    */
   ```

2. Extract reusable subcomponents into separate files (already mostly done):
   - `compose/compose-form.tsx` (separate from screen if not done)
   - `profile/profile-tabs.tsx` (separate from screen)
   - `detail/byte-actions.tsx` (separate from screen)
   - `comments/comment-form.tsx` (separate from screen)

3. Add `index.ts` barrel exports to each feature:
   ```typescript
   // components/features/feed/index.ts
   export { FeedScreen } from './feed-screen'
   export { PostCard } from './post-card'
   export type { FeedScreenProps } from './feed-screen'
   ```

4. NO file moves needed — just file extractions + comments + barrel exports

**Files Changed:**
- Possibly create 3-5 new subcomponent files from large files
- Add `index.ts` to all 8 feature folders
- Add JSDoc comments

**Risks:** LOW — mostly structural, not logic-changing

---

### **Phase 6: Create Test Infrastructure** (1 hour)

**Goal:** Establish testing patterns & fixtures.

**Tasks:**
1. Create `tests/setup.ts`:
   ```typescript
   // Jest + React Testing Library configuration
   import '@testing-library/jest-dom'
   // Custom matchers, global mocks, etc.
   ```

2. Create `tests/fixtures/user-fixtures.ts`:
   ```typescript
   export const mockUser = {
     id: '1',
     username: 'testuser',
     // ... match lib/types/domain.User
   }
   
   export const mockUsers = [mockUser, /* ... */]
   ```

3. Create `tests/fixtures/byte-fixtures.ts`:
   ```typescript
   export const mockByte = {
     id: '1',
     title: 'Test Byte',
     // ... match lib/types/domain.BytePost
   }
   ```

4. Create `tests/mocks/handlers.ts` (if using MSW):
   ```typescript
   import { http, HttpResponse } from 'msw'
   
   export const handlers = [
     http.get('/api/bytes', () => HttpResponse.json([mockByte])),
     // ... other handlers
   ]
   ```

5. Create `jest.config.js`:
   ```javascript
   module.exports = {
     testEnvironment: 'jsdom',
     setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
     moduleNameMapper: {
       '^@/(.*)$': '<rootDir>/$1',
     },
   }
   ```

6. Update `package.json`:
   ```json
   {
     "scripts": {
       "test": "jest",
       "test:watch": "jest --watch"
     },
     "devDependencies": {
       "@testing-library/react": "^X.Y.Z",
       "jest": "^X.Y.Z",
       "jest-environment-jsdom": "^X.Y.Z"
     }
   }
   ```

**Files Changed:**
- Create 5 new test infrastructure files

**Risks:** LOW — optional for now; doesn't affect existing code

---

### **Phase 7: Update Imports Across Codebase** (2 hours)

**Goal:** Replace all old import paths with new barrel exports.

**Before:**
```typescript
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/use-auth'
import { FeedScreen } from '@/components/features/feed/feed-screen'
import { apiClient } from '@/lib/api'
import { loginSchema } from '@/lib/schemas'
```

**After:**
```typescript
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks'
import { FeedScreen } from '@/components/features/feed'
import { apiClient } from '@/lib/api'
import { loginSchema } from '@/lib/validation'
import { APP_NAME, DEBOUNCE_DELAY_MS } from '@/lib/constants'
import type { BytePost, User } from '@/lib/types'
```

**Tasks:**
1. Update all imports in `components/features/**/*.tsx`
2. Update all imports in `app/**/*.tsx`
3. Update all imports in `hooks/**/*.ts`
4. Run `npm run type-check` — should have 0 errors
5. Run `npm run build` — should succeed
6. Test app locally: `npm run dev`

**Files Changed:**
- 50+ files with updated import statements

**Risks:** HIGH — easy to miss files; regex find-replace can have unintended effects

**Mitigation:**
- Use IDE "Find & Replace" + manual review per file
- Commit per-feature (feed, profile, etc.)
- Test after each feature group

---

### **Phase 8: Add `__readme.md` Documentation** (30 min)

**Goal:** Guide future developers on folder structure.

**Files to create:**
1. `UI/__readme.md`:
   ```markdown
   # ByteAI UI Folder Structure
   
   ## Overview
   - `app/` — Next.js 16 routes (app router)
   - `components/` — React components (features, layout, ui)
   - `hooks/` — Custom React hooks
   - `lib/` — Utilities (api, validation, utils, constants, types)
   - `tests/` — Test fixtures & mocks
   - `styles/` — Global CSS
   
   ## When to Add What
   - New component → `components/features/{feature}/{component}.tsx`
   - New type → `lib/types/{filename}.ts` (not in components/)
   - New constant → `lib/constants/{filename}.ts`
   - New utility → `lib/utils/{filename}.ts`
   - New hook → `hooks/use-{name}.ts`
   ```

2. `lib/types/__readme.md`:
   ```markdown
   # Type Definitions
   
   All TypeScript types for the app live here.
   - Domain types → `domain.ts`
   - API response types → `api.ts`
   - Form types → `forms.ts`
   
   **Rule:** Do NOT scatter types in components. Always add to lib/types/ first.
   ```

3. `tests/__readme.md`:
   ```markdown
   # Testing Structure
   
   - `fixtures/` — Reusable test data
   - `mocks/` — Global mocks (MSW handlers, etc.)
   - `setup.ts` — Jest configuration
   ```

**Files Changed:**
- Create 3 `__readme.md` files

**Risks:** LOW — documentation only

---

## File Movement & Creation Summary

### New Folders (7)
- `lib/api/`
- `lib/validation/`
- `lib/utils/`
- `lib/constants/`
- `lib/types/`
- `tests/` + `tests/fixtures/` + `tests/mocks/`
- `styles/`

### New Files (30+)
- **Barrel exports:** `index.ts` in each folder
- **Type definitions:** `lib/types/{domain,api,forms}.ts`
- **Constants:** `lib/constants/{api,limits,routes,app}.ts`
- **Utils:** `lib/utils/{cn,string,array,date,number}.ts`
- **API:** `lib/api/endpoints.ts`
- **Validation:** `lib/validation/schemas.ts`, `validators.ts`
- **Tests:** `tests/setup.ts`, fixtures, handlers
- **Docs:** `__readme.md` files
- **Config:** `jest.config.js`, update `tsconfig.json`

### Files to Move
- `lib/api.ts` → `lib/api/client.ts`
- `lib/schemas.ts` → `lib/validation/schemas.ts`
- `lib/mock-data.ts` → `lib/api/__mocks__/mock-data.ts`
- `lib/utils.ts` → split into `lib/utils/*.ts`

### Files to Delete
- `lib/utils.ts` (after consolidating into `lib/utils/`)
- (keep `lib/mock-data.ts` temporarily as symlink)

### Import Path Updates
- 50+ files across `components/`, `app/`, `hooks/`
- Update 100+ import statements

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|-----------|
| Import path chaos during reorganization | **HIGH** | Use IDE find-replace carefully. Test after each phase. |
| Miss updating some imports → build fails | **MEDIUM** | Run `npm run type-check` + `npm run build` after each phase. Check error list. |
| Break component functionality during moves | **MEDIUM** | Only move files; don't change logic. Use `git diff` to verify. |
| Confusion about where to add new files | **LOW** | Add `__readme.md` files with clear rules. |
| Circular imports after reorganization | **MEDIUM** | Verify import graph (no cycles). Test `npm run build`. |

---

## Estimated Complexity

| Phase | Effort | Notes |
|--------|--------|-------|
| 1 (Folders + Barrels) | 30 min | Additive, no breaking |
| 2 (Types) | 1 hour | Consolidate scattered types |
| 3 (Constants) | 45 min | Extract magic numbers |
| 4 (Lib subfolders) | 1.5 hours | High import churn |
| 5 (Features clarity) | 1.5 hours | Mostly comments + extractions |
| 6 (Test infra) | 1 hour | Optional; doesn't affect app |
| 7 (Import updates) | 2 hours | High risk; requires diligence |
| 8 (Documentation) | 30 min | Metadata only |
| **Total** | **~8-9 hours** | **1 developer day** |

---

## Testing Strategy

### Build Verification
After each phase, run:
```bash
npm run type-check    # ✅ 0 errors
npm run build         # ✅ no errors
npm run dev           # ✅ app loads
```

### Manual Testing Checklist
- [ ] `/feed` loads
- [ ] `/profile/[username]` loads
- [ ] `/compose` loads
- [ ] Like/bookmark → network calls work
- [ ] Search works
- [ ] Auth flow works
- [ ] No console errors

### Before Merge
- [ ] All imports resolved correctly
- [ ] All tests pass (if any added)
- [ ] No unused imports
- [ ] Barrel exports working

---

## Success Criteria

- ✅ All 50+ files organized into correct folders
- ✅ All types in `lib/types/`, not scattered
- ✅ All constants in `lib/constants/`, not hardcoded
- ✅ All utils in `lib/utils/`, not mixed
- ✅ All feature subcomponents have barrel exports
- ✅ `npm run type-check` passes (0 errors)
- ✅ `npm run build` succeeds
- ✅ App loads locally without errors
- ✅ All manual tests pass
- ✅ No `// TODO: move this` comments left

---

## Next Steps

**IF YOU APPROVE THIS PLAN:**
1. Phase 1: Create folders + barrel exports
2. Phase 2: Consolidate types
3. Phase 3: Extract constants
4. Phase 4: Reorganize `lib/` subfolders
5. (run build check after each)
6. Phase 5: Clarify feature components
7. Phase 6: Create test infrastructure
8. Phase 7: Update imports across codebase (high care!)
9. Phase 8: Add documentation

**Commit strategy:**
- Per-phase commits (easier to revert if needed)
- E.g., `feat: reorganize lib/utils folder`, `refactor: extract constants`

**MODIFICATIONS NEEDED:**
- Different phase order?
- Skip any phases (e.g., test infrastructure)?
- Additional reorganization goals?
