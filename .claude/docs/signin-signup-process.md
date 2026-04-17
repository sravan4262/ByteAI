# Sign In / Sign Up / Sign Out — Process

> **Live document.** Update this file whenever auth flow, Supabase config, webhook handling, or session logic changes.

---

## Tools Involved

| Tool | Why |
|---|---|
| **Supabase Auth** | Identity provider — handles credential collection, magic link, Google OAuth, OTP |
| **Supabase Webhooks** | Fires `auth.users` row changes → API provisions `users.users` record |
| **JWT (Bearer)** | Stateless session token issued by Supabase, validated by the API on every request |
| **PostgreSQL** | Stores user records, roles |
| **MediatR** | Fires `BadgeTrigger.UserRegistered` event after first registration |

---

## Sign Up — First-Time Registration

### Flow

```
User submits credentials (magic link / Google / Phone OTP)
  └── Supabase Auth handles auth (no app code)
        └── Supabase emits webhook: auth.users INSERT
              └── POST /api/webhooks/auth (Supabase webhook)
                    ├── Signature verified
                    ├── Event parsed: supabaseUserId, displayName, avatarUrl, email
                    └── IUsersBusiness.ProvisionUserAsync()
                          └── UserService.ProvisionAsync()
                                ├── Lookup by SupabaseUserId → not found
                                ├── Generate unique username from displayName
                                ├── INSERT users (SupabaseUserId, Username, DisplayName, AvatarUrl)
                                ├── Assign default "user" role → INSERT user_roles
                                ├── Hardcoded admin check: if email == admin email → INSERT user_roles (admin)
                                └── BadgeService.CheckAndAwardAsync(BadgeTrigger.UserRegistered)
```

### Tables Touched

| Table | Operation | Why |
|---|---|---|
| `users` | INSERT | Create user record |
| `user_roles` | INSERT | Assign default "user" role (+ "admin" if email matches) |
| `role_types` | SELECT | Resolve role name → id |
| `user_badges` | INSERT (conditional) | Award `early_adopter` or `first_byte` badge on registration |

### After Registration

- User is redirected to `/onboarding` (enforced by middleware)
- No InterestEmbedding yet, no UserTechStacks yet
- Feed falls back to recency until onboarding completes

---

## Sign In — Returning User

### Flow

```
User signs in via Supabase Auth
  └── Supabase issues JWT (access_token)
        └── Frontend stores session via supabase.auth.onAuthStateChange()
              └── getToken() returns session.access_token
                    └── Authorization: Bearer <token> on every API request
```

> **Note:** Profile changes sync via the Supabase webhook. Normal sign-ins do NOT re-trigger provisioning — the JWT is sufficient.

---

## Session Management

### How it works

```
Frontend (Next.js + @supabase/supabase-js)
  └── supabase.auth.getSession() / onAuthStateChange() → session.access_token
        └── Authorization: Bearer <token> on every API request
              └── ASP.NET Core JWT middleware
                    ├── Validates against Supabase JWT secret (HS256)
                    ├── MapInboundClaims = false (preserves "sub" as supabaseUserId)
                    └── ICurrentUserService.GetCurrentUserId()
                          └── Maps "sub" (supabaseUserId) → users.Id (GUID) via DB lookup
```

**Files:**
- `Service/ByteAI.Api/Common/Auth/SupabaseJwtExtensions.cs` — JWT bearer config
- `Service/ByteAI.Core/Services/Users/CurrentUserService.cs` — supabaseUserId → GUID resolution

### Key config

```csharp
// NameClaimType = "sub" so User.Identity.Name == supabaseUserId (auth.users.id UUID)
// JWT validated: HS256, Supabase:JwtSecret from appsettings
```

---

## Sign Out

### Flow

```
User clicks sign out in frontend
  └── supabase.auth.signOut() — revokes session on Supabase side
        └── Frontend clears cookie, session storage, MeCache
              └── Router redirects to "/"
```

> Regular sign-out does NOT trigger a webhook. The JWT simply expires and the user is redirected to `/`. No server-side session state to invalidate.

---

## Middleware Route Protection

**File:** `UI/middleware.ts`

| Route | Rule |
|---|---|
| `/onboarding` | Must be signed in |
| `/feed`, `/search`, etc. | Must be signed in AND onboarded (`byteai_onboarded` cookie set) |
| `/` | Public |
| `POST /api/webhooks/auth` | No auth — Supabase signature only |
| All other API routes | `[Authorize]` — valid JWT required |

---

## Admin Role Assignment

- Hardcoded in `UserService.ProvisionAsync()`: if registered email matches admin email → assign both "user" + "admin" roles
- No UI for promoting other users to admin (manual DB or future admin endpoint)
