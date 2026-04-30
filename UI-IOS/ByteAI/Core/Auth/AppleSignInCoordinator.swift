import AuthenticationServices
import CryptoKit
import Foundation
import UIKit

/// Bridges `ASAuthorizationController`'s delegate callbacks into a single
/// `async throws` Swift call site, so `AuthManager.signInWithApple()` reads
/// the same shape as `signInWithGoogle()`.
///
/// Mirrors the Google flow: caller generates a raw nonce, we hash it to
/// SHA-256 hex and pass that to Apple. Apple stamps the hashed nonce into
/// the ID token; Supabase verifies SHA256(rawNonce) == idToken.nonce.
@MainActor
final class AppleSignInCoordinator: NSObject {
    /// Result returned to `AuthManager`. The caller passes both fields to
    /// `client.auth.signInWithIdToken(provider: .apple, idToken:, nonce:)`.
    struct Result {
        let idToken: String
        let rawNonce: String
    }

    private var continuation: CheckedContinuation<Result, Error>?
    private var rawNonce: String = ""

    /// Present the system Apple sign-in sheet. Resolves with the ID token
    /// and the raw nonce, or throws (`ASAuthorizationError.canceled` for
    /// user-cancel — callers should swallow that one silently like Google).
    func signIn() async throws -> Result {
        let raw = Self.makeNonce()
        let hashed = Self.sha256Hex(raw)
        self.rawNonce = raw

        let request = ASAuthorizationAppleIDProvider().createRequest()
        request.requestedScopes = [.fullName, .email]
        request.nonce = hashed

        return try await withCheckedThrowingContinuation { cont in
            self.continuation = cont
            let controller = ASAuthorizationController(authorizationRequests: [request])
            controller.delegate = self
            controller.presentationContextProvider = self
            controller.performRequests()
        }
    }

    // MARK: - Nonce helpers (mirrors Google flow in AuthManager)

    private static func makeNonce() -> String {
        UUID().uuidString + UUID().uuidString
    }

    private static func sha256Hex(_ input: String) -> String {
        SHA256.hash(data: Data(input.utf8))
            .map { String(format: "%02x", $0) }
            .joined()
    }
}

// MARK: - ASAuthorizationControllerDelegate

extension AppleSignInCoordinator: ASAuthorizationControllerDelegate {
    func authorizationController(controller: ASAuthorizationController,
                                 didCompleteWithAuthorization authorization: ASAuthorization) {
        guard let credential = authorization.credential as? ASAuthorizationAppleIDCredential,
              let tokenData = credential.identityToken,
              let idToken = String(data: tokenData, encoding: .utf8) else {
            continuation?.resume(throwing: ASAuthorizationError(.failed))
            continuation = nil
            return
        }
        continuation?.resume(returning: Result(idToken: idToken, rawNonce: rawNonce))
        continuation = nil
    }

    func authorizationController(controller: ASAuthorizationController,
                                 didCompleteWithError error: Error) {
        continuation?.resume(throwing: error)
        continuation = nil
    }
}

// MARK: - Presentation context

extension AppleSignInCoordinator: ASAuthorizationControllerPresentationContextProviding {
    func presentationAnchor(for controller: ASAuthorizationController) -> ASPresentationAnchor {
        let scene = UIApplication.shared.connectedScenes
            .compactMap { $0 as? UIWindowScene }
            .first
        return scene?.windows.first(where: \.isKeyWindow)
            ?? scene?.windows.first
            ?? ASPresentationAnchor()
    }
}
