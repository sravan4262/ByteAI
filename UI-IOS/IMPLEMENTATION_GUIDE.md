# UI-iOS — Implementation Guide

This is the executable plan to bring `UI-IOS/` to feature parity with `UI/` (Next.js web). It assumes the audit findings from the conversation that produced this file: Clerk → Supabase migration is mandatory; SignalR via the `SignalR-Client-Swift` SDK on both clients (native fallback in [Appendix A](#appendix-a--native-websocket-fallback)); admin is skipped on mobile; universal links deferred.

> **Status legend:** ✅ done · 🚧 partial · ❌ todo · 🔧 broken · 👤 user/Xcode action required (no code to write)

---

## Agentic loop rules (current session)

A self-paced `/loop` is working through the web↔iOS parity plan. Permissions and behaviour are pinned here so future sessions can resume without re-asking.

**Project allowlist** — `.claude/settings.json` `permissions.allow`:
- `Read`, `Write`, `Edit` — fire silently anywhere in the workspace
- `Bash(xcodebuild:*)` — used to verify each phase
- `Bash(git *)` (read-only git is auto-allowed; mutating git is allowed *except* push)
- existing patterns for dotnet/npm/pnpm/npx/docker/ls/find/cat/echo

**Project denylist** — `.claude/settings.json` `permissions.deny`:
- `Bash(rm -rf *)`
- `Bash(git push:*)` — **ALL** push variants blocked
- `Bash(git push --force *)` — kept for clarity; subsumed by the rule above

**Loop directives** (override defaults):
- **Do not commit.** Loop runs leave a working tree of unstaged changes for human review.
- **Do not push.** Even if `git push` were allowed, the loop must not push.
- **Verify each phase with `xcodebuild`** for the iPhone simulator. If the developer dir is set to CommandLineTools, override with `DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer`.
- **Build twice fails → stop and ask.** Otherwise self-pace through phases.
- **Permission mode in IDE:** "Edit Automatically" (= `acceptEdits`). Toggled with `Shift+Tab` in the VS Code Claude panel.

### Parity loop progress (most recent first)
- ✅ **Phase 11** public profile + bookmarks audit. Found two real bugs and one missing surface:
  1. **Public profile was leaking the viewer's data.** `ProfileViewModel.load()` for `!isOwnProfile` was calling `APIClient.shared.getFeed()` (which returns the *viewer's* feed, not the profile owner's bytes) and `getInterviews()` with no filter (returning ALL interviews). Replaced with `getUserBytes(userId:)` + `getInterviews(authorId:)`. Also added new `APIClient.getUserBytes(userId:page:pageSize:)` (web parity: `/api/bytes?authorId=...`) and extended `getInterviews` with the `authorId` parameter the backend already supports.
  2. **BOOKMARKS tab was visible on public profiles** — those bookmarks are the viewer's, so showing them under someone else's profile leaked private data and was misleading. `ProfileTabs` now takes an `includeBookmarks: Bool` and the BOOKMARKS chip is hidden on public profiles. Defensive snap-back to BYTES tab on appear if a stale `.bookmarks` selection persists. ViewModel no longer fetches `getMyBookmarks()` for public profiles.
  3. **Interview bookmarks tab was missing.** Web's `BookmarksView` equivalent loads BOTH `getMyBookmarks` and `getMyInterviewBookmarks` (the iOS API method existed but was unused). Added a BYTES / INTERVIEWS sub-tab bar to `BookmarksView` with the proper identity colors (blue/purple), a new `SavedInterviewRow` summary card, and dual-load in the VM. Tapping an interview row pushes `InterviewDetailView`.
  4. **OAuth brand icons** audited but skipped — replacing the SF Symbol placeholders properly requires SVG/PNG brand assets in Assets.xcassets, which is a 👤 Xcode target action. The intentional placeholder comment at `AuthManager.swift:20` already documents this.
  5. **Deep-link routing** audited — `DeepLinkRouter` covers postId, conversationId, and notifications via APNs payload keys. In-app `/u/{username}` and `/interviews/{id}` are handled by `NavigationLink` pushes already. Universal-links deferred per the original directive.
  Build: ✅ green.
- ✅ **Phase 10** deeper sweep on screens previously skimmed (Notifications, Compose, Drafts, Chat, Preferences):
  1. **Notifications** — multiple real gaps:
     - `NotificationType` enum was missing `unfollow` and `feedback_update` cases (would have failed decode if backend ever sent either). Added both, plus a custom `init(from:)` that falls back to `.system` on unknown types.
     - `NotificationPayload` only decoded `byteId/actorId/actorUsername/preview` — backend ships `actorDisplayName/actorAvatarUrl/commentId/reactionType/badgeName/badgeLabel/badgeIcon/message`. Added all of them as optional fields with a default-arg `init` so `MockData` callers stay compatible.
     - Row UI was rendering generic SF Symbols inside colored circles — web shows the actor's avatar with an accent ring. Replaced with `AvatarView` when `actorAvatarUrl` is present, the dicebear-style ByteAI bot avatar for `feedback_update`, and an initials chip otherwise. Type icon moved to a small badge on the right (matches web). Timestamp now formats as relative time (`just now / 5m ago / 2d ago`) instead of the raw ISO string.
     - Added swipe-to-delete with snapshot-restore on failure, plus new `APIClient.deleteNotification(notificationId:)` (web parity: DELETE `/api/notifications/{id}`).
  2. **Compose Interview** — was using plain text fields for `COMPANY` / `ROLE` / `LOCATION`. Web uses `CreatableDropdown` populated from the lookup endpoints. Built a new `CreatableDropdown` (sheet-based picker with a "Create + use \"<query>\"" affordance for novel values) inlined into the in-target `FloatingHeaderCard.swift`, and wired the three fields. VM now loads `companyOptions` + `roleOptions` + `locationOptionStrings` from `getInterviewCompanies/Roles/Locations`.
  3. **Compose Byte** — added the `REACH EST` card (gated by `reach-estimate` feature flag, web parity). VM gained debounced `refreshReachEstimate()` that fires 300ms after content/stack changes when content > 10 chars; the card uses NumberFormatter for thousands grouping.
  4. **Drafts** — `updatedAt` was rendered as raw ISO string. Now formatted as relative time (`Updated 2h ago`).
  5. **Chat UI** — audited only. Pagination ("↑ load older messages") on web's `ChatThread` is intentionally NOT mirrored: the iOS pagination would require touching `ChatService.loadHistory`, which is in the SignalR-protected file the rules forbid editing. Listed in deferred items.
  Build: ✅ green.
- ✅ **Phase 9** polish pass — four cross-feature niceties closed:
  1. **Mini profile sheet on avatar tap** (web parity: `UserMiniProfile`). Inlined `MiniProfileTarget` + `UserMiniProfileSheet` into `PostCardView.swift` (target-included, no project.pbxproj edit). `PostHeader` gained an optional `onAvatarTap` callback so the sheet opens from `PostCardView`, `BytePageCard` (FeedView) and `InterviewPageCard` (Interviews). Sheet shows banner + avatar + stats (bytes/followers/level) + name/handle/role/company/bio + tag chips + FOLLOW/UNFOLLOW/PROFILE actions, with a deep-link into `ProfileView(username:)`. Backed by new `APIClient.getProfileById(userId:)` (GET `/api/users/{userId}`).
  2. **Likers sheet on `PostCardView` count** — tapping the like count now opens the existing `LikesSheet`. Previously the count button on `PostCardView` (used in BookmarksView / ProfileView / SearchView) just bubbled to `onTap`, which routed to the post detail.
  3. **Auth screen tagline** — added the underlined `Job postings`, `Random videos`, `Dank memes`, `Content you never asked for` runs. Pre-composed as a `static let` `Text` so the Swift type-checker doesn't time out on the 4-underline concatenation.
  4. **Onboarding tech chips** — replaced 2-col `LazyVGrid` with `FlowLayout` so chips wrap to label width like web's `flex-wrap` (still respects max-6 disabled state).
  Build: ✅ green.
- ✅ **Phase 8** interviews + post-detail audit. Five real gaps fixed:
  1. `InterviewResponse` decoder was dropping the rich fields the backend returns (`InterviewWithQuestionsResponse`): `Location`, `CommentCount`, `IsAnonymous`, `IsBookmarked`, `AuthorUsername`, `AuthorDisplayName`, `AuthorAvatarUrl`, `AuthorRole`, `AuthorCompany`. The previous parity-loop note "backend gap, not iOS" for `commentCount`/`isAnonymous` was wrong — fields existed all along. `Interview` model and `Interview.init(from:)` extended; iOS now decodes everything. Mock data updated to match.
  2. `APIClient.getInterviews` was sending `difficulty=…` (unsupported by backend) and missing the real filters `role` + `location`. Switched the signature to `(company, role, location, stack, page)` to match `UI/lib/api/client.ts:getInterviews`. Added `getInterviewCompanies()` + `getInterviewRoles()` helpers (web parity).
  3. `InterviewsView` filter bar replaced `COMPANY + DIFFICULTY` with `COMPANY + ROLE + LOCATION + RESET` and now populates dropdowns from the live lookup endpoints. Added the purple `FloatingHeaderCard` (`INTERVIEWS · FIND INTERVIEWS ACROSS TOP COMPANIES…`) the page was missing — previously the screen had no chrome above the cards. `InterviewPageCard` now respects `isAnonymous` (ghost emoji + "Anonymous" + 👻 anonymous-post badge), shows a `MetaChip` row with company / role / location, and the right rail's role label was replaced with a comment-count chip linking into detail.
  4. `InterviewDetailView` `MetaSection` now renders the same anonymous treatment, the location chip with `mappin`, and uses the decoded author fields directly. The interview-level discussion section was rebuilt: real avatar + username + role-title + relative time + own-comment delete (was `Circle().fill(...).overlay(Text(c.authorId.prefix(1)))` placeholder before). `InterviewComment` and `QuestionComment` models were corrected — `QuestionComment` previously had `question`/`answer` fields (paste-error from `InterviewQuestion`) and `InterviewComment` was missing all author display fields.
  5. New per-question comment thread (`QuestionCommentThread`) inlined into `InterviewDetailView.swift`. Lazy-loads on first open, supports add + own-delete, mirrors the web inline thread behavior. APIClient gained `deleteQuestionComment(commentId:)` (the existing `addQuestionComment` was changed to return the created `QuestionComment` to match `UI/lib/api/client.ts`).
  6. Post detail had no `SIMILAR` action — the only entry into the similar-bytes flow on web. Added a `SIMILAR` interaction pill and a `SimilarBytesView` (inlined into `PostDetailView.swift` so no `project.pbxproj` edit is needed) that calls `getSimilarBytes` and renders the result as cards that push into `PostDetailView`. New `SimilarByte` / `SimilarByteResponse` model + `APIClient.getSimilarBytes(byteId:limit:)` mirror `UI/lib/api/client.ts` exactly.
  Build: ✅ `xcodebuild` green for iPhone simulator.
- ✅ **Phase 1** quick visual fixes — comment vote count + author check; `BytePageCard` activeTab plumbed for trending views; t3→t2 typography sweep on conversations/profile/search metadata.
- ✅ **Phase 2** byte detail — likers sheet via long-press on like pill; inline 3-comment preview with "View all N →"; `CommentComposeBar` lifted from `private` and pinned at detail bottom. `Post.comments` flipped from `let` to `var` for optimistic counter increment.
- ✅ **Phase 3** interviews — `// N QUESTIONS` and `// N COMMENTS` comment-style headers replaced with purple `AccentBarHeader`; interview metadata typography fixed.
- ✅ **Phase 4** profile — `BadgeType` model + `getBadgeTypes()` API; profile now renders the full badge catalog with earned vs locked states (locked entries are tappable to read description); `BadgeDetailSheet` modal; `SocialLinksRow` rendered when `user.links` non-empty.
- ✅ **Phase 5** chat terminal makeover — `ChatThreadView` + `MessageBubble` rebuilt to match web `TerminalShell`/`ChatThread`: green-accented title bar with traffic lights and `@username` center, SENDING/READY badge, gradient accent line, monospace messages (white-tint sent, green-tint received), `byteai@~ >` prompt with pulsing caret. WebSocket transport in `ChatService.swift` untouched.
- ✅ **Phase 6** support widget — new `SupportTerminalView` inlined into ProfileView.swift (so it compiles into the existing Xcode target without manual project edits). Wired from the Profile overflow menu as "Send feedback". Commands: `help`, `whoami`, `feedback --type good|bad|idea` (awaiting-message stage or one-shot `"message"`), `history`, `clear`, `exit`. Uses new `submitFeedback` / `getMyFeedbackHistory` against `/api/support/feedback*`.
- ✅ **Phase 7** verification pass — additional t3→t2 typography fixes across `InterviewsView` (refresh hint, company badge, question count, "+N more", rail labels Save/Share/View, results count) and `ProfileView` BIO label.
- ✅ **Audit re-pass** — caught three real misses:
  1. `SearchView` was checking flag key `search_ask` while web uses `ai-search-ask`. ASK mode was effectively dead. **Fixed.**
  2. Chat thread had no animated dots indicator while history loaded. Added `isLoadingHistory` flag on `ChatThreadVM` and a green-dot loader in `ChatThreadView`. **Fixed.**
  3. Interview listing card lacks comment count + anonymous badge. **Backend gap, not iOS** — the `Interview` model has no `commentCount` aggregate or `isAnonymous` field. Flagged for backend team; cannot render without data.

All phases verified with `xcodebuild` for the iPhone simulator. **Nothing has been staged, committed, or pushed.**

### Known deferred / backend-blocked items
- ~~Anonymous interview badge — needs `Interview.isAnonymous` from backend~~ — fixed in Phase 8 (backend was already returning the field; iOS decoder was dropping it).
- ~~Interview-card comment count — needs `Interview.commentCount` aggregate from backend~~ — fixed in Phase 8 (same root cause).
- Edit-byte mode (Phase 2.4) — deferred per user
- Prev/next post nav (Phase 2.5) — deferred per user
- Profile theme selector — deferred (iOS follows system dark mode)
- Chat: command history / Tab completion — present on web, not on iOS; not critical for messaging UX
- Chat: load-older-messages pagination — would require modifying `ChatService.loadHistory`, which is in the SignalR-protected file. The REST endpoint (`getMessages(before:)`) already supports it, so this is a future ChatService-level change rather than a UI tweak.
- OAuth brand assets — Auth screen still uses SF-Symbol placeholders (`globe` for Google, `chevron.left.forwardslash.chevron.right` for GitHub). The intentional placeholder comment is at `AuthManager.swift:20`. Cosmetic; awaiting brand assets.

**Resume command** (paste into a new session if the loop is interrupted):
```
/loop work through the iOS↔web parity plan in /Users/sravanravula/Desktop/GitHub/ByteAI (.claude/skills/frontend/ui-standards.md is the design guide). Order: Phase 1 quick visual fixes → Phase 2 byte detail → Phase 3 interviews + interview detail → Phase 4 profile (badges = earned-set only with locked-readable descriptions) → Phase 5 chat terminal makeover (web style, port from UI/components/features/terminal and chat) → Phase 6 support widget in Profile menu (web /api/support/feedback already exists) → Phase 7 verification pass against ui-standards.md. After each phase: build with xcodebuild for iPhone simulator. Do NOT commit, do NOT push. Stop and ask only if a build fails twice or you need a product decision. Self-pace.
```

---

## Implementation Status (as of 2026-04-25)

| Phase | Description | Status |
|-------|-------------|--------|
| **0** | Clerk → Supabase Auth migration | 🚧 Code done · 👤 Xcode pkg + scheme vars pending |
| **1** | Bug fixes (tab tags, author info, onChange syntax) | ✅ Done |
| **2.1** | Comments sheet | ✅ Done |
| **2.2** | Avatar upload (PhotosPicker) | ✅ Done |
| **2.3** | Bookmarks list view | ✅ Done |
| **2.4** | Drafts UI | ✅ Done |
| **2.5** | Feature flags client | ✅ Done |
| **3** | Chat / SignalR (all files) | 🚧 Code done · 👤 SignalRClient pkg pending |
| **4.1** | Pull-to-refresh | ✅ Done |
| **4.2** | Haptics | ✅ Done |
| **4.3** | Share sheet | ✅ Done |
| **4.4** | Image caching (Kingfisher) | 🚧 Code done · 👤 Kingfisher pkg pending |
| **4.5** | Skeleton rows / empty states | ✅ Done |
| **4.6** | Dwell-time view tracking | ✅ Done |
| **4.7** | Scroll-to-top on tab tap | ✅ Done |
| **4.8** | Keyboard dismiss on tap-outside | ✅ Done |
| **4.9** | Accessibility (tap targets, Dynamic Type, labels) | ✅ Done |
| **4.10** | Toast / error surface | ✅ Done |
| **5.1** | Push backend prerequisites | ❌ Backend not built yet |
| **5.2** | Xcode Push + Background Modes capabilities | 👤 Pending |
| **5.3** | APNs registration flow (AppDelegate, registerDevice) | ✅ Code done · ❌ Backend endpoint missing |
| **5.4** | Deep link router | ✅ Done |
| **5.5** | Badge management | ✅ Done |

### Remaining blockers before full app is testable

1. **Xcode actions (you do these — no code needed):**
   - Add package: `supabase/supabase-swift` ≥ 2.0.0 → tick `Supabase`
   - Add package: `moozzyk/SignalR-Client-Swift` ≥ 0.9.0 → tick `SignalRClient`
   - Add package: `onevcat/Kingfisher` ≥ 7.0.0 → tick `Kingfisher`
   - Add all 17 new `.swift` files to the `ByteAI` target
   - Edit scheme → Add env vars `SUPABASE_URL` and `SUPABASE_ANON_KEY`
   - Signing & Capabilities → add **Push Notifications** + **Background Modes → Remote notifications**
   - Remove ClerkKit package

2. **Supabase dashboard:** Add `byteai://auth/callback` to Redirect URLs.

3. **Backend:** Build device registration endpoints + APNs sender (see §5.1 and Backend asks below).

---

## 0. Push notifications & APNs — what you need to know

You asked what an APNs cert is. The 60-second version:

- **APNs (Apple Push Notification service)** is the only path to deliver a push notification to an iPhone. Your backend doesn't talk to the device — it talks to Apple, Apple talks to the device.
- To use APNs, Apple needs proof that your backend is authorized to push to **your** app. That proof comes from one of two credential types:
  - **APNs Auth Key (`.p8`)** ← use this. One key per Apple Developer Team, works for every bundle ID under that team, doesn't expire. Backend uses it to sign short-lived JWTs (provider tokens) on every push.
  - **APNs Certificate (`.p12`)** — legacy. Per-bundle-id, expires every 12 months, painful to rotate. Skip.
- The `.p8` file plus `Key ID` (10-char string) and `Team ID` (10-char string) live as backend env vars. Never commit them.

**Without these credentials, iOS push will not work — at all.** The OS happily registers a device token for you, but APNs will reject every send your backend attempts.

What you'll need before Phase 5:
1. Apple Developer Program enrollment ($99/yr) — required to generate the key.
2. An App ID with the **Push Notifications** capability enabled.
3. The `.p8` file downloaded once (you cannot redownload it; if lost, revoke and reissue).
4. A new backend endpoint `POST /api/users/me/devices` to store device tokens, and a worker that sends notifications via APNs HTTP/2.
5. The "Push Notifications" capability added to the Xcode target.

That backend work is out of scope for this guide — Phase 5 covers only the iOS side (registration, token send, foreground/background handling, deep linking).

---

## 1. Current state — what's built, what isn't

### ✅ Already aligned with the web app
- **Design tokens** — [`Core/Design/Colors.swift`](ByteAI/Core/Design/Colors.swift) mirrors `UI/app/globals.css` exactly (22 tokens).
- **Typography** — [`Core/Design/Typography.swift`](ByteAI/Core/Design/Typography.swift) `byteSans` / `byteMono` helpers.
- **Shared components** — `AvatarView`, `ByteButton`, `ByteTextField`, `CodeBlockView`, `LoadingView`, `TagView`.
- **Models** — [`Core/Models/Models.swift`](ByteAI/Core/Models/Models.swift): `Post`, `User`, `Comment`, `Interview`, `AppNotification`, `PersonResult`, `SeniorityType`, `Domain`, `TechStack`.
- **API client** — [`Core/Network/APIClient.swift`](ByteAI/Core/Network/APIClient.swift) ~50 endpoints, envelope unwrap, 401 → re-auth notification.
- **Feature views** — Auth, Onboarding, Feed, PostDetail, Compose, Search, Profile, Interviews list+detail, Notifications.
- **Tab shell** — [`App/RootView.swift`](ByteAI/App/RootView.swift) 5-tab `TabView`.

### 🔧 Broken / wrong
| # | Issue | File:line |
|---|---|---|
| 1 | **Auth uses Clerk; backend validates Supabase JWTs only** — every authenticated request will 401 | [`Core/Auth/AuthManager.swift`](ByteAI/Core/Auth/AuthManager.swift), [`App/ByteAIApp.swift:11`](ByteAI/App/ByteAIApp.swift#L11), [`Resources/Info.plist`](ByteAI/Resources/Info.plist) `ClerkPublishableKey` |
| 2 | Center "Post" tab tagged `.search`, Search tab tagged `.notifications` — Search routing is broken | [`App/RootView.swift:74,80`](ByteAI/App/RootView.swift#L74) |
| 3 | `UserResponse.clerkId` field — backend doesn't return it; decode will succeed only because the field is optional in JSON, but it's dead weight | [`Core/Network/APIClient.swift:424`](ByteAI/Core/Network/APIClient.swift#L424) |
| 4 | `Post.init(from: ByteResponse)` uses `User.placeholder` for the author — every feed card shows "User / U" | [`Core/Network/APIClient.swift:534`](ByteAI/Core/Network/APIClient.swift#L534) |
| 5 | `onChange(of:)` uses iOS 16 single-arg syntax — deprecation warnings on iOS 17+ | [`App/RootView.swift:91`](ByteAI/App/RootView.swift#L91) |

### ❌ Missing
- Comments screen (web: `/post/[id]/comments`)
- Avatar upload (multipart)
- Bookmarks list view
- Drafts UI (`/api/me/drafts` not wired)
- Feature flags client + `chat` flag gate
- **Chat / SignalR** — entire feature
- Dwell-time view tracking (`recordView`)
- Pull-to-refresh, haptics, share sheet, image caching
- Push notifications

---

## Phase 0 — Migrate Clerk → Supabase Auth (BLOCKER) 🚧

Code is done. Xcode package install and scheme env vars are still required (👤 user actions).

### 0.1. Add the Supabase Swift Package 👤

In Xcode: **File → Add Package Dependencies** → `https://github.com/supabase/supabase-swift` → "Up to Next Major" from `2.0.0` → add `Supabase` to the `ByteAI` target.

Remove the **ClerkKit** package: select the package in the Project navigator → right-click → Delete. Confirm "Remove Reference".

### 0.2. Configuration ✅

Add to [`Resources/Info.plist`](ByteAI/Resources/Info.plist):
```xml
<key>SupabaseURL</key>
<string>$(SUPABASE_URL)</string>
<key>SupabaseAnonKey</key>
<string>$(SUPABASE_ANON_KEY)</string>
```

Remove `ClerkPublishableKey`.

Create `ByteAI/Core/Configuration.swift`:
```swift
import Foundation

enum AppConfig {
    static let supabaseURL: URL = {
        let raw = Bundle.main.object(forInfoDictionaryKey: "SupabaseURL") as? String ?? ""
        guard let url = URL(string: raw) else { fatalError("SupabaseURL missing in Info.plist") }
        return url
    }()

    static let supabaseAnonKey: String = {
        let key = Bundle.main.object(forInfoDictionaryKey: "SupabaseAnonKey") as? String ?? ""
        precondition(!key.isEmpty, "SupabaseAnonKey missing in Info.plist")
        return key
    }()

    static let apiBaseURL: URL = {
        let raw = ProcessInfo.processInfo.environment["BYTEAI_API_URL"] ?? "http://127.0.0.1:5239"
        return URL(string: raw)!
    }()

    static let signalRHubURL: URL = apiBaseURL.appendingPathComponent("hubs/chat")
}
```

Set `SUPABASE_URL` and `SUPABASE_ANON_KEY` per scheme via **Product → Scheme → Edit Scheme → Run → Arguments → Environment Variables** (or via `.xcconfig` files committed without secrets and a `Local.xcconfig` that's gitignored).

### 0.3. Rewrite `AuthManager.swift` ✅

Drop everything Clerk. New structure (~120 lines):

```swift
import Foundation
import Combine
import Supabase

enum AuthState: Equatable {
    case unauthenticated
    case onboarding
    case authenticated(user: User)

    static func == (lhs: AuthState, rhs: AuthState) -> Bool {
        switch (lhs, rhs) {
        case (.unauthenticated, .unauthenticated): return true
        case (.onboarding, .onboarding):           return true
        case (.authenticated(let a), .authenticated(let b)): return a.id == b.id
        default: return false
        }
    }
}

@MainActor
final class AuthManager: ObservableObject {
    @Published var state: AuthState = .unauthenticated
    @Published var isLoading = false
    @Published var error: String?

    static let shared = AuthManager()

    let client = SupabaseClient(
        supabaseURL: AppConfig.supabaseURL,
        supabaseKey: AppConfig.supabaseAnonKey
    )

    private var authStateTask: Task<Void, Never>?

    private init() {
        observeAuthState()
        observeUnauthorized()
    }

    // MARK: - Session lifecycle

    private func observeAuthState() {
        authStateTask = Task { [weak self] in
            guard let self else { return }
            for await (event, session) in self.client.auth.authStateChanges {
                await self.handle(event: event, session: session)
            }
        }
    }

    private func handle(event: AuthChangeEvent, session: Session?) async {
        switch event {
        case .initialSession, .signedIn, .tokenRefreshed, .userUpdated:
            if let session {
                await APIClient.shared.setToken(session.accessToken)
                await loadCurrentUser()
            }
        case .signedOut:
            await APIClient.shared.setToken(nil)
            UserDefaults.standard.removeObject(forKey: "byteai_onboarded")
            state = .unauthenticated
        default:
            break
        }
    }

    private func loadCurrentUser() async {
        do {
            let user = try await APIClient.shared.getMe()
            UserDefaults.standard.set(true, forKey: "byteai_onboarded")
            state = .authenticated(user: user)
        } catch APIError.unauthorized {
            // 404 from /api/users/me means new user → onboarding
            state = .onboarding
        } catch {
            print("[Auth] loadCurrentUser failed: \(error)")
            state = .unauthenticated
        }
    }

    private func observeUnauthorized() {
        NotificationCenter.default.addObserver(
            forName: .apiDidReceiveUnauthorized, object: nil, queue: .main
        ) { [weak self] _ in
            Task { @MainActor in
                guard let self else { return }
                // Try a forced refresh; on failure, sign out.
                do {
                    let session = try await self.client.auth.refreshSession()
                    await APIClient.shared.setToken(session.accessToken)
                } catch {
                    await self.signOut()
                }
            }
        }
    }

    // MARK: - Sign in

    func signInWithGoogle() async {
        isLoading = true; defer { isLoading = false }
        error = nil
        do {
            try await client.auth.signInWithOAuth(
                provider: .google,
                redirectTo: URL(string: "byteai://auth/callback")
            )
        } catch {
            self.error = error.localizedDescription
        }
    }

    func signInWithMagicLink(_ email: String) async {
        isLoading = true; defer { isLoading = false }
        error = nil
        do {
            try await client.auth.signInWithOTP(
                email: email,
                redirectTo: URL(string: "byteai://auth/callback")
            )
        } catch {
            self.error = error.localizedDescription
        }
    }

    func signInWithPhone(_ phone: String) async {
        isLoading = true; defer { isLoading = false }
        error = nil
        do {
            try await client.auth.signInWithOTP(phone: phone)
        } catch {
            self.error = error.localizedDescription
        }
    }

    func verifyPhoneOTP(phone: String, otp: String) async {
        isLoading = true; defer { isLoading = false }
        error = nil
        do {
            try await client.auth.verifyOTP(phone: phone, token: otp, type: .sms)
            // authStateChanges will fire .signedIn → loadCurrentUser
        } catch {
            self.error = error.localizedDescription
        }
    }

    // MARK: - URL handling (OAuth callback)

    func handle(url: URL) {
        Task { try? await client.auth.session(from: url) }
    }

    // MARK: - Sign out / onboarding

    func signOut() async {
        try? await client.auth.signOut()
        // observeAuthState will set .unauthenticated
    }

    func completeOnboarding() async {
        UserDefaults.standard.set(true, forKey: "byteai_onboarded")
        await loadCurrentUser()
    }

    var currentUser: User? {
        if case .authenticated(let user) = state { return user }
        return nil
    }
}
```

### 0.4. Wire OAuth callback in `ByteAIApp.swift` ✅

```swift
import SwiftUI
import Supabase

@main
struct ByteAIApp: App {
    @StateObject private var authManager = AuthManager.shared

    init() { configureNavigationAppearance() }

    var body: some Scene {
        WindowGroup {
            RootView()
                .environmentObject(authManager)
                .preferredColorScheme(.dark)
                .onOpenURL { authManager.handle(url: $0) }
        }
    }

    private func configureNavigationAppearance() {
        let appearance = UINavigationBarAppearance()
        appearance.configureWithOpaqueBackground()
        appearance.backgroundColor = UIColor(Color.byteBackground)
        appearance.shadowColor = UIColor(Color.byteBorderMedium)
        appearance.titleTextAttributes = [
            .foregroundColor: UIColor(Color.byteText1),
            .font: UIFont.systemFont(ofSize: 16, weight: .semibold)
        ]
        UINavigationBar.appearance().standardAppearance = appearance
        UINavigationBar.appearance().scrollEdgeAppearance = appearance
        UINavigationBar.appearance().compactAppearance = appearance
    }
}
```

### 0.5. Update `AuthView.swift` callsites ✅

Search for `Clerk.shared` and `await vm.signInWith*` patterns in [`Features/Auth/AuthView.swift`](ByteAI/Features/Auth/AuthView.swift) and replace the view model's methods with the new `AuthManager` API. The button labels stay the same; only the underlying calls change:

- `vm.signInWithGoogle()` → `authManager.signInWithGoogle()`
- `vm.signInWithEmail(email)` → `authManager.signInWithMagicLink(email)`
- `vm.verifyOTP(otp)` → not needed for magic link (Supabase handles via callback URL); keep only for phone.

The "Sign Up" tab in `AuthView` becomes a thin wrapper — Supabase doesn't have a separate "create account" step like Clerk; magic link / OAuth auto-creates. Reduce the form to `email` only and call `signInWithMagicLink`.

### 0.6. Supabase URL allow-list 👤

In your **Supabase project dashboard → Authentication → URL Configuration**, add `byteai://auth/callback` to **Redirect URLs**. Without this, OAuth comes back with an error.

### 0.7. Cleanup 👤

- Remove `ClerkPublishableKey` from `Info.plist`.
- Delete the ClerkKit package reference.
- In [`Core/Network/APIClient.swift:424`](ByteAI/Core/Network/APIClient.swift#L424) rename `clerkId` → drop the field entirely (the iOS app doesn't read it; backend returns `supabaseUserId` which we also don't need on the client).

---

## Phase 1 — Bug fixes ✅

### 1.1. Fix tab tags in `RootView.swift` ✅

```swift
enum Tab: Int, CaseIterable {
    case feed, interviews, compose, search, profile
}

var body: some View {
    TabView(selection: $selectedTab) {
        FeedView()
            .tabItem { Label("Bits", systemImage: "bolt.fill") }
            .tag(Tab.feed)

        InterviewsView()
            .tabItem { Label("Interviews", systemImage: "briefcase.fill") }
            .tag(Tab.interviews)

        Color.clear
            .tabItem { Label("Post", systemImage: "plus.circle.fill") }
            .tag(Tab.compose)

        SearchView()
            .tabItem { Label("Search", systemImage: "magnifyingglass") }
            .tag(Tab.search)

        ProfileView(username: AuthManager.shared.currentUser?.username ?? "")
            .tabItem { Label("Profile", systemImage: "person.fill") }
            .tag(Tab.profile)
    }
    .tint(.byteAccent)
    .onAppear { applyTabBarAppearance() }
    .onChange(of: selectedTab) { _, newValue in
        if newValue == .compose {
            selectedTab = .feed
            showCompose = true
        }
    }
    .sheet(isPresented: $showCompose) { ComposeView() }
    .task { await notifBadge.load() }
}
```

### 1.2. Fix author info on feed cards ✅

The web `ByteResponse` includes `authorUsername`, `authorDisplayName`, `authorAvatarUrl`. Verify in `Service/ByteAI.Api/ViewModels/ByteResponse.cs`, then update [`Core/Network/APIClient.swift`](ByteAI/Core/Network/APIClient.swift):

```swift
struct ByteResponse: Decodable {
    let id: String
    let authorId: String
    let authorUsername: String
    let authorDisplayName: String
    let authorAvatarUrl: String?
    let title: String
    let body: String
    let codeSnippet: String?
    let language: String?
    let tags: [String]
    let type: String
    let createdAt: String
    let commentCount: Int
    let likeCount: Int
    let isLiked: Bool
    let isBookmarked: Bool
}

extension Post {
    init(from b: ByteResponse) {
        let author = User(
            id: b.authorId,
            username: b.authorUsername,
            displayName: b.authorDisplayName,
            initials: Self.initials(from: b.authorDisplayName),
            role: "", company: "", bio: "",
            level: 1, xp: 0, xpToNextLevel: 1000,
            followers: 0, following: 0, bytes: 0, reactions: 0, streak: 0,
            techStack: [], feedPreferences: [], links: [], badges: [],
            isVerified: false, isOnline: false,
            avatarVariant: "cyan", avatarUrl: b.authorAvatarUrl
        )
        self.init(
            id: b.id, title: b.title, body: b.body, author: author,
            tags: b.tags,
            likes: b.likeCount, comments: b.commentCount, shares: 0, bookmarks: 0,
            timestamp: Self.relativeTime(from: b.createdAt),
            isLiked: b.isLiked, isBookmarked: b.isBookmarked,
            code: b.codeSnippet.map { CodeSnippet(language: b.language ?? "text", filename: "snippet", content: $0) },
            views: nil,
            type: b.type == "interview" ? .interview : .byte
        )
    }

    private static func initials(from displayName: String) -> String {
        displayName.split(separator: " ").compactMap { $0.first }.prefix(2)
            .map(String.init).joined().uppercased()
    }
}
```

If `ByteResponse.cs` doesn't return those fields, add them server-side first — the web app uses them.

### 1.3. Use new `onChange` syntax (iOS 17+) ✅

Replace any `.onChange(of: x) { v in ... }` with `.onChange(of: x) { _, v in ... }`.

---

## Phase 2 — Missing features ✅

### 2.1. Comments sheet ✅

Web has a separate route `/post/[id]/comments`. On iOS, present as a sheet — better UX than push navigation for ephemeral lists.

New file: `ByteAI/Features/PostDetail/CommentsSheet.swift`
```swift
import SwiftUI

struct CommentsSheet: View {
    let post: Post
    @Environment(\.dismiss) private var dismiss
    @StateObject private var vm: CommentsVM

    init(post: Post) {
        self.post = post
        _vm = StateObject(wrappedValue: CommentsVM(postId: post.id))
    }

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                if vm.isLoading && vm.comments.isEmpty {
                    LoadingView()
                } else {
                    ScrollView {
                        LazyVStack(alignment: .leading, spacing: 16) {
                            ForEach(vm.comments) { CommentRow(comment: $0) }
                        }
                        .padding(.horizontal, 16).padding(.vertical, 12)
                    }
                    .refreshable { await vm.reload() }
                }

                Divider().background(Color.byteBorder)
                CommentComposer { text in await vm.submit(body: text) }
            }
            .background(Color.byteBackground)
            .navigationTitle("Comments")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Done") { dismiss() }.foregroundColor(.byteAccent)
                }
            }
        }
        .task { await vm.load() }
    }
}

@MainActor
final class CommentsVM: ObservableObject {
    @Published var comments: [Comment] = []
    @Published var isLoading = false
    @Published var error: String?
    private let postId: String

    init(postId: String) { self.postId = postId }

    func load() async {
        isLoading = true; defer { isLoading = false }
        do { comments = try await APIClient.shared.getComments(postId: postId) }
        catch { self.error = error.localizedDescription }
    }

    func reload() async { await load() }

    func submit(body: String) async {
        let trimmed = body.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return }
        do {
            try await APIClient.shared.addComment(postId: postId, body: trimmed)
            await load()
        } catch {
            self.error = error.localizedDescription
        }
    }
}

private struct CommentRow: View {
    let comment: Comment
    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            AvatarView(user: comment.author, size: 32)
            VStack(alignment: .leading, spacing: 4) {
                HStack(spacing: 6) {
                    Text(comment.author.displayName).font(.byteSans(13, weight: .semibold))
                    Text(comment.timestamp).font(.byteMono(10)).foregroundColor(.byteText3)
                }
                Text(comment.content).font(.byteSans(14)).foregroundColor(.byteText1)
            }
        }
    }
}

private struct CommentComposer: View {
    let onSubmit: (String) async -> Void
    @State private var text = ""
    @State private var sending = false
    @FocusState private var focused: Bool

    var body: some View {
        HStack(spacing: 8) {
            TextField("Add a comment...", text: $text, axis: .vertical)
                .lineLimit(1...4)
                .focused($focused)
                .textFieldStyle(.plain)
                .padding(.horizontal, 12).padding(.vertical, 10)
                .background(Color.byteCard)
                .cornerRadius(8)
            Button {
                Task {
                    sending = true
                    await onSubmit(text)
                    text = ""
                    sending = false
                }
            } label: {
                Image(systemName: "arrow.up.circle.fill")
                    .font(.system(size: 28))
                    .foregroundColor(text.isEmpty ? .byteText3 : .byteAccent)
            }
            .disabled(text.isEmpty || sending)
        }
        .padding(12)
        .background(Color.byteBackground)
    }
}
```

Wire from [`Features/PostDetail/PostDetailView.swift`](ByteAI/Features/PostDetail/PostDetailView.swift):
```swift
@State private var showComments = false
// in toolbar or button:
Button { showComments = true } label: { ... }
.sheet(isPresented: $showComments) { CommentsSheet(post: post) }
```

### 2.2. Avatar upload ✅

Add to [`Core/Network/APIClient.swift`](ByteAI/Core/Network/APIClient.swift):
```swift
func uploadAvatar(_ imageData: Data, mimeType: String = "image/jpeg") async throws -> String {
    let boundary = "Boundary-\(UUID().uuidString)"
    var req = URLRequest(url: URL(string: AppConfig.apiBaseURL.absoluteString + "/api/users/me/avatar")!)
    req.httpMethod = "POST"
    req.setValue("multipart/form-data; boundary=\(boundary)", forHTTPHeaderField: "Content-Type")
    if let token = authToken { req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization") }

    var body = Data()
    body.append("--\(boundary)\r\n".data(using: .utf8)!)
    body.append("Content-Disposition: form-data; name=\"file\"; filename=\"avatar.jpg\"\r\n".data(using: .utf8)!)
    body.append("Content-Type: \(mimeType)\r\n\r\n".data(using: .utf8)!)
    body.append(imageData)
    body.append("\r\n--\(boundary)--\r\n".data(using: .utf8)!)
    req.httpBody = body

    let (data, response) = try await URLSession.shared.upload(for: req, from: body)
    guard let http = response as? HTTPURLResponse, (200..<300).contains(http.statusCode) else {
        throw APIError.http((response as? HTTPURLResponse)?.statusCode ?? 0, String(data: data, encoding: .utf8) ?? "")
    }
    struct R: Decodable { let avatarUrl: String }
    let env: APIEnvelope<R> = try JSONDecoder().decode(APIEnvelope<R>.self, from: data)
    return env.data.avatarUrl
}
```

In [`Features/Profile/ProfileView.swift`](ByteAI/Features/Profile/ProfileView.swift), add a `PhotosPicker` (iOS 16+):
```swift
import PhotosUI

@State private var selectedItem: PhotosPickerItem?

PhotosPicker(selection: $selectedItem, matching: .images) {
    AvatarView(user: user, size: 80)
}
.onChange(of: selectedItem) { _, item in
    Task { await uploadIfPresent(item) }
}

private func uploadIfPresent(_ item: PhotosPickerItem?) async {
    guard let item, let data = try? await item.loadTransferable(type: Data.self) else { return }
    do {
        let url = try await APIClient.shared.uploadAvatar(data)
        // refresh user
    } catch {
        // surface error
    }
}
```

### 2.3. Bookmarks list ✅

New file: `ByteAI/Features/Profile/BookmarksView.swift` — push from a "Saved" row in `ProfileView`. Reuses `getMyBookmarks()` (already in client) and `PostCardView`. ~80 LOC.

### 2.4. Drafts ✅

Add to API client:
```swift
struct Draft: Decodable, Identifiable {
    let id: String
    let title: String?
    let body: String?
    let updatedAt: String
}

func getMyDrafts() async throws -> [Draft] {
    let paged: PagedResponse<Draft> = try await fetch("/api/me/drafts")
    return paged.items
}

func saveDraft(id: String?, title: String?, body: String?, codeSnippet: String?, language: String?, tags: [String]) async throws -> String {
    struct B: Encodable { let title: String?; let body: String?; let codeSnippet: String?; let language: String?; let tags: [String] }
    struct R: Decodable { let id: String }
    let path = id.map { "/api/me/drafts/\($0)" } ?? "/api/me/drafts"
    let method = id == nil ? "POST" : "PUT"
    let r: R = try await fetch(path, method: method, body: B(title: title, body: body, codeSnippet: codeSnippet, language: language, tags: tags))
    return r.id
}

func deleteDraft(id: String) async throws {
    let _: EmptyResponse = try await fetch("/api/me/drafts/\(id)", method: "DELETE")
}
```

New file: `ByteAI/Features/Compose/DraftsListView.swift` — tappable list, pull-to-refresh, swipe-to-delete. Wire a "Drafts" button in `ComposeView`'s toolbar.

### 2.5. Feature flags client ✅

New file: `ByteAI/Core/FeatureFlags/FeatureFlagsManager.swift`
```swift
import Foundation
import Combine

@MainActor
final class FeatureFlagsManager: ObservableObject {
    static let shared = FeatureFlagsManager()
    @Published private(set) var flags: [String: Bool] = [:]

    private var refreshTask: Task<Void, Never>?

    func start() {
        refreshTask?.cancel()
        refreshTask = Task { [weak self] in
            while !Task.isCancelled {
                await self?.refresh()
                try? await Task.sleep(nanoseconds: 60_000_000_000) // 60s
            }
        }
    }

    func stop() { refreshTask?.cancel(); refreshTask = nil }

    func refresh() async {
        do { flags = try await APIClient.shared.getEnabledFeatureFlags() }
        catch { /* keep stale */ }
    }

    func isEnabled(_ key: String) -> Bool { flags[key] ?? false }
}
```

Add to `APIClient.swift`:
```swift
func getEnabledFeatureFlags() async throws -> [String: Bool] {
    struct Flag: Decodable { let key: String; let enabled: Bool }
    let items: [Flag] = try await fetch("/api/feature-flags")
    return Dictionary(uniqueKeysWithValues: items.map { ($0.key, $0.enabled) })
}
```

Inject into `RootView`:
```swift
@StateObject private var flags = FeatureFlagsManager.shared
// .environmentObject(flags)
// .task { flags.start() }
```

The chat tab/launcher (Phase 3) reads `flags.isEnabled("chat")`.

---

## Phase 3 — Chat / SignalR 🚧 Code done · 👤 SignalRClient package pending

You picked SignalR on both clients — the existing web hub stays unchanged, iOS speaks the same protocol. Both clients connect to `/hubs/chat`, join the `user-{userId}` group, and receive identical broadcasts. Sync is automatic — no extra sync layer needed.

We use **`SignalR-Client-Swift`** (community Swift SDK by `moozzyk`) — it handles the JSON handshake, record-separator framing, ping/pong keepalive, and reconnection automatically. If the SDK ever breaks against your hub version, [Appendix A](#appendix-a--native-websocket-fallback) has a zero-dependency native implementation as a drop-in replacement.

### 3.1. Add the SDK 👤

In Xcode: **File → Add Package Dependencies** → `https://github.com/moozzyk/SignalR-Client-Swift` → "Up to Next Major" from `0.9.0` → add the `SignalRClient` library to the `ByteAI` target.

### 3.2. URL & auth ✅

iOS `URLSessionWebSocketTask` cannot set an `Authorization` header. The SDK's `accessTokenProvider` handles this automatically — under the hood it appends `?access_token=<jwt>` to the WebSocket URL. The gateway already accepts that — see [`Service/ByteAI.Gateway/Middleware/ApiKeyMiddleware.cs:101-102`](../Service/ByteAI.Gateway/Middleware/ApiKeyMiddleware.cs#L101-L102).

### 3.3. Files to add ✅

```
ByteAI/Core/Realtime/
  ChatConnection.swift        — wraps HubConnection, exposes typed send/receive

ByteAI/Features/Chat/
  ChatService.swift           — app-level singleton (connection lifecycle + state)
  ConversationsView.swift     — list of conversations
  ChatThreadView.swift        — message thread + composer
  MessageBubble.swift
  ChatViewModels.swift        — ConversationsVM, ChatThreadVM
```

### 3.4. `ChatConnection.swift` ✅

```swift
import Foundation
import SignalRClient

@MainActor
final class ChatConnection: ObservableObject {
    @Published private(set) var isConnected = false

    private var hub: HubConnection?
    private var hubDelegate: ConnectionDelegate?
    private let url: URL
    private let tokenProvider: () async -> String?

    private var receiveMessageHandler: ((MessagePayload) -> Void)?
    private var messageSentHandler:    ((MessagePayload) -> Void)?

    init(url: URL, tokenProvider: @escaping () async -> String?) {
        self.url = url
        self.tokenProvider = tokenProvider
    }

    // MARK: - Lifecycle

    func start() async {
        guard hub == nil else { return }
        let token = (await tokenProvider()) ?? ""

        let connection = HubConnectionBuilder(url: url)
            .withHttpConnectionOptions { options in
                options.accessTokenProvider = { token }
            }
            .withAutoReconnect()
            .withLogging(minLogLevel: .warning)
            .build()

        connection.on(method: "ReceiveMessage") { [weak self] args in
            guard let dict = args.first as? [String: Any],
                  let payload = MessagePayload(dict: dict) else { return }
            Task { @MainActor in self?.receiveMessageHandler?(payload) }
        }
        connection.on(method: "MessageSent") { [weak self] args in
            guard let dict = args.first as? [String: Any],
                  let payload = MessagePayload(dict: dict) else { return }
            Task { @MainActor in self?.messageSentHandler?(payload) }
        }

        let delegate = ConnectionDelegate(owner: self)
        connection.delegate = delegate
        self.hubDelegate = delegate    // SDK holds delegate weakly — keep a strong ref

        connection.start()
        self.hub = connection
    }

    func stop() async {
        hub?.stop()
        hub = nil
        hubDelegate = nil
        isConnected = false
    }

    /// Stop and start. Use when the auth token rotates.
    func reconnect() async {
        await stop()
        await start()
    }

    // MARK: - Hub method invocations

    func sendMessage(recipientId: String, content: String) async throws {
        guard let hub else { throw ChatError.notConnected }
        try await withCheckedThrowingContinuation { (c: CheckedContinuation<Void, Error>) in
            hub.invoke(method: "SendMessage", arguments: [recipientId, content]) { error in
                if let error { c.resume(throwing: error) } else { c.resume() }
            }
        }
    }

    func markRead(conversationId: String) async throws {
        guard let hub else { throw ChatError.notConnected }
        try await withCheckedThrowingContinuation { (c: CheckedContinuation<Void, Error>) in
            hub.invoke(method: "MarkRead", arguments: [conversationId]) { error in
                if let error { c.resume(throwing: error) } else { c.resume() }
            }
        }
    }

    // MARK: - Handler registration

    func onReceiveMessage(_ handler: @escaping (MessagePayload) -> Void) {
        receiveMessageHandler = handler
    }

    func onMessageSent(_ handler: @escaping (MessagePayload) -> Void) {
        messageSentHandler = handler
    }
}

private final class ConnectionDelegate: HubConnectionDelegate {
    weak var owner: ChatConnection?
    init(owner: ChatConnection) { self.owner = owner }

    func connectionDidOpen(hubConnection: HubConnection) {
        Task { @MainActor in owner?.isConnected = true }
    }
    func connectionDidFailToOpen(error: Error) {
        Task { @MainActor in owner?.isConnected = false }
    }
    func connectionDidClose(error: Error?) {
        Task { @MainActor in owner?.isConnected = false }
    }
    func connectionWillReconnect(error: Error) {
        Task { @MainActor in owner?.isConnected = false }
    }
    func connectionDidReconnect() {
        Task { @MainActor in owner?.isConnected = true }
    }
}

enum ChatError: Error { case notConnected }

struct MessagePayload {
    let messageId:      String
    let conversationId: String
    let senderId:       String
    let content:        String
    let sentAt:         String

    init?(dict: [String: Any]) {
        guard let messageId      = dict["messageId"]      as? String,
              let conversationId = dict["conversationId"] as? String,
              let senderId       = dict["senderId"]       as? String,
              let content        = dict["content"]        as? String,
              let sentAt         = dict["sentAt"]         as? String else { return nil }
        self.messageId      = messageId
        self.conversationId = conversationId
        self.senderId       = senderId
        self.content        = content
        self.sentAt         = sentAt
    }
}
```

### 3.5. `ChatService.swift` ✅

```swift
import Foundation

@MainActor
final class ChatService: ObservableObject {
    static let shared = ChatService()

    @Published var conversations: [ConversationDto] = []
    @Published var threads: [String: [MessageDto]] = [:]   // conversationId → messages
    @Published private(set) var isConnected = false

    private let connection: ChatConnection

    private init() {
        connection = ChatConnection(
            url: AppConfig.signalRHubURL,
            tokenProvider: {
                try? await AuthManager.shared.client.auth.session.accessToken
            }
        )
        connection.onReceiveMessage { [weak self] payload in
            self?.handleIncoming(payload)
        }
        connection.onMessageSent { [weak self] payload in
            self?.handleSent(payload)
        }
    }

    // MARK: - Lifecycle

    func start() async {
        await connection.start()
        await refreshConversations()    // reconcile against DB on every (re)connect
    }
    func stop()      async { await connection.stop()      }
    func reconnect() async { await connection.reconnect() }

    // MARK: - Public API

    func send(to recipientId: String, content: String) async throws {
        try await connection.sendMessage(recipientId: recipientId, content: content)
    }
    func markRead(_ conversationId: String) async throws {
        try await connection.markRead(conversationId: conversationId)
    }

    func refreshConversations() async {
        do { conversations = try await APIClient.shared.getConversations() }
        catch { /* keep stale */ }
    }

    // MARK: - Event handlers

    private func handleIncoming(_ p: MessagePayload) {
        var messages = threads[p.conversationId] ?? []
        guard !messages.contains(where: { $0.id == p.messageId }) else { return }
        messages.append(MessageDto(from: p))
        threads[p.conversationId] = messages
        if let idx = conversations.firstIndex(where: { $0.id == p.conversationId }) {
            conversations[idx].lastMessage   = p.content
            conversations[idx].lastMessageAt = p.sentAt
            conversations[idx].hasUnread     = true
        }
    }

    private func handleSent(_ p: MessagePayload) {
        // Server confirmation of an outgoing message — replace optimistic local copy.
        guard var messages = threads[p.conversationId] else { return }
        if let idx = messages.firstIndex(where: { $0.id == p.messageId }) {
            messages[idx] = MessageDto(from: p)
            threads[p.conversationId] = messages
        }
    }
}
```

### 3.6. REST endpoints in `APIClient.swift` ✅

The WebSocket carries only **live** events. History (existing conversations and old messages) loads via REST:

```swift
struct ConversationDto: Decodable, Identifiable {
    let id: String
    let otherUserId: String
    let otherUsername: String
    let otherDisplayName: String
    var lastMessage: String?
    var lastMessageAt: String?
    var hasUnread: Bool
}

struct MessageDto: Decodable, Identifiable, Hashable {
    let id: String
    let conversationId: String
    let senderId: String
    let content: String
    let sentAt: String
    let readAt: String?
}

extension APIClient {
    func getConversations() async throws -> [ConversationDto] {
        let paged: PagedResponse<ConversationDto> = try await fetch("/api/chat/conversations")
        return paged.items
    }

    func getMessages(conversationId: String, before: String? = nil) async throws -> [MessageDto] {
        var path = "/api/chat/conversations/\(conversationId)/messages"
        if let before { path += "?before=\(before)" }
        let paged: PagedResponse<MessageDto> = try await fetch(path)
        return paged.items
    }

    func getOrCreateConversation(otherUserId: String) async throws -> ConversationDto {
        struct B: Encodable { let otherUserId: String }
        return try await fetch("/api/chat/conversations", method: "POST",
                               body: B(otherUserId: otherUserId))
    }

    func getMutualFollows() async throws -> [PersonResult] {
        let items: [PersonResponse] = try await fetch("/api/chat/mutual-follows")
        return items.map { PersonResult(from: $0) }
    }
}

extension MessageDto {
    init(from p: MessagePayload) {
        self.init(id: p.messageId, conversationId: p.conversationId,
                  senderId: p.senderId, content: p.content,
                  sentAt: p.sentAt, readAt: nil)
    }
}
```

### 3.7. Lifecycle wiring in `RootView.swift` ✅

```swift
@Environment(\.scenePhase) private var scenePhase

.onChange(of: scenePhase) { _, phase in
    switch phase {
    case .active:     Task { await ChatService.shared.start() }
    case .background: Task { await ChatService.shared.stop()  }
    default: break
    }
}
```

### 3.8. Token rotation ✅

Supabase rotates the access token roughly every hour. The SDK captures the token at build time, so simply restart the connection in `AuthManager.handle(event:session:)`:

```swift
case .tokenRefreshed:
    if let session {
        await APIClient.shared.setToken(session.accessToken)
        await ChatService.shared.reconnect()
    }
```

### 3.9. Reconciliation on (re)connect ✅

The SDK auto-reconnects after network blips, but messages may have been dropped during the gap. `ChatService.start()` already calls `refreshConversations()` after every successful connect — this is the catch-up step: any conversation that received a message during the offline period will show updated `lastMessage` / `hasUnread`. Open the thread → `getMessages(conversationId:)` → you have everything you missed. The web app does the exact same dance, so the two clients converge to the same state.

### 3.10. UI surfaces ✅

- **Conversations list** — accessible from a chat icon in the Profile screen header, gated on `flags.isEnabled("chat")`.
- **Chat thread** — push-navigated from a conversation row. `LazyVStack` reversed, latest at bottom. Composer pinned with `.safeAreaInset(edge: .bottom)`.
- **Unread badge** — derived from `ChatService.conversations.filter(\.hasUnread).count`, surfaced as `.badge(...)` on the chat icon.
- **No FAB** — floating buttons fight the tab bar; the chat icon lives in the Profile header.

---

## Phase 4 — Native iOS polish ✅

### 4.1. Pull-to-refresh ✅
Every list view: Feed, Notifications, Profile, Bookmarks, Drafts, Conversations.
```swift
ScrollView { ... }
    .refreshable { await vm.reload() }
```

### 4.2. Haptics ✅
Light impact on tap, success on completion. Add a helper:
```swift
// ByteAI/Shared/Extensions/Haptics.swift
import UIKit

enum Haptics {
    static func light()   { UIImpactFeedbackGenerator(style: .light).impactOccurred() }
    static func medium()  { UIImpactFeedbackGenerator(style: .medium).impactOccurred() }
    static func success() { UINotificationFeedbackGenerator().notificationOccurred(.success) }
    static func warning() { UINotificationFeedbackGenerator().notificationOccurred(.warning) }
    static func error()   { UINotificationFeedbackGenerator().notificationOccurred(.error) }
}
```

Trigger on:
- Like / unlike → `Haptics.light()`
- Bookmark → `Haptics.light()`
- Follow / unfollow → `Haptics.medium()`
- Post / comment submit → `Haptics.success()`
- Error toast → `Haptics.error()`
- Tab switch (compose FAB) → `Haptics.light()`

### 4.3. Share sheet ✅
Replace the no-op share button with a native `ShareLink`:
```swift
ShareLink(item: URL(string: "https://byteai.dev/post/\(post.id)")!,
          subject: Text(post.title),
          message: Text(post.body.prefix(140))) {
    Image(systemName: "square.and.arrow.up").foregroundColor(.byteText2)
}
```

### 4.4. Image caching 🚧 Code done · 👤 Kingfisher package pending
`AsyncImage` re-fetches every time the view comes back on-screen. For avatars & post images, use a small disk cache:

Option A — pull in [Kingfisher](https://github.com/onevcat/Kingfisher) (one Swift Package, drop-in `KFImage(url:)`).

Option B — write a 60-LOC `CachedAsyncImage` backed by `URLCache.shared` (set capacity to 50 MB in `ByteAIApp.init`).

Recommend Kingfisher — image caching is one of those things that's miserable to debug if homemade.

### 4.5. Empty & loading states ✅
For every list: a real "no comments yet"/"no posts yet" empty state with an SF Symbol and one-line CTA. Skeleton rows during initial load (3 fake rows with `.redacted(reason: .placeholder)`).

### 4.6. Dwell-time view tracking ✅
The web app fires `recordView(byteId, dwellMs)` after 2 seconds of detail visibility. Mirror it:
```swift
// PostDetailView
@State private var viewedAt: Date?
.onAppear { viewedAt = Date() }
.onDisappear {
    if let viewedAt {
        let dwell = Int(Date().timeIntervalSince(viewedAt) * 1000)
        if dwell > 2000 { Task { try? await APIClient.shared.recordView(postId: post.id, dwellMs: dwell) } }
    }
}
```

Add API method:
```swift
func recordView(postId: String, dwellMs: Int) async throws {
    struct B: Encodable { let dwellMs: Int }
    let _: EmptyResponse = try await fetch("/api/bytes/\(postId)/view", method: "POST", body: B(dwellMs: dwellMs))
}
```

### 4.7. Scroll-to-top on tab tap ✅
iOS convention: tapping the active tab scrolls the top scroll view to top. SwiftUI doesn't do this for free; use `ScrollViewReader` and a per-tab `selectedTabTapped` counter:
```swift
@State private var feedScrollToTop = 0
// tab change handler:
if oldValue == newValue, newValue == .feed { feedScrollToTop += 1 }
// in FeedView:
.onChange(of: feedScrollToTop) { _, _ in withAnimation { proxy.scrollTo("top", anchor: .top) } }
```

### 4.8. Keyboard avoidance & dismissal ✅
- `.scrollDismissesKeyboard(.interactively)` on every scroll view.
- `.submitLabel(.send)` on chat / comment composers.
- Tap-outside-to-dismiss for inline editors (`.onTapGesture { hideKeyboard() }` extension).

### 4.9. Accessibility pass ✅
- All icon-only buttons get `.accessibilityLabel("Like")` / `.accessibilityValue(isLiked ? "liked" : "not liked")`.
- Tap targets ≥ 44×44 pt.
- Honor `.dynamicTypeSize(...DynamicTypeSize.xxxLarge)` — no `.fixedSize()` on body text.

### 4.10. Toast / error surface ✅
Web uses Sonner. On iOS, a simple `@MainActor` toast manager + overlay banner:
```swift
// ByteAI/Shared/Toast.swift  — small overlay shown via .overlay on RootView
```
~80 LOC. Used by Auth errors, network failures, optimistic-update reverts.

---

## Phase 5 — Push notifications ❌ Backend work required before this is testable

### 5.1. Backend prerequisites ❌
- Apple Developer Program account active.
- App ID with **Push Notifications** capability enabled in Apple Developer portal.
- APNs **Auth Key (`.p8`)** generated; download once, store as backend env vars: `APNS_KEY_ID`, `APNS_TEAM_ID`, `APNS_KEY_P8` (the file contents, base64).
- Backend endpoint `POST /api/users/me/devices` storing `(user_id, apns_token, device_id, platform, created_at)`. Idempotent on `(user_id, apns_token)`.
- Backend endpoint `DELETE /api/users/me/devices/{token}` for sign-out.
- A worker / service that on `NotificationCreated` MediatR event sends APNs HTTP/2 push to all active tokens for that user.

### 5.2. Xcode setup 👤
- Target → **Signing & Capabilities** → `+ Capability` → **Push Notifications**.
- Add **Background Modes** → check **Remote notifications** (for silent pushes / badge updates).

### 5.3. Registration flow 🚧 iOS code done · ❌ backend endpoint missing

`ByteAIApp.swift`:
```swift
@UIApplicationDelegateAdaptor(AppDelegate.self) var appDelegate
```

`ByteAI/App/AppDelegate.swift`:
```swift
import UIKit
import UserNotifications

final class AppDelegate: NSObject, UIApplicationDelegate, UNUserNotificationCenterDelegate {
    func application(_ application: UIApplication,
                     didFinishLaunchingWithOptions options: [UIApplication.LaunchOptionsKey : Any]?) -> Bool {
        UNUserNotificationCenter.current().delegate = self
        return true
    }

    func application(_ application: UIApplication,
                     didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        let token = deviceToken.map { String(format: "%02x", $0) }.joined()
        Task { try? await APIClient.shared.registerDevice(apnsToken: token) }
    }

    func application(_ application: UIApplication,
                     didFailToRegisterForRemoteNotificationsWithError error: Error) {
        print("[Push] registration failed: \(error)")
    }

    // Foreground: still show the banner
    func userNotificationCenter(_ center: UNUserNotificationCenter,
                                willPresent notification: UNNotification) async
                                -> UNNotificationPresentationOptions {
        return [.banner, .sound, .badge]
    }

    // Tap: deep-link
    func userNotificationCenter(_ center: UNUserNotificationCenter,
                                didReceive response: UNNotificationResponse) async {
        let info = response.notification.request.content.userInfo
        if let postId = info["byteId"] as? String {
            await DeepLinkRouter.shared.openPost(id: postId)
        }
    }
}
```

Request permission after sign-in (not at launch — better UX):
```swift
// after AuthState becomes .authenticated:
Task {
    let granted = try? await UNUserNotificationCenter.current()
        .requestAuthorization(options: [.alert, .sound, .badge])
    if granted == true {
        await MainActor.run { UIApplication.shared.registerForRemoteNotifications() }
    }
}
```

API method:
```swift
func registerDevice(apnsToken: String) async throws {
    struct B: Encodable { let apnsToken: String; let platform: String = "ios" }
    let _: EmptyResponse = try await fetch("/api/users/me/devices", method: "POST", body: B(apnsToken: apnsToken))
}
```

### 5.4. Deep linking ✅
Define a tiny router that holds the desired tab + presented sheet, observed by `RootView`. On notification tap → set `router.tab = .feed` and push `PostDetailView(post:)` onto a `NavigationStack`.

(Universal links are deferred — for now, we only deep-link from in-app notifications, not from external URLs.)

### 5.5. Badge management ✅
- Set `UIApplication.shared.applicationIconBadgeNumber = unreadCount` whenever notifications/messages refresh.
- Clear on Notifications screen open.

---

## Execution order

| Step | Phase | Outcome | Status |
|---|---|---|---|
| 1 | 0 — Supabase migration + 1 — bug fixes | App can authenticate; feed shows real authors | 🚧 Code done · 👤 Xcode actions pending |
| 2 | 2.1 Comments + 2.5 Feature flags | Commenting works; FF ready for chat gate | ✅ Done |
| 3 | 2.2 Avatar + 2.3 Bookmarks + 2.4 Drafts | Profile complete; drafts unblocked | ✅ Done |
| 4–5 | 3 — SignalR chat (SDK) | Chat live | 🚧 Code done · 👤 Package install pending |
| 6 | 4.1–4.5 polish (refresh, haptics, share, images, empty states) | App feels native | 🚧 Kingfisher pkg pending; rest done |
| 7 | 4.6–4.10 polish (dwell, scroll-to-top, keyboard, a11y, toast) | A11y pass + toasts | ✅ Done |
| 8–9 | 5 — Push (after backend prereqs) | Push live | ❌ Needs backend work first |

**What's left for you to do (no code changes needed):**
1. Install 3 Swift packages in Xcode (Supabase, SignalRClient, Kingfisher)
2. Add the 17 new `.swift` files to the Xcode target (drag into navigator, tick ByteAI target)
3. Add scheme env vars `SUPABASE_URL` + `SUPABASE_ANON_KEY`
4. Add Push Notifications + Background Modes capabilities
5. Add `byteai://auth/callback` to Supabase dashboard Redirect URLs
6. Build device registration + APNs sender backend (Phase 5.1)

---

## Files to delete

| File | Status |
|------|--------|
| `ClerkKit` Swift Package | 👤 Remove in Xcode (Project navigator → right-click → Delete) |
| `ClerkPublishableKey` in `Resources/Info.plist` | ✅ Removed in code |
| All `Clerk.shared.*` references | ✅ Removed — replaced with `AuthManager.client.auth.*` |

## Files to add

All files are written. They still need to be **added to the Xcode target** (👤 drag into navigator, tick ByteAI target).

```
ByteAI/Core/Configuration.swift                    ✅ written
ByteAI/Core/FeatureFlags/FeatureFlagsManager.swift ✅ written
ByteAI/Core/Realtime/ChatConnection.swift          ✅ written
ByteAI/App/AppDelegate.swift                       ✅ written
ByteAI/App/DeepLinkRouter.swift                    ✅ written
ByteAI/Features/PostDetail/CommentsSheet.swift     ✅ written
ByteAI/Features/Profile/BookmarksView.swift        ✅ written
ByteAI/Features/Compose/DraftsListView.swift       ✅ written
ByteAI/Features/Chat/ChatService.swift             ✅ written
ByteAI/Features/Chat/ConversationsView.swift       ✅ written
ByteAI/Features/Chat/ChatThreadView.swift          ✅ written
ByteAI/Features/Chat/MessageBubble.swift           ✅ written
ByteAI/Features/Chat/ChatViewModels.swift          ✅ written
ByteAI/Shared/Extensions/Haptics.swift             ✅ written
ByteAI/Shared/Extensions/KeyboardDismiss.swift     ✅ written
ByteAI/Shared/Toast.swift                          ✅ written
```

## Files to modify

All modifications are applied.

```
ByteAI/App/ByteAIApp.swift           ✅ Supabase, AppDelegate, URLCache, ToastOverlay
ByteAI/App/RootView.swift            ✅ Tab enum, onChange syntax, FF gate, scene phase, badges
ByteAI/Core/Auth/AuthManager.swift   ✅ Full Supabase rewrite
ByteAI/Core/Network/APIClient.swift  ✅ Author fields, chat/drafts/device/flags endpoints
ByteAI/Features/Auth/AuthView.swift  ✅ Magic link only, new AuthManager API
ByteAI/Features/Profile/ProfileView.swift ✅ PhotosPicker, bookmarks/drafts/chat sheets
ByteAI/Features/Compose/ComposeView.swift ✅ Drafts toolbar, saveDraft, keyboard dismiss
ByteAI/Features/PostDetail/PostDetailView.swift ✅ CommentsSheet, ShareLink, dwell tracking
ByteAI/Features/Feed/FeedView.swift  ✅ Scroll-to-top, deep-link, haptics
ByteAI/Features/Notifications/NotificationsView.swift ✅ Skeleton rows, badge clear
ByteAI/Shared/Components/AvatarView.swift ✅ Kingfisher KFImage
ByteAI/Shared/Components/ByteButton.swift ✅ 44pt tap targets
ByteAI/Shared/Components/LoadingView.swift ✅ RowSkeleton, ConversationRowSkeleton
ByteAI/Features/Search/SearchView.swift ✅ 44pt clear-X tap target, accessibilityLabel
ByteAI/Resources/Info.plist          ✅ SupabaseURL/Key, NSPhotoLibraryUsageDescription, remote-notification bg mode
```

---

## Backend asks (track separately)

These are not iOS work but block iOS features:

| # | Item | Status |
|---|------|--------|
| 1 | `ByteResponse.cs` returns `authorUsername`, `authorDisplayName`, `authorAvatarUrl`, `tags`, `isLiked`, `isBookmarked` | ✅ Confirmed exists |
| 2 | `GET /api/feature-flags` for the current user's enabled flags | ✅ Confirmed exists (`FeatureFlagsController`) |
| 3 | `POST /api/users/me/devices` + `DELETE /api/users/me/devices/{token}` for push registration | ❌ Not built — needs new controller + table |
| 4 | APNs sender worker fired on `NotificationCreated` MediatR event | ❌ Not built — needs `INotificationSender` impl |
| 5 | Supabase URL allow-list must include `byteai://auth/callback` | 👤 Supabase dashboard config — not code |
| 6 | CORS / Gateway for native iOS clients | ✅ No-op — CORS is a browser construct; native requests are unaffected |

---

## Reference: the web ↔ iOS feature map

| Web route | iOS surface | Status |
|---|---|---|
| `/` (auth landing) | `AuthView` | 🚧 Code done · 👤 Supabase pkg + dashboard pending |
| `/onboarding` | `OnboardingView` | ✅ |
| `/feed` | `FeedView` (Bits tab) | ✅ |
| `/compose` | `ComposeView` (FAB sheet) + Drafts | ✅ |
| `/search` | `SearchView` (tab) | ✅ |
| `/profile` | `ProfileView` (tab) + Bookmarks + Drafts + avatar upload | ✅ |
| `/u/[username]` | `ProfileView(username:)` push | ✅ |
| `/post/[id]` | `PostDetailView` push | ✅ |
| `/post/[id]/comments` | `CommentsSheet` (sheet from PostDetail) | ✅ |
| `/interviews` | `InterviewsView` (tab) | ✅ |
| `/interviews/[id]` | `InterviewDetailView` push | ✅ |
| `/admin` | — (skipped on mobile) | n/a |
| Chat panel | `ConversationsView` + `ChatThreadView`, gated on FF | 🚧 Code done · 👤 SignalRClient pkg pending |
| Notifications | `NotificationsView` + push | 🚧 In-app done · ❌ Push needs backend |

---

## Appendix A — Native WebSocket fallback

Use this **only if** `SignalR-Client-Swift` becomes unmaintained, breaks against your hub version, or you have a hard zero-third-party-deps requirement. The public API (`start`, `stop`, `sendMessage`, `markRead`, `onReceiveMessage`, `onMessageSent`) is identical to the SDK wrapper, so swapping in is a one-file replacement of `ChatConnection.swift` — `ChatService.swift` doesn't need to change.


### A.1. The protocol (what you need to implement)

SignalR over WebSockets uses a tiny framing protocol:
- Every message is JSON, terminated by `` (record separator, 0x1E).
- First exchange after connect: a **handshake** — client sends `{"protocol":"json","version":1}`, server replies `{}`. After that, you're in the message loop.
- Message types you'll see (`type` field):
  - `1` — **Invocation** (`{"type":1,"target":"ReceiveMessage","arguments":[...]}`) — server calling a client method
  - `3` — **Completion** — response to a client invocation
  - `6` — **Ping** (`{"type":6}`) — keepalive, you must echo periodically
  - `7` — **Close**

You'll send:
- `{"type":1,"target":"SendMessage","arguments":[recipientId,content]}`
- `{"type":1,"target":"MarkRead","arguments":[conversationId]}`
- `{"type":6}` every 15s as keepalive

You'll receive:
- `ReceiveMessage` — incoming message from peer
- `MessageSent` — confirmation of own message

### A.2. URL & auth

iOS WebSocketTask cannot set an `Authorization` header. Use the documented query-string fallback:
```
wss://<host>/hubs/chat?access_token=<supabase_jwt>
```

The gateway already accepts this — see [`Service/ByteAI.Gateway/Middleware/ApiKeyMiddleware.cs:101-102`](../Service/ByteAI.Gateway/Middleware/ApiKeyMiddleware.cs#L101-L102).

### A.3. Files to add

```
ByteAI/Core/Realtime/
  SignalRConnection.swift     — WebSocket transport + protocol parser + invoke/on
  SignalRMessage.swift        — wire types (Invocation, Completion, Ping, Close)

ByteAI/Features/Chat/
  ChatLauncherButton.swift    — floating button, gated on flags.isEnabled("chat")
  ConversationsView.swift     — list of conversations
  ChatThreadView.swift        — message thread + composer
  MessageBubble.swift
  ChatViewModels.swift        — ConversationsVM, ChatThreadVM
```

### A.4. `SignalRConnection.swift` — the core (~250 LOC)

```swift
import Foundation

actor SignalRConnection {
    private let url: URL
    private let tokenProvider: () async -> String?
    private var task: URLSessionWebSocketTask?
    private var session: URLSession = .shared
    private var pingTask: Task<Void, Never>?
    private var receiveTask: Task<Void, Never>?
    private var reconnectAttempt = 0

    private static let recordSeparator: Character = "\u{1e}"

    // Handlers registered by feature code: target → callback
    private var handlers: [String: ([Any]) -> Void] = [:]

    init(url: URL, tokenProvider: @escaping () async -> String?) {
        self.url = url
        self.tokenProvider = tokenProvider
    }

    // MARK: - Connect

    func connect() async throws {
        guard let token = await tokenProvider() else { throw SignalRError.noToken }
        var comps = URLComponents(url: url, resolvingAgainstBaseURL: false)!
        comps.queryItems = (comps.queryItems ?? []) + [URLQueryItem(name: "access_token", value: token)]
        let wsURL = comps.url!

        task = session.webSocketTask(with: wsURL)
        task?.resume()

        // Handshake
        let handshake = #"{"protocol":"json","version":1}"# + String(Self.recordSeparator)
        try await task!.send(.string(handshake))

        // Read handshake reply
        let reply = try await task!.receive()
        guard case .string(let s) = reply, s.hasPrefix("{}") else {
            throw SignalRError.handshakeFailed
        }

        reconnectAttempt = 0
        startPingLoop()
        startReceiveLoop()
    }

    // MARK: - Public API

    func on(_ target: String, _ handler: @escaping ([Any]) -> Void) {
        handlers[target] = handler
    }

    func invoke(_ target: String, args: [any Encodable & Sendable]) async throws {
        let payload: [String: Any] = [
            "type": 1,
            "target": target,
            "arguments": args.map { try? JSONSerialization.jsonObject(with: JSONEncoder().encode([$0])) }
                .compactMap { ($0 as? [Any])?.first }
        ]
        let data = try JSONSerialization.data(withJSONObject: payload)
        var s = String(data: data, encoding: .utf8) ?? ""
        s.append(Self.recordSeparator)
        try await task?.send(.string(s))
    }

    func disconnect() {
        pingTask?.cancel(); pingTask = nil
        receiveTask?.cancel(); receiveTask = nil
        task?.cancel(with: .goingAway, reason: nil)
        task = nil
    }

    // MARK: - Loops

    private func startPingLoop() {
        pingTask?.cancel()
        pingTask = Task { [weak self] in
            while !Task.isCancelled {
                try? await Task.sleep(nanoseconds: 15_000_000_000)
                let ping = #"{"type":6}"# + String(Self.recordSeparator)
                try? await self?.task?.send(.string(ping))
            }
        }
    }

    private func startReceiveLoop() {
        receiveTask?.cancel()
        receiveTask = Task { [weak self] in
            guard let self else { return }
            do {
                while !Task.isCancelled, let task = await self.task {
                    let msg = try await task.receive()
                    if case .string(let s) = msg {
                        await self.handleFrames(s)
                    }
                }
            } catch {
                await self.handleDisconnect(error: error)
            }
        }
    }

    private func handleFrames(_ s: String) {
        // Split on record separator; each frame is a JSON object.
        for frame in s.split(separator: Self.recordSeparator) where !frame.isEmpty {
            guard let data = String(frame).data(using: .utf8),
                  let obj = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                  let type = obj["type"] as? Int else { continue }
            switch type {
            case 1:
                if let target = obj["target"] as? String,
                   let args = obj["arguments"] as? [Any] {
                    handlers[target]?(args)
                }
            case 6: break // ping echo — server happy
            case 7: Task { await handleDisconnect(error: SignalRError.serverClosed) }
            default: break
            }
        }
    }

    private func handleDisconnect(error: Error) async {
        task = nil
        pingTask?.cancel(); pingTask = nil
        let delay = min(pow(2.0, Double(reconnectAttempt)), 30.0)
        reconnectAttempt += 1
        try? await Task.sleep(nanoseconds: UInt64(delay * 1_000_000_000))
        try? await connect()
    }
}

enum SignalRError: Error { case noToken, handshakeFailed, serverClosed }
```

> **Note on the `invoke` arg encoding:** the snippet above is illustrative. In production, prefer a typed wrapper for each method:
> ```swift
> func sendMessage(recipientId: String, content: String) async throws {
>     struct Frame: Encodable { let type: Int; let target: String; let arguments: [String] }
>     let frame = Frame(type: 1, target: "SendMessage", arguments: [recipientId, content])
>     var s = String(data: try JSONEncoder().encode(frame), encoding: .utf8)!
>     s.append("\u{1e}")
>     try await task?.send(.string(s))
> }
> ```

### A.5. Wiring it up

```swift
// ByteAI/Features/Chat/ChatViewModels.swift

@MainActor
final class ChatService: ObservableObject {
    static let shared = ChatService()
    private let connection: SignalRConnection

    @Published var conversations: [ConversationDto] = []
    @Published var threads: [String: [MessageDto]] = [:] // conversationId → messages

    private init() {
        connection = SignalRConnection(
            url: AppConfig.signalRHubURL,
            
            tokenProvider: { try? await AuthManager.shared.client.auth.session.accessToken }
        )
        Task {
            await connection.on("ReceiveMessage") { args in
                Task { @MainActor in self.handleIncoming(args) }
            }
            await connection.on("MessageSent") { args in
                Task { @MainActor in self.handleSent(args) }
            }
        }
    }

    func start() async { try? await connection.connect() }
    func stop() async { await connection.disconnect() }

    private func handleIncoming(_ args: [Any]) { /* parse + append to threads */ }
    private func handleSent(_ args: [Any]) { /* mark optimistic message confirmed */ }

    func send(to recipientId: String, content: String) async throws {
        try await connection.invoke("SendMessage", args: [recipientId, content])
    }
    func markRead(_ conversationId: String) async throws {
        try await connection.invoke("MarkRead", args: [conversationId])
    }
}
```

REST endpoints to add to `APIClient.swift` (used to load history; the WebSocket only carries live events):
```swift
func getConversations() async throws -> [ConversationDto] { ... }
func getMessages(conversationId: String, before: String? = nil) async throws -> [MessageDto] { ... }
func getOrCreateConversation(otherUserId: String) async throws -> ConversationDto { ... }
func getMutualFollows() async throws -> [PersonResult] { ... }
```

Start/stop the connection on app foreground/background:
```swift
.onChange(of: scenePhase) { _, phase in
    switch phase {
    case .active:     Task { await ChatService.shared.start() }
    case .background: Task { await ChatService.shared.stop() }
    default: break
    }
}
```

Token rotation: when Supabase emits `.tokenRefreshed`, reconnect — easiest is to just call `connection.disconnect()` and `connection.connect()` again; the `tokenProvider` closure will fetch the new token.

### A.6. UI surfaces

- **Conversations list** — accessible from a chat icon in the Profile screen header (gated on `flags.isEnabled("chat")`).
- **Chat thread** — push-navigated from a conversation row. `LazyVStack` reversed, latest at bottom. Composer pinned to bottom with `.safeAreaInset(edge: .bottom)`.
- **Unread badge** — subscribe to `ChatService.conversations` and sum `hasUnread`; surface as a `.badge(...)` on the chat icon.
- **No FAB** for chat (web has `ChatLauncher` floating button; on iOS, integrate into the existing tab/header model — floating buttons fight the tab bar).

