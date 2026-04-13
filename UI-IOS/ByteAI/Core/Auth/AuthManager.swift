import Foundation
import Combine
import ClerkKit

// MARK: - Auth State

enum AuthState: Equatable {
    case unauthenticated
    case authenticated(user: User)
    case onboarding

    static func == (lhs: AuthState, rhs: AuthState) -> Bool {
        switch (lhs, rhs) {
        case (.unauthenticated, .unauthenticated): return true
        case (.onboarding, .onboarding):           return true
        case (.authenticated(let a), .authenticated(let b)): return a.id == b.id
        default: return false
        }
    }
}

// MARK: - AuthManager

@MainActor
final class AuthManager: ObservableObject {
    @Published var state: AuthState = .unauthenticated
    @Published var isLoading = false
    @Published var error: String?

    static let shared = AuthManager()
    private init() {
        restoreSession()
        observeUnauthorized()
    }

    private func observeUnauthorized() {
        NotificationCenter.default.addObserver(forName: .apiDidReceiveUnauthorized, object: nil, queue: .main) { [weak self] _ in
            guard let self else { return }
            Task { @MainActor in
                // Try to get a fresh Clerk token; if unavailable, sign out
                if let token = try? await Clerk.shared.auth.getToken() {
                    await APIClient.shared.setToken(token)
                } else {
                    self.signOut()
                }
            }
        }
    }

    // MARK: - Google OAuth

    func signInWithGoogle() async {
        isLoading = true
        defer { isLoading = false }
        error = nil
        do {
            _ = try await Clerk.shared.auth.signInWithOAuth(
                provider: .google,
                prefersEphemeralWebBrowserSession: false
            )
            await handleSessionEstablished()
        } catch let err {
            // If a session already exists just restore it
            if err.localizedDescription.contains("session_exists") || Clerk.shared.session != nil {
                await handleSessionEstablished()
            } else {
                self.error = err.localizedDescription
            }
        }
    }

    // MARK: - Email OTP

    func signInWithEmail(_ email: String) async {
        isLoading = true
        defer { isLoading = false }
        error = nil
        do {
            _ = try await Clerk.shared.auth.signInWithEmailCode(emailAddress: email)
        } catch {
            self.error = error.localizedDescription
        }
    }

    func verifyOTP(_ otp: String) async {
        isLoading = true
        defer { isLoading = false }
        error = nil
        do {
            guard let signIn = Clerk.shared.auth.currentSignIn else {
                self.error = "No active sign-in. Please try again."
                return
            }
            _ = try await signIn.verifyCode(otp)
            await handleSessionEstablished()
        } catch {
            self.error = error.localizedDescription
        }
    }

    // MARK: - Sign Up

    func signUp(firstName: String, lastName: String, username: String, email: String) async {
        isLoading = true
        defer { isLoading = false }
        error = nil
        do {
            let signUp = try await Clerk.shared.auth.signUp(
                emailAddress: email,
                firstName: firstName,
                lastName: lastName,
                username: username
            )
            _ = try await signUp.sendEmailCode()
        } catch {
            self.error = error.localizedDescription
        }
    }

    // MARK: - Sign Out

    func signOut() {
        Task {
            // Sign out all sessions, not just the current one
            try? await Clerk.shared.auth.signOut()
            await APIClient.shared.setToken(nil)
            UserDefaults.standard.removeObject(forKey: "byteai_onboarded")
            state = .unauthenticated
        }
    }

    // MARK: - Onboarding completion

    func completeOnboarding() async {
        guard case .onboarding = state else { return }
        UserDefaults.standard.set(true, forKey: "byteai_onboarded")
        do {
            let user = try await APIClient.shared.getMe()
            state = .authenticated(user: user)
        } catch {
            // API unavailable — return to auth so they can retry
            state = .unauthenticated
        }
    }

    // MARK: - Token refresh

    func refreshToken() async {
        guard let token = try? await Clerk.shared.auth.getToken() else { return }
        await APIClient.shared.setToken(token)
    }

    // MARK: - Private

    private func handleSessionEstablished() async {
        if let token = try? await Clerk.shared.auth.getToken() {
            await APIClient.shared.setToken(token)
        }
        await loadCurrentUser()
    }

    private func loadCurrentUser() async {
        // Re-fetch token in case it expired since handleSessionEstablished
        if let token = try? await Clerk.shared.auth.getToken() {
            await APIClient.shared.setToken(token)
        }
        do {
            let user = try await APIClient.shared.getMe()
            // User exists in backend — already registered, skip onboarding
            UserDefaults.standard.set(true, forKey: "byteai_onboarded")
            state = .authenticated(user: user)
        } catch {
            print("[AuthManager] getMe() failed: \(error)")
            let wasOnboarded = UserDefaults.standard.bool(forKey: "byteai_onboarded")
            if wasOnboarded {
                // Returning user — network/server error. Return to auth to retry.
                state = .unauthenticated
            } else {
                // Truly new user not yet in our DB — show onboarding
                state = .onboarding
            }
        }
    }

    private var _pendingUser: User?

    private func restoreSession() {
        Task {
            guard Clerk.shared.session != nil else { return }
            await handleSessionEstablished()
        }
    }

    var currentUser: User? {
        if case .authenticated(let user) = state { return user }
        return _pendingUser
    }
}
