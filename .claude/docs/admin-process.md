# Admin — Process (RBAC + Feature Flags)

> **Live document.** Update this file whenever roles, feature flags, admin endpoints, or real-time FF polling logic changes.

---

## Screen: Admin

Admin page is only accessible to users with the `admin` role. All endpoints below require `[RequireRole("admin")]`.

---

## RBAC — How Roles Work

### Role Types

Stored in `lookups.role_types`:

| Name | Label | Purpose |
|---|---|---|
| `user` | User | Default role, every registered user gets this |
| `admin` | Admin | Full access to admin panel |

### How roles are assigned

**On registration** (`UserService.ProvisionAsync()`):

```
1. INSERT user_roles (userId, roleTypeId=user, assignedAt=now)
2. If registering email == hardcoded admin email:
   INSERT user_roles (userId, roleTypeId=admin, assignedAt=now)
```

> Admin role assignment is currently hardcoded by email. There is no UI to promote other users to admin.

### How role is enforced

**File:** `Service/ByteAI.Api/Common/Auth/RequireRoleAttribute.cs`

Applied to controllers as `[RequireRole("admin")]`:
```
Request arrives with JWT
  └── CurrentUserService resolves supabaseUserId → userId
        └── UserRole query: SELECT * FROM user_roles WHERE userId = me AND roleTypeId = admin
              └── Not found → 403 Forbidden
```

### Tables

| Table | Purpose |
|---|---|
| `lookups.role_types` | Role definitions (id, name, label, description) |
| `users.user_roles` | Junction: userId → roleTypeId, assignedAt |

---

## Feature Flags — How They Work

Feature flags control access to AI features and experimental UI. Two dimensions:
- **Global** (`GlobalOpen = true`) — everyone gets the flag
- **Per-user** — specific users get the flag regardless of global state

### FeatureFlagType Entity

```csharp
public sealed class FeatureFlagType
{
  Guid Id
  string Key         // "ai-search-ask", "ai-format-code", "reach-estimate"
  string Name        // human-readable label
  string? Description
  bool GlobalOpen    // true = all users; false = per-user only
  DateTime CreatedAt
  DateTime UpdatedAt
}
```

### Known Flags

| Key | Feature | Status |
|---|---|---|
| `ai-search-ask` | Search Ask RAG — semantic retrieval + Groq answer | Active |
| `ai-format-code` | Code formatting in composer via Groq | Active |
| ~~`ai-suggest-tags`~~ | ~~Auto-tag suggestion in post composer~~ | **Removed** — endpoint deleted; auto-tagging is now backend-only via `ByteCreatedEventHandler` |

---

## Admin Operations

**File:** `Service/ByteAI.Core/Services/FeatureFlags/FeatureFlagService.cs`

### Create / Update a flag

**Endpoint:** `POST /api/admin/feature-flags` `[RequireRole("admin")]`

```json
{
  "key": "ai-search-ask",
  "name": "AI Search & Answer",
  "description": "Semantic search + RAG powered answers using Groq",
  "globalOpen": false
}
```

- Upserts `feature_flag_types` by `key`
- If key exists: update name/description/globalOpen
- If new: INSERT

### Toggle global state

**Endpoint:** `PUT /api/admin/feature-flags/{key}` `[RequireRole("admin")]`

```json
{ "globalOpen": true }
```

- Flips `feature_flag_types.global_open`
- Immediately affects all users — next poll picks it up

### Assign flag to a user

**Endpoint:** `POST /api/admin/feature-flags/{key}/users/{userId}` `[RequireRole("admin")]`

```
INSERT user_feature_flags (userId, featureFlagTypeId)
```

### Remove flag from a user

**Endpoint:** `DELETE /api/admin/feature-flags/{key}/users/{userId}` `[RequireRole("admin")]`

```
DELETE FROM user_feature_flags WHERE userId = ? AND featureFlagTypeId = ?
```

### List all flags

**Endpoint:** `GET /api/admin/feature-flags` `[RequireRole("admin")]`

Returns all `feature_flag_types` with their `GlobalOpen` state.

### List flags for a user

**Endpoint:** `GET /api/admin/feature-flags/users/{userId}` `[RequireRole("admin")]`

---

## How Flags Are Checked (User Side)

### Endpoint

`GET /api/feature-flags/me` `[Authorize]`

**Query:**
```sql
SELECT fft.key FROM feature_flag_types fft
WHERE fft.global_open = true
   OR EXISTS (
     SELECT 1 FROM user_feature_flags uff
     WHERE uff.user_id = {currentUserId}
       AND uff.feature_flag_type_id = fft.id
   )
```

Returns: `["ai-search-ask", "ai-format-code"]` — list of enabled keys for the current user.

### Enforcement on API endpoints

```csharp
[RequireFeatureFlag("ai-search-ask")]
```

Applied to AI endpoints. Checks the same union query before allowing the request through. Returns 403 if not enabled.

---

## Groq Model Rotation & Quota Management

**File:** `Service/ByteAI.Core/Services/AI/GroqLoadBalancer.cs` — registered as singleton

### Two models in rotation

| Model | RPM | RPD | Role |
|---|---|---|---|
| `llama-3.3-70b-versatile` | 30 | 1K | Primary — always preferred, higher quality |
| `llama-3.1-8b-instant` | 30 | 14.4K | Secondary — fallback, higher daily quota |

### How rotation works (reactive only — no proactive counting)

```
Every Groq call:
  → always try Primary first

  Got 429 per_minute?
    → switch to Secondary for this retry (transient, no state saved)
    → if Secondary also 429 per_minute → drop request (both RPM-blocked, don't block thread 60s)

  Got 429 per_day?
    → mark Primary as RPD-exhausted (state saved in GroqLoadBalancer singleton)
    → retry with Secondary
    → if Secondary also 429 per_day → both exhausted:
        1. Mark IsAvailable = false
        2. Bulk set GlobalOpen = false on all AI feature flags
        3. Log error
        → all subsequent AI calls return null immediately until UTC midnight

  UTC midnight (detected lazily on next IsAvailable check):
    → reset both RPD flags
    → bulk set GlobalOpen = true on all AI feature flags
    → normal service resumes
```

### What happens to users when quota is exhausted

- `RequireFeatureFlagAttribute` checks `GroqLoadBalancer.IsAvailable` **before** the FF check
- Returns **503 Service Unavailable** with message: `"AI features are unavailable — daily quota exhausted. Resets at UTC midnight."`
- Clear message instead of a silent empty response
- Feature flags are also set to `GlobalOpen = false` → frontend polling hides AI buttons automatically

### Auto FF disable/restore

Triggered by `GroqLoadBalancer` internally — no manual admin action needed:

| Event | Action |
|---|---|
| Both models RPD-exhausted | `UPDATE feature_flag_types SET global_open = false WHERE key IN (ai-search-ask, ai-format-code)` |
| New UTC day detected | `UPDATE feature_flag_types SET global_open = true WHERE key IN (...)` |

---

## Real-Time Flag Updates — Polling

There is no server-push (no WebSocket, no SSE). The frontend polls:

```
Frontend: every N seconds → GET /api/feature-flags/me
  └── Compare with cached flag list
        └── If changed → update UI (show/hide AI buttons)
```

- **Polling interval:** configured in frontend (e.g. 30s or 60s)
- **Effect:** flag toggle in admin → propagates to all users within one poll interval
- **Why polling:** simple, no infrastructure overhead for MVP; upgrade to SSE/WebSocket later if needed

### Tables

| Table | Purpose |
|---|---|
| `lookups.feature_flag_types` | Flag definitions: key, globalOpen |
| `users.user_feature_flags` | Per-user flag assignments: userId → featureFlagTypeId |
