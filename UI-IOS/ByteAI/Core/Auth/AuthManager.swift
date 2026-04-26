import Foundation
import Combine
import CryptoKit
import UIKit
import Supabase
import GoogleSignIn

// MARK: - Auth Provider

enum AuthProvider: String, CaseIterable, Identifiable {
    case google, github
    var id: String { rawValue }

    var label: String {
        switch self {
        case .google: return "Continue with Google"
        case .github: return "Continue with GitHub"
        }
    }

    var iconAsset: String {
        switch self {
        case .google: return "globe"        // Plain SF Symbol fallback; replace with brand asset later
        case .github: return "chevron.left.forwardslash.chevron.right"
        }
    }

    var supabaseProvider: Supabase.Provider {
        switch self {
        case .google: return .google
        case .github: return .github
        }
    }
}

// MARK: - Auth State

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
                await loadCurrentUser()
            } else {
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

    private func loadCurrentUser() async {
        do {
            let user = try await APIClient.shared.getMe()
            if user.isOnboarded {
                UserDefaults.standard.set(true, forKey: "byteai_onboarded")
                state = .authenticated(user: user)
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
    //
    // GitHub: still uses Supabase OAuth via ASWebAuthenticationSession. GitHub
    // has no first-party iOS SDK that returns an ID token, so the only way to
    // hide supabase.co there would be a server-side OAuth proxy — out of scope.

    func signIn(with provider: AuthProvider) async {
        loadingProvider = provider
        isLoading = true
        error = nil
        defer {
            loadingProvider = nil
            isLoading = false
        }
        switch provider {
        case .google: await signInWithGoogle()
        case .github: await signInWithGithub()
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
            clientID: AppConfig.googleIOSClientID
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

    private func signInWithGithub() async {
        do {
            try await client.auth.signInWithOAuth(
                provider: .github,
                redirectTo: URL(string: "byteai://auth/callback")
            )
        } catch {
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
        try? await client.auth.signOut()
        // observeAuthState will pick up .signedOut and reset state
    }

    func completeOnboarding() async {
        UserDefaults.standard.set(true, forKey: "byteai_onboarded")
        await loadCurrentUser()
    }

    // MARK: - Token

    func currentAccessToken() async -> String? {
        try? await client.auth.session.accessToken
    }

    var currentUser: User? {
        if case .authenticated(let user) = state { return user }
        return nil
    }
}
