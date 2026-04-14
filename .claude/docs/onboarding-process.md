# Onboarding — Process

> **Live document.** Update this file whenever onboarding steps, APIs, or data saved during onboarding change.

---

## Overview

Onboarding runs once after first registration. Middleware redirects any signed-in, non-onboarded user to `/onboarding`. Completion sets the `byteai_onboarded` cookie and redirects to `/feed`.

---

## Steps

### Step 1 — Seniority Selection

- **UI:** 2-column grid of seniority levels with icons
- **Data source:** `GET /api/lookup/seniority-types` → `lookups.seniority_types`
- **State saved:** locally in form state; not persisted until final submission

### Step 2 — Domain Selection

- **UI:** 2-column grid of tech domains with icons
- **Data source:** `GET /api/lookup/domains` → `lookups.domains`
- **State saved:** locally; also drives Step 3 filtering

### Step 3 — Tech Stack Selection

- **UI:** searchable multi-select list, max 6 items
- **Data source:** `GET /api/lookup/tech-stacks?domainId={selectedDomainId}` → `lookups.tech_stacks` filtered by subdomain's domain
- **State saved:** locally

### Step 4 — Profile Details (optional)

- **Fields:** Bio (280 char), Company, Role Title
- **State saved:** locally

### Step 5 — Review & Submit

- Summary of all selections → user confirms → single API call

---

## Submission

**Endpoint:** `PUT /api/users/me/profile` `[Authorize]`

**Payload:**
```json
{
  "displayName": "Sravan Ravula",
  "bio": "Building things...",
  "company": "ByteAI",
  "roleTitle": "Sr. Engineer",
  "seniority": "Senior",
  "domain": "Web Development",
  "techStack": ["React", "TypeScript", "PostgreSQL"]
}
```

### What happens server-side

**File:** `Service/ByteAI.Core/Services/Users/UserService.cs` → `UpdateMyProfileAsync()`

```
UPDATE users SET displayName, bio, company, roleTitle, seniority, domain, updatedAt

DELETE FROM user_tech_stacks WHERE userId = me
INSERT INTO user_tech_stacks (userId, techStackId) — matched by stack name
```

### Tables Touched

| Table | Operation | Why |
|---|---|---|
| `users` | UPDATE | Save profile fields |
| `user_tech_stacks` | DELETE + INSERT | Replace selected tech stacks |
| `tech_stacks` | SELECT | Resolve stack names → IDs |

---

## After Onboarding

- `byteai_onboarded` cookie set on client
- User redirected to `/feed`
- `InterestEmbedding` is still null — For You feed falls back to recency until the user engages with bytes
- `UserTechStacks` is now populated — used as soft boost in For You feed ranking

---

## Lookup APIs (read-only, no auth needed)

| Endpoint | Table | Used in step |
|---|---|---|
| `GET /api/lookup/seniority-types` | `lookups.seniority_types` | Step 1 |
| `GET /api/lookup/domains` | `lookups.domains` | Step 2 |
| `GET /api/lookup/tech-stacks?domainId=` | `lookups.tech_stacks` | Step 3 |
