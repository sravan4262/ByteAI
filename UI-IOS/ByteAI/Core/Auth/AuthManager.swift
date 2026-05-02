import Foundation
import Combine
import CryptoKit
import UIKit
import AuthenticationServices
import Supabase
import GoogleSignIn

// MARK: - Auth Provider

enum AuthProvider: String, CaseIterable, Identifiable {
    case apple, google
    var id: String { rawValue }

    var label: String {
        switch self {
        case .apple:  return "Continue with Apple"
        case .google: return "Continue with Google"
        }
    }

    var iconAsset: String {
        switch self {
        case .apple:  return "applelogo"
        case .google: return "globe"
        }
    }

    var supabaseProvider: Supabase.Provider {
        switch self {
        case .apple:  return .apple
        case .google: return .google
        }
    }
}

// MARK: - Auth State

enum AuthState: Equatable {
    case unauthenticated
    case onboarding
    /// Supabase session is valid AND the user has FaceID lock enabled.
    /// `BiometricLockView` is shown until they unlock; transitions to
    /// `.authenticated` on success. Holds the user so views bound to
    /// `currentUser` (e.g. tab badge) keep working through the lock.
    case locked(user: User)
    case authenticated(user: User)

    static func == (lhs: AuthState, rhs: AuthState) -> Bool {
        switch (lhs, rhs) {
        case (.unauthenticated, .unauthenticated): return true
        case (.onboarding, .onboarding):           return true
        case (.locked(let a), .locked(let b)):     return a.id == b.id
        case (.authenticated(let a), .authenticated(let b)): return a.id == b.id
        default: return false
        }
    }
}

// MARK: - AuthManager (Supabase)

@MainActor
final class AuthManager: ObservableObject {
    @Published var state: AuthState = .unauthenticated
    @Published var isLoading = false
    @Published var error: String?
    @Published var loadingProvider: AuthProvider?

    static let shared = AuthManager()

    let client = SupabaseClient(
        supabaseURL: AppConfig.supabaseURL,
        supabaseKey: AppConfig.supabaseAnonKey,
        options: SupabaseClientOptions(
            auth: SupabaseClientOptions.AuthOptions(
                emitLocalSessionAsInitialSession: true
            )
        )
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
        case .signedIn:
            if let session {
                await APIClient.shared.setToken(session.accessToken)
                // Front-load provision on sign-in (matches web's onboarding-check screen).
                // Idempotent on the backend — safe to call every sign-in.
                let isOnboarded = await provisionFromSession(session)
                if isOnboarded == false {
                    // New (or partially-onboarded) user — go straight to onboarding.
                    UserDefaults.standard.removeObject(forKey: "byteai_onboarded")
                    state = .onboarding
                } else {
                    // Onboarded, or provision failed (fall back to /me as source of truth).
                    await loadCurrentUser()
                }
            } else {
                state = .unauthenticated
            }
        case .initialSession, .userUpdated:
            if let session {
                await APIClient.shared.setToken(session.accessToken)
                // Cold launch with a Keychain-restored session is the one path
                // where we honor the biometric lock. .userUpdated mid-session
                // (e.g. email change) shouldn't re-lock the user.
                let lockOnLaunch = (event == .initialSession) && isColdLaunch
                isColdLaunch = false
                await loadCurrentUser(applyBiometricLock: lockOnLaunch)
            } else {
                isColdLaunch = false
                state = .unauthenticated
            }
        case .tokenRefreshed:
            if let session {
                await APIClient.shared.setToken(session.accessToken)
                await ChatService.shared.reconnect()
            }
        case .signedOut:
            await APIClient.shared.setToken(nil)
            UserDefaults.standard.removeObject(forKey: "byteai_onboarded")
            state = .unauthenticated
        default:
            break
        }
    }

    /// `true` only on the very first event delivered after process launch.
    /// Used to gate the FaceID lock — a user who *just* completed OAuth in
    /// this session should not be re-locked, only a returning user with a
    /// pre-existing Keychain session should be.
    private var isColdLaunch = true

    private func loadCurrentUser(applyBiometricLock: Bool = false) async {
        do {
            let user = try await APIClient.shared.getMe()
            if user.isOnboarded {
                UserDefaults.standard.set(true, forKey: "byteai_onboarded")
                if applyBiometricLock,
                   BiometricLock.shared.isEnabled,
                   BiometricLock.shared.isAvailable {
                    state = .locked(user: user)
                } else {
                    state = .authenticated(user: user)
                }
            } else {
                UserDefaults.standard.removeObject(forKey: "byteai_onboarded")
                state = .onboarding
            }
        } catch APIError.http(let code, _) where code == 404 {
            state = .onboarding
        } catch APIError.unauthorized {
            // 401 — refresh path is handled by observeUnauthorized; don't fall through to onboarding.
            print("[Auth] loadCurrentUser unauthorized — awaiting refresh or sign-out")
        } catch APIError.http(let code, _) where code == 403 {
            // Stale session (Keychain survives app deletion; token may be revoked or env-mismatched).
            // Clear it so the user lands on the auth screen, not onboarding.
            print("[Auth] loadCurrentUser forbidden — clearing stale session")
            try? await client.auth.signOut()
        } catch {
            print("[Auth] loadCurrentUser failed: \(error)")
            let wasOnboarded = UserDefaults.standard.bool(forKey: "byteai_onboarded")
            state = wasOnboarded ? .unauthenticated : .onboarding
        }
    }

    /// Returns the backend's `isOnboarded` flag, or `nil` if provisioning failed.
    private func provisionFromSession(_ session: Session) async -> Bool? {
        let meta = session.user.userMetadata
        let displayName = meta["full_name"]?.stringValue
            ?? meta["name"]?.stringValue
            ?? session.user.email?.components(separatedBy: "@").first
            ?? "Developer"
        let avatarUrl = meta["avatar_url"]?.stringValue ?? meta["picture"]?.stringValue
        do {
            let isOnboarded = try await APIClient.shared.provisionUser(
                displayName: displayName,
                email: session.user.email,
                avatarUrl: avatarUrl
            )
            print("[Auth] provisioned user (supabase: \(session.user.id), onboarded: \(isOnboarded))")
            return isOnboarded
        } catch {
            print("[Auth] provision failed: \(error)")
            return nil
        }
    }

    private func observeUnauthorized() {
        NotificationCenter.default.addObserver(
            forName: .apiDidReceiveUnauthorized, object: nil, queue: .main
        ) { [weak self] _ in
            Task { @MainActor in
                guard let self else { return }
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
    //
    // Google: native GoogleSignIn SDK → ID token → signInWithIdToken. The Google
    // sheet talks to accounts.google.com directly, so the consent screen shows
    // "Sign in to ByteAI" (no Supabase URL ever appears).
    func signIn(with provider: AuthProvider) async {
        loadingProvider = provider
        isLoading = true
        error = nil
        defer {
            loadingProvider = nil
            isLoading = false
        }
        switch provider {
        case .apple:  await signInWithApple()
        case .google: await signInWithGoogle()
        }
    }

    /// Apple sign-in: native AuthenticationServices sheet → ID token + raw
    /// nonce → `signInWithIdToken`. Mirrors the Google flow exactly so the
    /// rest of the auth state machine doesn't care how we got here.
    /// Required by App Review Guideline 4.8 once any 3rd-party login is offered.
    private func signInWithApple() async {
        let coordinator = AppleSignInCoordinator()
        do {
            let result = try await coordinator.signIn()
            try await client.auth.signInWithIdToken(
                credentials: OpenIDConnectCredentials(
                    provider: .apple,
                    idToken: result.idToken,
                    nonce: result.rawNonce
                )
            )
        } catch let error as ASAuthorizationError where error.code == .canceled {
            // User dismissed the sheet — silent, like Google's `.canceled`.
        } catch {
            print("[Auth] Apple sign-in failed: \(error)")
            self.error = "Sign-in failed — try again"
        }
    }

    private func signInWithGoogle() async {
        guard let presenter = topViewController() else {
            self.error = "Sign-in failed — try again"
            return
        }

        // Nonce: raw goes to Supabase, SHA-256 hex goes to Google.
        // Supabase verifies SHA256(rawNonce) == ID token's `nonce` claim.
        let rawNonce = UUID().uuidString + UUID().uuidString
        let hashedNonce = SHA256.hash(data: Data(rawNonce.utf8))
            .map { String(format: "%02x", $0) }
            .joined()

        // GIDClientID is read from Info.plist automatically. Setting it
        // explicitly here makes the dependency obvious and lets us fail fast
        // with a clear error if it's missing.
        GIDSignIn.sharedInstance.configuration = GIDConfiguration(
            clientID: AppConfig.googleIOSClientID,
            serverClientID: AppConfig.googleWebClientID
        )

        do {
            let result = try await GIDSignIn.sharedInstance.signIn(
                withPresenting: presenter,
                hint: nil,
                additionalScopes: nil,
                nonce: hashedNonce
            )
            guard let idToken = result.user.idToken?.tokenString else {
                self.error = "Sign-in failed — try again"
                return
            }
            try await client.auth.signInWithIdToken(
                credentials: OpenIDConnectCredentials(
                    provider: .google,
                    idToken: idToken,
                    nonce: rawNonce
                )
            )
        } catch let error as NSError where
            error.domain == kGIDSignInErrorDomain &&
            error.code == GIDSignInError.canceled.rawValue {
            // User dismissed the sheet — not an error worth surfacing.
        } catch {
            print("[Auth] Google sign-in failed: \(error)")
            self.error = "Sign-in failed — try again"
        }
    }

    private func topViewController() -> UIViewController? {
        guard let scene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
              let window = scene.windows.first(where: \.isKeyWindow) ?? scene.windows.first,
              var top = window.rootViewController else { return nil }
        while let presented = top.presentedViewController { top = presented }
        return top
    }

    // MARK: - URL handling (OAuth callback)

    func handle(url: URL) {
        Task { try? await client.auth.session(from: url) }
    }

    // MARK: - Sign out / onboarding

    func signOut() async {
        // Unregister APNs token before clearing the auth session so the call has a valid bearer token.
        if let apnsToken = UserDefaults.standard.string(forKey: "byteai_apns_token") {
            try? await APIClient.shared.unregisterDevice(apnsToken: apnsToken)
            UserDefaults.standard.removeObject(forKey: "byteai_apns_token")
        }
        // New device / new user on this device → re-opt-in required.
        BiometricLock.shared.clearOnSignOut()
        try? await client.auth.signOut()
        // observeAuthState will pick up .signedOut and reset state
    }

    // MARK: - Biometric lock transitions
    //
    // FaceID is a UI gate, not a re-auth: the Supabase session stays valid
    // through these transitions, so APIClient + ChatService don't need to
    // tear down. RootView is the only listener that cares about the switch.

    /// Move from `.authenticated` to `.locked`. No-op for any other state.
    /// Called from RootView on `scenePhase → .background` when the user has
    /// FaceID enabled.
    func lock() {
        if case .authenticated(let user) = state {
            state = .locked(user: user)
        }
    }

    /// Move from `.locked` to `.authenticated`. Called by `BiometricLockView`
    /// after a successful FaceID/passcode evaluation.
    func unlock() {
        if case .locked(let user) = state {
            state = .authenticated(user: user)
        }
    }

    func completeOnboarding() async {
        UserDefaults.standard.set(true, forKey: "byteai_onboarded")
        await loadCurrentUser()
    }

    // MARK: - Token

    func currentAccessToken() async -> String? {
        try? await client.auth.session.accessToken
    }

    /// Force a Supabase token refresh. Used by the auto-unlock path on
    /// `scenePhase → .active` so the user always returns from background
    /// with a fresh access token. Throws on network or refresh-token failure
    /// so callers can decide whether to surface the manual unlock UI.
    func refreshSession() async throws {
        let session = try await client.auth.refreshSession()
        await APIClient.shared.setToken(session.accessToken)
    }

    var currentUser: User? {
        switch state {
        case .authenticated(let user), .locked(let user): return user
        default: return nil
        }
    }

    /// Apply a freshly-uploaded avatar URL to the current session user. Updates
    /// `state` so any view bound to `currentUser` repaints, and broadcasts an
    /// avatarChanged notification so non-bound views (post cards, comment rows
    /// holding captured user copies) can refresh their cached image.
    func applyAvatarUpdate(_ url: String?) {
        switch state {
        case .authenticated(var user):
            user.avatarUrl = url
            state = .authenticated(user: user)
            broadcastAvatarChanged(userId: user.id, url: url)
        case .locked(var user):
            user.avatarUrl = url
            state = .locked(user: user)
            broadcastAvatarChanged(userId: user.id, url: url)
        default:
            return
        }
    }

    private func broadcastAvatarChanged(userId: String, url: String?) {
        NotificationCenter.default.post(
            name: .avatarChanged,
            object: nil,
            userInfo: ["userId": userId, "avatarUrl": url ?? ""]
        )
    }

    /// Apply the user's freshly-saved tech-stack preferences to the current
    /// session user. Updates `state` so views bound to `currentUser` repaint,
    /// and broadcasts `techStackChanged` so the For-You feed can mirror the
    /// new filter without re-mounting.
    func applyTechStackUpdate(_ stack: [String]) {
        switch state {
        case .authenticated(var user):
            user.techStack = stack
            state = .authenticated(user: user)
            broadcastTechStackChanged(userId: user.id, stack: stack)
        case .locked(var user):
            user.techStack = stack
            state = .locked(user: user)
            broadcastTechStackChanged(userId: user.id, stack: stack)
        default:
            return
        }
    }

    private func broadcastTechStackChanged(userId: String, stack: [String]) {
        NotificationCenter.default.post(
            name: .techStackChanged,
            object: nil,
            userInfo: ["userId": userId, "techStack": stack]
        )
    }

    /// Refetch `/users/me` from the server and update `state`. Used after
    /// profile edits (avatar, display name) so the auth-scoped user object
    /// stays in sync without needing to sign-out/in.
    func refreshCurrentUser() async {
        await loadCurrentUser()
    }
}
