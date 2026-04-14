# Sign In / Sign Up / Sign Out — Process

> **Live document.** Update this file whenever auth flow, Clerk config, webhook handling, or session logic changes.

---

## Tools Involved

| Tool | Why |
|---|---|
| **Clerk** | Identity provider — handles credential collection, magic link, OAuth, OTP |
| **Svix** | Webhook delivery + signature verification for Clerk events |
| **JWT (Bearer)** | Stateless session token issued by Clerk, validated by the API on every request |
| **PostgreSQL** | Stores user records, roles |
| **MediatR** | Fires `BadgeTrigger.UserRegistered` event after first registration |

---

## Sign Up — First-Time Registration

### Flow

```
User submits credentials (magic link / Google / Facebook / Phone OTP)
  └── Clerk handles auth (no app code)
        └── Clerk emits webhook: user.created
              └── POST /api/webhooks/clerk
                    ├── Svix signature verified
                    ├── Event parsed: clerkId, displayName, avatarUrl, email
                    └── IUsersBusiness.SyncClerkUserAsync()
                          └── UserService.UpsertByClerkAsync()
                                ├── Lookup by ClerkId → not found
                                ├── Generate unique username from displayName
                                ├── INSERT users (ClerkId, Username, DisplayName, AvatarUrl)
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
User signs in via Clerk
  └── Clerk emits webhook: user.updated (on profile changes)
        └── POST /api/webhooks/clerk
              └── UserService.UpsertByClerkAsync()
                    ├── Lookup by ClerkId → found
                    ├── UPDATE users: DisplayName, AvatarUrl, UpdatedAt
                    └── Return (user, wasCreated=false)
```

> **Note:** The `user.updated` webhook fires only on Clerk-side profile changes (name, avatar). Normal sign-ins do NOT re-trigger a webhook — the JWT is sufficient.

---

## Session Management

### How it works

```
Frontend (Next.js + @clerk/nextjs)
  └── getToken() → Clerk-issued JWT
        └── Authorization: Bearer <token> on every API request
              └── ASP.NET Core JWT middleware
                    ├── Validates against Clerk JWKS endpoint (issuer, lifetime, signature)
                    ├── MapInboundClaims = false (preserves "sub" as ClerkId)
                    └── ICurrentUserService.GetCurrentUserId()
                          └── Maps "sub" (ClerkId) → users.Id (GUID) via DB lookup
```

**Files:**
- `Service/ByteAI.Api/Common/Auth/ClerkJwtExtensions.cs` — JWT bearer config
- `Service/ByteAI.Core/Services/Users/CurrentUserService.cs` — ClerkId → GUID resolution

### Key config

```csharp
// NameClaimType = "sub" so User.Identity.Name == ClerkId
// JWT validated: issuer, audience, signing keys (JWKS auto-fetched from Clerk)
```

---

## Sign Out

### Flow

```
User clicks sign out in frontend
  └── Clerk.signOut() — revokes session on Clerk side
        └── (Optional) Clerk emits user.deleted webhook if user deletes account
              └── POST /api/webhooks/clerk
                    └── IUsersBusiness.DeleteClerkUserAsync(clerkId)
                          └── Soft-delete or hard-delete from users table
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
| `POST /api/webhooks/clerk` | No auth — Svix signature only |
| All other API routes | `[Authorize]` — valid JWT required |

---

## Admin Role Assignment

- Hardcoded in `UserService.UpsertByClerkAsync()`: if registered email matches admin email → assign both "user" + "admin" roles
- No UI for promoting other users to admin (manual DB or future admin endpoint)
