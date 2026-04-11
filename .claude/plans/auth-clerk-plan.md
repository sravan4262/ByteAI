# Clerk Auth Implementation Plan
**Goal:** Replace localStorage stub auth with real Clerk auth — Google OAuth + GitHub OAuth + Email OTP

---

## Pricing Reality Check
| Method | Free Tier |
|---|---|
| Google OAuth | Free, unlimited (up to 10,000 MAUs) |
| GitHub OAuth | Free, unlimited — all social providers included |
| Email OTP | Free, unlimited |

All three methods are 100% free on Clerk's free tier. No SMS, no per-message cost, no surprises.
Phone OTP excluded from scope — add later if needed (requires Twilio setup).

---

## Current State Snapshot
| File | What it does now | What it needs to do |
|---|---|---|
| `UI/hooks/use-auth.ts` | localStorage + cookies stub | Wrap Clerk `useAuth()` / `useUser()` |
| `UI/proxy.ts` | Cookie-based middleware | Clerk `authMiddleware()` |
| `UI/app/layout.tsx` | Bare layout | Wrapped in `<ClerkProvider>` |
| `UI/components/features/auth/login-form.tsx` | Calls mock `api.loginWithEmail/Phone/Google()` | Calls real Clerk sign-in flows |
| `UI/components/features/auth/signup-form.tsx` | Calls mock `api.signup()` | Calls real Clerk sign-up flows |
| `UI/components/layout/auth-guard.tsx` | Reads localStorage | Reads `useAuth().isSignedIn` from Clerk |
| `UI/lib/api/http.ts` | Reads token from localStorage | Calls `await getToken()` from Clerk |
| `Service/ByteAI.Api/Common/Auth/ClerkJwtExtensions.cs` | Dev bypass handler | Real Clerk JWT (already coded, just needs config) |
| `Service/ByteAI.Api/appsettings.json` | No Clerk config | Needs `Clerk:Authority` |
| No webhook endpoint exists | — | New: `POST /api/webhooks/clerk` → upsert users.users |

---

## Phase 1 — Clerk Dashboard (do this first, no code)

- [ ] Go to clerk.com → Create account → New Application → name it "ByteAI"
- [ ] Social connections → Enable **Google** (just a toggle, zero code)
- [ ] Social connections → Enable **GitHub** (just a toggle, zero code)
- [ ] User & Authentication → Email, Phone, Username → Enable **Email address** + **Email verification code** (OTP, not magic link)
- [ ] Copy from dashboard → API Keys:
  - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` (starts with `pk_`)
  - `CLERK_SECRET_KEY` (starts with `sk_`)
- [ ] Copy from dashboard → API Keys → Advanced → **JWT Issuer** URL (looks like `https://xxx.clerk.accounts.dev`) — this goes into the backend

---

## Phase 2 — Frontend: Install & Bootstrap

### 2.1 Install package
```bash
cd UI && pnpm add @clerk/nextjs
```

### 2.2 Add env vars to `UI/.env.local`
```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxx
CLERK_SECRET_KEY=sk_test_xxx

# These tell Clerk where to redirect
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/feed
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/onboarding
```

### 2.3 Wrap `UI/app/layout.tsx` in `<ClerkProvider>`
```tsx
import { ClerkProvider } from '@clerk/nextjs'

export default function RootLayout({ children }) {
  return (
    <ClerkProvider>
      <html lang="en" className="dark h-full">
        <body ...>
          {children}
        </body>
      </html>
    </ClerkProvider>
  )
}
```

### 2.4 Replace `UI/proxy.ts` with Clerk middleware
Clerk provides `clerkMiddleware` that handles auth cookie validation automatically.
```ts
// UI/middleware.ts  (rename proxy.ts → middleware.ts)
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

const isProtectedRoute = createRouteMatcher([
  '/feed(.*)', '/interviews(.*)', '/search(.*)',
  '/compose(.*)', '/profile(.*)', '/post(.*)',
])

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) await auth.protect()
})

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
```
> Note: file must be named `middleware.ts` at the root of `UI/` — Next.js requires this exact name.

### 2.5 Create OAuth callback route
Clerk needs a landing page after Google redirects back to your app.
```
UI/app/sso-callback/page.tsx
```
```tsx
import { AuthenticateWithRedirectCallback } from '@clerk/nextjs'

export default function SSOCallbackPage() {
  return <AuthenticateWithRedirectCallback />
}
```

---

## Phase 3 — Frontend: Replace `use-auth.ts`

The current hook manages `isAuthenticated` + `isOnboarded` in localStorage.
Replace it entirely with Clerk state:

```ts
// UI/hooks/use-auth.ts
"use client"
import { useAuth as useClerkAuth, useUser } from '@clerk/nextjs'
import { useCallback } from 'react'
import { useRouter } from 'next/navigation'

export function useAuth() {
  const { isSignedIn, isLoaded, signOut, getToken } = useClerkAuth()
  const { user } = useUser()
  const router = useRouter()

  const logout = useCallback(async () => {
    await signOut()
    router.push('/')
  }, [signOut, router])

  return {
    auth: {
      isAuthenticated: isSignedIn ?? false,
      isLoaded,
      // check Clerk public metadata for onboarding flag
      isOnboarded: (user?.publicMetadata?.onboarded as boolean) ?? false,
    },
    getToken,  // use this in http.ts
    logout,
    user,
  }
}
```

> The `isOnboarded` flag gets written to Clerk's `publicMetadata` via your backend webhook after user completes onboarding. Alternatively store it in your own `users.users` table and check via API.

---

## Phase 4 — Frontend: Wire Auth Screen to Clerk

This is the most involved part. Clerk sign-in/sign-up are multi-step flows.

### The OTP problem
Currently the forms have: enter email/phone → click button → done.
With Clerk, after sending the OTP you need a **second step**: show an OTP input field.

Each form needs a new state:
```
'input'  → user enters email or phone
'verify' → user enters the 6-digit OTP code
```

### 4.1 Wire `login-form.tsx`

Remove the phone toggle entirely. Simplify to: Google button | GitHub button | Email OTP form.

**Google button:**
```ts
import { useSignIn } from '@clerk/nextjs'
const { signIn } = useSignIn()

await signIn.authenticateWithRedirect({
  strategy: 'oauth_google',
  redirectUrl: '/sso-callback',
  redirectUrlComplete: '/feed',
})
```

**GitHub button:**
```ts
await signIn.authenticateWithRedirect({
  strategy: 'oauth_github',
  redirectUrl: '/sso-callback',
  redirectUrlComplete: '/feed',
})
```

**Email OTP — step 1 (send code):**
```ts
await signIn.create({ strategy: 'email_code', identifier: email })
setStep('verify')  // show OTP input
```

**Email OTP — step 2 (verify):**
```ts
const result = await signIn.attemptFirstFactor({ strategy: 'email_code', code: otpValue })
if (result.status === 'complete') router.push('/feed')
```

### 4.2 Wire `signup-form.tsx`

Remove phone method. Signup methods: Google | GitHub | Email OTP.

**Google signup:**
```ts
import { useSignUp } from '@clerk/nextjs'
const { signUp } = useSignUp()

await signUp.authenticateWithRedirect({
  strategy: 'oauth_google',
  redirectUrl: '/sso-callback',
  redirectUrlComplete: '/onboarding',
})
```

**GitHub signup:**
```ts
await signUp.authenticateWithRedirect({
  strategy: 'oauth_github',
  redirectUrl: '/sso-callback',
  redirectUrlComplete: '/onboarding',
})
```

**Email OTP signup — step 1:**
```ts
await signUp.create({ firstName, lastName, emailAddress: email, username })
await signUp.prepareEmailAddressVerification({ strategy: 'email_code' })
setStep('verify')
```

**Email OTP signup — step 2:**
```ts
const result = await signUp.attemptEmailAddressVerification({ code: otpValue })
if (result.status === 'complete') router.push('/onboarding')
```

### 4.3 New OTP input UI (add to both forms)
When `step === 'verify'`, replace the form with:
```tsx
<div className="flex flex-col gap-3">
  <p className="font-mono text-[10px] text-[var(--t2)]">
    // ENTER THE 6-DIGIT CODE
  </p>
  <input
    type="text"
    inputMode="numeric"
    maxLength={6}
    value={otpValue}
    onChange={e => setOtpValue(e.target.value)}
    placeholder="000000"
    className={inputClass}
  />
  <button onClick={handleVerify}>VERIFY →</button>
  <button onClick={() => setStep('input')}>← BACK</button>
</div>
```

---

## Phase 5 — Frontend: Update `auth-guard.tsx` and `http.ts`

### 5.1 `auth-guard.tsx`
```tsx
import { useAuth } from '@clerk/nextjs'

export function AuthGuard({ children }) {
  const { isSignedIn, isLoaded } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (isLoaded && !isSignedIn) router.replace('/')
  }, [isLoaded, isSignedIn, router])

  if (!isLoaded || !isSignedIn) return null
  return <>{children}</>
}
```

### 5.2 `http.ts` — inject Clerk token
The http client needs to call `getToken()` before each request.
Since `getToken` is a React hook, pass it in or use a module-level setter:

```ts
// UI/lib/api/http.ts
let getTokenFn: (() => Promise<string | null>) | null = null

export function setTokenProvider(fn: () => Promise<string | null>) {
  getTokenFn = fn
}

export async function fetchWithAuth(url: string, options?: RequestInit) {
  const token = getTokenFn ? await getTokenFn() : null
  return fetch(`${process.env.NEXT_PUBLIC_API_URL}${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  })
}
```

Then in a top-level component (e.g., `app/(app)/layout.tsx`):
```tsx
const { getToken } = useAuth()
useEffect(() => { setTokenProvider(getToken) }, [getToken])
```

---

## Phase 6 — Backend: Configure Clerk JWT

### 6.1 Add to `Service/ByteAI.Api/appsettings.json`
```json
{
  "Clerk": {
    "Authority": "https://xxx.clerk.accounts.dev",
    "WebhookSecret": ""
  }
}
```
`Authority` = the JWT Issuer URL from Clerk dashboard.
`WebhookSecret` = from Clerk dashboard → Webhooks → your endpoint → Signing Secret.

Both secrets should be in env vars / Azure Key Vault in production, not hardcoded.

### 6.2 Production JWT validation
`ClerkJwtExtensions.cs` production path is already correct — it validates RS256 via JWKS discovery from the Authority URL. No code change needed, just supply the real config.

### 6.3 Dev bypass
`DevAuthHandler` hardcodes `sub: "seed_alex"` — keep this for local dev so you don't need Clerk configured to run the backend. It activates when `ASPNETCORE_ENVIRONMENT=Development`.

---

## Phase 7 — Backend: Clerk Webhook

When a user signs up, Clerk fires `user.created` to a URL you register. Your backend receives it and upserts `users.users` so the app has a profile row.

### 7.1 Install Svix (webhook signature validation)
```bash
cd Service && dotnet add ByteAI.Api/ByteAI.Api.csproj package Svix
```

### 7.2 Register webhook in Clerk dashboard
- Clerk Dashboard → Webhooks → Add Endpoint
- URL: `https://your-production-domain.com/api/webhooks/clerk`
- Events: `user.created`, `user.updated`
- Copy the **Signing Secret** → put in `Clerk:WebhookSecret`

### 7.3 Create webhook controller
New file: `Service/ByteAI.Api/Features/Auth/ClerkWebhookController.cs`

```csharp
// POST /api/webhooks/clerk
// 1. Validate svix signature
// 2. Parse event type
// 3. user.created  → INSERT INTO users.users (clerk_id, display_name, avatar_url, username)
//                    ON CONFLICT (clerk_id) DO NOTHING
// 4. user.updated  → UPDATE users.users SET display_name, avatar_url WHERE clerk_id = x

[ApiController]
[Route("api/webhooks")]
public class ClerkWebhookController(AppDbContext db, IConfiguration config, ILogger<ClerkWebhookController> logger)
    : ControllerBase
{
    [HttpPost("clerk")]
    [AllowAnonymous]
    public async Task<IActionResult> Handle()
    {
        var webhookSecret = config["Clerk:WebhookSecret"]
            ?? throw new InvalidOperationException("Clerk:WebhookSecret not configured");

        // Read raw body (svix needs it for HMAC verification)
        var body = await new StreamReader(Request.Body).ReadToEndAsync();

        // Validate svix signature
        var wh = new Webhook(webhookSecret);
        try
        {
            wh.Verify(body, Request.Headers.ToDictionary(h => h.Key, h => h.Value.ToString()));
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Clerk webhook signature validation failed");
            return Unauthorized();
        }

        // Parse payload
        var payload = JsonSerializer.Deserialize<JsonElement>(body);
        var eventType = payload.GetProperty("type").GetString();
        var data = payload.GetProperty("data");

        var clerkId    = data.GetProperty("id").GetString()!;
        var firstName  = data.TryGetProperty("first_name", out var fn) ? fn.GetString() : null;
        var lastName   = data.TryGetProperty("last_name", out var ln) ? ln.GetString() : null;
        var avatarUrl  = data.TryGetProperty("image_url", out var img) ? img.GetString() : null;
        var displayName = $"{firstName} {lastName}".Trim();
        if (string.IsNullOrWhiteSpace(displayName)) displayName = "New User";

        // Derive a username from email or phone (user can change it later in onboarding)
        var email = data.TryGetProperty("email_addresses", out var emails) && emails.GetArrayLength() > 0
            ? emails[0].GetProperty("email_address").GetString()
            : null;
        var username = email != null
            ? Regex.Replace(email.Split('@')[0].ToLower(), "[^a-z0-9_]", "_")
            : $"user_{clerkId[..8]}";

        if (eventType == "user.created")
        {
            await db.Database.ExecuteSqlInterpolatedAsync($"""
                INSERT INTO users.users (clerk_id, display_name, avatar_url, username)
                VALUES ({clerkId}, {displayName}, {avatarUrl}, {username})
                ON CONFLICT (clerk_id) DO NOTHING
                """);
        }
        else if (eventType == "user.updated")
        {
            await db.Database.ExecuteSqlInterpolatedAsync($"""
                UPDATE users.users
                SET display_name = {displayName},
                    avatar_url   = {avatarUrl},
                    updated_at   = now()
                WHERE clerk_id = {clerkId}
                """);
        }

        return Ok();
    }
}
```

---

## Phase 8 — End-to-End Test Checklist

- [ ] Sign up with Google → lands on `/onboarding` → row in `users.users`
- [ ] Sign up with GitHub → separate row in `users.users`
- [ ] Sign up with Email OTP → enters email → receives code → enters code → `/onboarding`
- [ ] Sign in with existing Google account → lands on `/feed`
- [ ] Sign in with existing GitHub account → lands on `/feed`
- [ ] Sign in with Email OTP → lands on `/feed`
- [ ] Feed API call includes real Clerk JWT → backend validates → returns real data
- [ ] Sign out → redirected to `/`
- [ ] Refresh feed page while signed in → stays on feed (Clerk session persists)
- [ ] Open app in incognito → redirected to `/`

---

## Files Changed / Created Summary

| Action | File |
|---|---|
| Modified | `UI/app/layout.tsx` — add ClerkProvider |
| Renamed + modified | `UI/proxy.ts` → `UI/middleware.ts` — Clerk middleware |
| Modified | `UI/hooks/use-auth.ts` — replace localStorage with Clerk hooks |
| Modified | `UI/components/features/auth/login-form.tsx` — real Clerk flows + OTP step |
| Modified | `UI/components/features/auth/signup-form.tsx` — real Clerk flows + OTP step |
| Modified | `UI/components/layout/auth-guard.tsx` — use Clerk useAuth() |
| Modified | `UI/lib/api/http.ts` — token from Clerk getToken() |
| Created | `UI/app/sso-callback/page.tsx` — OAuth redirect landing |
| Modified | `UI/app/(app)/layout.tsx` — wire token provider |
| Modified | `Service/ByteAI.Api/appsettings.json` — add Clerk:Authority |
| Created | `Service/ByteAI.Api/Features/Auth/ClerkWebhookController.cs` |
| Added package | `Svix` NuGet to ByteAI.Api |

**DB: No changes.** `users.users.clerk_id` already exists.
