# Profile — Process

> **Live document.** Update this file whenever profile APIs, follow/unfollow, badge logic, XP/level, or social links change.

---

## Screen: Profile

The profile screen shows a public or private view of a user. The authenticated owner sees an edit button; visitors see a follow button.

---

## Tab: Overview (Main Profile)

### Fetch profile

**Own profile:**
`GET /api/users/me` `[Authorize]`

**Other user (by GUID):**
`GET /api/users/{userId}`

**Other user (by username):**
`GET /api/users/username/{username}`

**Response:**
```csharp
UserResponse(
  Guid Id, string Username, string DisplayName, string? Bio,
  string? RoleTitle, string? Company, string? AvatarUrl,
  int Level, int Xp, string? Domain, string? Seniority,
  bool IsVerified, DateTime CreatedAt,
  int BytesCount, int FollowersCount, int FollowingCount,
  bool? IsFollowedByMe   // null if anonymous, bool if logged in
)
```

**Tables queried:**

| Table | Why |
|---|---|
| `users` | Core profile fields |
| `bytes` | COUNT for BytesCount |
| `user_followers` | COUNT for FollowersCount |
| `user_followings` | COUNT for FollowingCount |
| `user_followings` | IsFollowedByMe check |

### What's rendered

- Avatar (Supabase user metadata avatar URL, or gradient initials fallback)
- Display name, @username
- Bio (up to 280 chars)
- Role title + Company ("Sr. Engineer @ ByteAI")
- Seniority level badge
- Domain tag
- Tech stack chips (from `user_tech_stacks`)
- Social links (GitHub, LinkedIn, X, etc.)
- XP / Level progress bar
- Verified badge (if `IsVerified = true`)
- Stats row: N bytes · N followers · N following

### Visibility

If `user_preferences.visibility = 'private'` and requester is not the owner:
- Profile card still shows
- Bytes tab returns empty

---

## Tab: Bytes (User's Posts)

**Endpoint:** `GET /api/users/{userId}/bytes?page=1&pageSize=20`

- Returns bytes by this user, `IsActive = true`
- Respects `visibility = private` (returns empty if private + not owner)
- Ordered by `CreatedAt DESC`

**Tables:** `bytes`, `byte_tech_stacks`, `user_likes`, `comments`

---

## Tab: Interviews

**Endpoint:** `GET /api/interviews?authorId={userId}&page=1`

- Same filter as interviews feed but scoped to this user

---

## Tab: Bookmarks (own profile only)

**Endpoint:** `GET /api/me/bookmarks` `[Authorize]`

- Returns bytes the authenticated user has saved
- **Table:** `user_bookmarks` JOIN `bytes`

---

## Tab: Badges

**Endpoint:** Embedded in profile response or `GET /api/users/{userId}/badges`

**Badge types** (defined in `lookups.badge_types`):

| Key | Trigger |
|---|---|
| `first_byte` | First byte posted |
| `byte_streak_7` | 7-day posting streak |
| `byte_streak_30` | 30-day posting streak |
| `reactions_100` | 100 reactions received |
| `followers_100` | 100 followers |
| `followers_1k` | 1000 followers |
| `mentor` | (manual or criteria TBD) |
| `early_adopter` | Registered early |

**Display:** Earned badges show with icon. Locked badges shown greyed out with lock icon. Click → celebration modal with badge description.

**Tables:**
| Table | Purpose |
|---|---|
| `lookups.badge_types` | All possible badges (id, name, key, description, iconUrl) |
| `users.user_badges` | Earned badges (userId, badgeTypeId, awardedAt) |

---

## Edit Profile

**Endpoint:** `PUT /api/users/me/profile` `[Authorize]`

```json
{
  "displayName": "Sravan Ravula",
  "bio": "Building ByteAI...",
  "company": "ByteAI",
  "roleTitle": "Founder",
  "seniority": "Senior",
  "domain": "Web Development",
  "techStack": ["React", "TypeScript", "PostgreSQL", "C#"]
}
```

**What happens:**
```
UPDATE users SET displayName, bio, company, roleTitle, seniority, domain, updatedAt
DELETE FROM user_tech_stacks WHERE userId = me
INSERT INTO user_tech_stacks (userId, techStackId) — resolved by stack name
```

---

## Social Links

**Get:** `GET /api/users/me/socials` `[Authorize]`

**Update:** `PUT /api/users/me/socials` `[Authorize]`

```json
{
  "socials": [
    { "platform": "github", "url": "https://github.com/user" },
    { "platform": "linkedin", "url": "https://linkedin.com/in/user" },
    { "platform": "twitter", "url": "https://twitter.com/user", "label": "X" }
  ]
}
```

**Table:** `socials` (userId, platform, url, label, createdAt) — full replace on update

---

## Follow / Unfollow

**Follow:** `POST /api/users/{userId}/follow` `[Authorize]`

**Unfollow:** `DELETE /api/users/{userId}/follow` `[Authorize]`

```
INSERT / DELETE user_followings (userId=me, followingId=target)
```

Side effects:
- Follower count on target's profile updates on next fetch
- Target's followers feed now includes my bytes (Following tab)
- No notification implemented yet (notification table exists but delivery TBD)

---

## Preferences

**Get:** `GET /api/users/me/preferences` `[Authorize]`

**Update:** `PUT /api/users/me/preferences` `[Authorize]`

```json
{
  "theme": "dark",
  "visibility": "public",
  "notifReactions": true,
  "notifComments": true,
  "notifFollowers": true
}
```

**Table:** `user_preferences` (one row per user, PK = userId)

| Field | Effect |
|---|---|
| `theme` | dark/light — applied client-side |
| `visibility` | public/private — gates bytes tab for visitors |
| `notif*` | Not yet wired to delivery; stored for future notification system |

---

## XP / Level

Stored in `users.xp` and `users.level`. Updated by badge/event handlers when:
- Byte posted
- Reaction received
- Follower gained

No public endpoint to update XP directly. All changes go through `BadgeService.CheckAndAwardAsync()` and associated XP grants.
