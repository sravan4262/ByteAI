# ByteAI Feature Expansion Plan
## Date: 2026-04-10

---

## Immediate Fixes

### 1. `relation "bytes" does not exist`
**Cause:** EF Core connects to Supabase local DB (`postgres` on port 54322) but tables haven't been applied to this session.  
**Fix:** Reapply all SQL schemas in order:
```bash
DB="postgresql://postgres:postgres@127.0.0.1:54322/postgres"
psql $DB -c "CREATE EXTENSION IF NOT EXISTS vector; CREATE EXTENSION IF NOT EXISTS pg_trgm;"
psql $DB -f supabase/tables/seniority_types.sql
psql $DB -f supabase/tables/domains.sql
psql $DB -f supabase/tables/tech_stacks.sql
psql $DB -f supabase/tables/badge_types.sql
psql $DB -f supabase/tables/level_types.sql
psql $DB -f supabase/tables/search_types.sql
psql $DB -f supabase/tables/users.sql
psql $DB -f supabase/tables/bytes.sql
psql $DB -f supabase/tables/comments.sql
psql $DB -f supabase/tables/interviews.sql
psql $DB -f supabase/tables/interview_comments.sql
psql $DB -f supabase/tables/reactions.sql
psql $DB -f supabase/tables/interview_reactions.sql
psql $DB -f supabase/tables/bookmarks.sql
psql $DB -f supabase/tables/interview_bookmarks.sql
psql $DB -f supabase/tables/follows.sql
psql $DB -f supabase/tables/followers.sql
psql $DB -f supabase/tables/following.sql
psql $DB -f supabase/tables/notifications.sql
psql $DB -f supabase/tables/badges.sql
psql $DB -f supabase/tables/drafts.sql
psql $DB -f supabase/tables/user_tech_stacks.sql
psql $DB -f supabase/tables/user_feed_preferences.sql
psql $DB -f supabase/tables/byte_tags.sql
psql $DB -f supabase/tables/socials.sql
psql $DB -f supabase/tables/trending.sql
psql $DB -f supabase/tables/logs.sql
psql $DB -f supabase/seeds/seed_seniority.sql
psql $DB -f supabase/seeds/seed_domains.sql
psql $DB -f supabase/seeds/seed_tech_stacks.sql
psql $DB -f supabase/seeds/seed_badge_types.sql
psql $DB -f supabase/seeds/seed_level_types.sql
psql $DB -f supabase/seeds/seed_search_types.sql
psql $DB -f supabase/seeds/seed_users.sql
psql $DB -f supabase/seeds/seed_bytes.sql
```
Script: `supabase/apply_schema.sh`

### 2. DevAuthHandler / FeedController Auth Bug
**Cause:** `sub` claim is `"seed_alex"` (text) but controllers do `Guid.TryParse(supabaseUserId)` → false → Unauthorized.  
**Fix:** 
- Add `ICurrentUserService` that resolves User entity from `supabase_user_id` 
- Use it in all controllers instead of trying to parse supabase_user_id as UUID
- DevAuthHandler keeps returning `"seed_alex"` as sub (which IS the seed user's supabase_user_id)

### 3. POST /api/bytes 400 Error
**Two issues:**
1. Frontend sends `codeSnippet: { language, content }` (object) but backend expects `codeSnippet: string`
2. Frontend sends `type: "byte"` but constraint only allows `article | tutorial | snippet | discussion`

**Fix compose screen:** Send `codeSnippet` as plain string, default `type` to `"article"`

### 4. Feed Filter Broken
**Cause:** FeedController passes `sort` param but frontend sends `filter` (for_you/following/trending).  
**Fix:** Properly handle three modes in `GetFeedQueryHandler`.

---

## New Tables (in dependency order)

### Lookup Tables (no foreign keys to other new tables)
| Table | Columns |
|-------|---------|
| `seniority_types` | id uuid PK, name text UNIQUE, label text, icon text, sort_order int |
| `domains` | id uuid PK, name text UNIQUE, label text, icon text, sort_order int |
| `badge_types` | id uuid PK, name text UNIQUE, label text, icon text, description text |
| `level_types` | id uuid PK, level int UNIQUE, name text, label text, xp_required int, icon text |
| `search_types` | id uuid PK, name text UNIQUE, label text, description text |

### Relational Lookup Tables (depend on domains)
| Table | Columns |
|-------|---------|
| `tech_stacks` | id uuid PK, domain_id uuid FK domains, name text UNIQUE, label text, sort_order int |

### User junction tables (depend on users + tech_stacks)
| Table | Columns |
|-------|---------|
| `user_tech_stacks` | user_id FK, tech_stack_id FK, PRIMARY KEY(user_id, tech_stack_id) |
| `user_feed_preferences` | user_id FK, tech_stack_id FK, PRIMARY KEY(user_id, tech_stack_id) |

### Content tables
| Table | Columns |
|-------|---------|
| `interviews` | id, author_id FK, title, body, code_snippet, language, company, role, difficulty, like_count, comment_count, bookmark_count, view_count, type, created_at, updated_at |
| `interview_comments` | id, interview_id FK, author_id FK, parent_id FK, body, vote_count, created_at |
| `interview_reactions` | interview_id FK, user_id FK, type, created_at; PK(interview_id, user_id) |
| `interview_bookmarks` | interview_id FK, user_id FK, created_at; PK(interview_id, user_id) |

### Junction table for bytes tags
| Table | Columns |
|-------|---------|
| `byte_tags` | byte_id FK bytes, tech_stack_id FK tech_stacks; PK(byte_id, tech_stack_id) |

### Social/meta tables
| Table | Columns |
|-------|---------|
| `socials` | id uuid PK, user_id FK, platform text, url text, created_at |
| `trending` | id uuid PK, content_id uuid, content_type text (bytes/interviews), user_id FK nullable, clicked_at timestamptz |
| `logs` | id uuid PK, level text, message text, exception text, source text, user_id uuid nullable, created_at |
| `followers` | user_id FK, follower_id FK; PK(user_id, follower_id) |
| `following` | user_id FK, following_id FK; PK(user_id, following_id) |

### Schema additions to existing tables
| Table | Change |
|-------|--------|
| `users` | ADD domain_id uuid FK domains, ADD seniority_id uuid FK seniority_types, ADD level_type_id uuid FK level_types |
| `badges` | ADD badge_type_id uuid FK badge_types |

---

## New API Endpoints

### Lookup (GET /api/lookup/...)
- `GET /api/lookup/seniority-types` → `[{id, name, label, icon}]`
- `GET /api/lookup/domains` → `[{id, name, label, icon}]`
- `GET /api/lookup/tech-stacks?domainId=...` → `[{id, domainId, name, label}]`
- `GET /api/lookup/badge-types` → `[{id, name, label, icon}]`
- `GET /api/lookup/level-types` → `[{id, level, name, label, xpRequired}]`
- `GET /api/lookup/search-types` → `[{id, name, label}]`

### Interviews (GET/POST/PUT/DELETE /api/interviews/...)
Full CRUD + comments/reactions/bookmarks mirroring bytes endpoints.

### Socials
- `GET /api/users/{userId}/socials`
- `POST /api/socials`
- `DELETE /api/socials/{id}`

### Trending
- `POST /api/trending/click` → `{ contentId, contentType }`
- `GET /api/trending?limit=20` → paged list of trending bytes/interviews

### Search (updated)
- `GET /api/search?q=...&type=bytes|interviews|all&limit=20`

---

## Feed Algorithm Fix

| Mode | Logic |
|------|-------|
| `for_you` | Filter by user's `user_feed_preferences` tech stacks; rank by engagement score |
| `following` | Filter to bytes authored by users this user follows; rank by recency |
| `trending` | Join with `trending` table, count clicks in past 24h, rank by click count |

---

## Auto-tag Logic (ByteCreatedEvent)
After a byte is created, inspect title + body for keywords:
- Contains "interview", "leetcode", "system design", "behavioral" → move to `interviews` table
- Otherwise stays as `bytes`

This is implemented in `ByteCreatedEventHandler` via MediatR.

---

## UI Changes
| Screen | Change |
|--------|--------|
| Onboarding | Call GET /api/lookup/* instead of mock data |
| Compose | Send `codeSnippet` as string, `type: "article"` |
| Search | Add type selector: All / Bytes / Interviews |
| Feed | Pass correct `filter=for_you|following|trending` param |

---

## File Structure After Changes
```
supabase/
├── tables/          (all CREATE TABLE IF NOT EXISTS)
├── seeds/           (all seed data)
├── migrations/      (ALTER TABLE for schema changes)
└── apply_schema.sh  (one-shot script to apply everything)

Service/ByteAI.Core/
├── Entities/
│   ├── SeniorityType.cs, Domain.cs, TechStack.cs, BadgeType.cs, LevelType.cs
│   ├── SearchType.cs, Interview.cs, InterviewComment.cs, InterviewReaction.cs, InterviewBookmark.cs
│   ├── Social.cs, Trending.cs, Log.cs, UserTechStack.cs, UserFeedPreference.cs, ByteTag.cs
│   └── Configurations/ (one per entity)
├── Commands/
│   ├── Lookup/     (queries for all lookup tables)
│   ├── Interviews/ (full CRUD + comments/reactions/bookmarks)
│   ├── Trending/   (record click, get trending)
│   └── ...
├── Infrastructure/
│   └── Services/ICurrentUserService.cs + CurrentUserService.cs

Service/ByteAI.Api/
├── Controllers/
│   ├── LookupController.cs (new)
│   ├── InterviewsController.cs (new)
│   ├── SocialsController.cs (new)
│   ├── TrendingController.cs (new)
│   └── ... (existing, fixed)
├── ViewModels/
│   ├── LookupViewModels.cs (new)
│   └── InterviewViewModels.cs (new)

.claude/memory/
├── AIToDo.md (new)
└── authtodo.md (new)
```
