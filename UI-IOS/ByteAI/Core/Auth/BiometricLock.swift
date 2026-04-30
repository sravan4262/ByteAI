import Foundation
import LocalAuthentication
import Security

/// Local biometric (Face ID / Touch ID) lock for ByteAI.
///
/// **Important:** this is a UI gate sitting *on top of* the Supabase session.
/// Supabase-swift already persists tokens in the iOS Keychain and silently
/// refreshes them — that's how we rehydrate on cold launch. FaceID does NOT
/// re-authenticate. It just decides whether to show `BiometricLockView`
/// before letting the rest of the app render.
///
/// Storage lives in Keychain (not UserDefaults) to match the security model
/// of the Supabase tokens we're gating, and to survive offline/airplane mode
/// without leaking through plain disk reads.
@MainActor
final class BiometricLock {
    static let shared = BiometricLock()

    private let keychainService = "com.byteai.app.biometric"
    private let keychainAccount = "enabled"
    private let promptedDefaultsKey = "byteai_biometric_prompted"

    private init() {}

    // MARK: - Capability

    /// True iff the device has biometrics enrolled and the app can prompt.
    /// False on simulators, locked-out devices, and devices with no enrolled face/finger.
    var isAvailable: Bool {
        var error: NSError?
        let ok = LAContext().canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &error)
        return ok && error == nil
    }

    /// Reports the kind of biometric the device offers, used to label the
    /// lock-screen button ("Unlock with Face ID" vs "Unlock with Touch ID").
    var biometryType: LABiometryType {
        let ctx = LAContext()
        // canEvaluatePolicy must be called before biometryType is populated.
        _ = ctx.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: nil)
        return ctx.biometryType
    }

    // MARK: - Enabled flag (Keychain-backed)

    var isEnabled: Bool {
        get { keychainReadBool() }
        set {
            keychainWriteBool(newValue)
            if newValue { hasPrompted = true }
        }
    }

    /// Whether we've already shown the first-run opt-in prompt to this user.
    /// Stored in UserDefaults — losing it just means asking once more, no security cost.
    var hasPrompted: Bool {
        get { UserDefaults.standard.bool(forKey: promptedDefaultsKey) }
        set { UserDefaults.standard.set(newValue, forKey: promptedDefaultsKey) }
    }

    /// Clears the enabled state on sign-out so the lock doesn't carry over to
    /// the next session. hasPrompted is intentionally kept so the one-time opt-in
    /// sheet doesn't re-appear every sign-in — the Prefs toggle handles re-enabling.
    func clearOnSignOut() {
        keychainDelete()
    }

    // MARK: - Evaluate

    /// Run a biometric (or biometric+passcode-fallback) prompt.
    /// - Parameters:
    ///   - reason: shown to the user inside Apple's system sheet.
    ///   - allowPasscodeFallback: when true uses `.deviceOwnerAuthentication`
    ///     instead of the biometrics-only policy. Used after the user has
    ///     failed FaceID a few times on the lock screen.
    /// - Returns: true on success. Throws on cancel / system error so callers
    ///   can decide whether to retry, sign out, etc.
    func evaluate(reason: String, allowPasscodeFallback: Bool = false) async throws -> Bool {
        let ctx = LAContext()
        ctx.localizedFallbackTitle = allowPasscodeFallback ? "Use Passcode" : ""
        let policy: LAPolicy = allowPasscodeFallback
            ? .deviceOwnerAuthentication
            : .deviceOwnerAuthenticationWithBiometrics
        return try await ctx.evaluatePolicy(policy, localizedReason: reason)
    }

    // MARK: - Keychain helpers

    private func keychainReadBool() -> Bool {
        var query = baseQuery()
        query[kSecReturnData as String] = true
        query[kSecMatchLimit as String] = kSecMatchLimitOne
        var item: CFTypeRef?
        let status = SecItemCopyMatching(query as CFDictionary, &item)
        guard status == errSecSuccess, let data = item as? Data, let str = String(data: data, encoding: .utf8) else {
            return false
        }
        return str == "1"
    }

    private func keychainWriteBool(_ value: Bool) {
        let data = (value ? "1" : "0").data(using: .utf8)!
        var query = baseQuery()
        let status = SecItemCopyMatching(query as CFDictionary, nil)
        if status == errSecSuccess {
            let attrs: [String: Any] = [kSecValueData as String: data]
            SecItemUpdate(query as CFDictionary, attrs as CFDictionary)
        } else {
            query[kSecValueData as String] = data
            query[kSecAttrAccessible as String] = kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly
            SecItemAdd(query as CFDictionary, nil)
        }
    }

    private func keychainDelete() {
        SecItemDelete(baseQuery() as CFDictionary)
    }

    private func baseQuery() -> [String: Any] {
        [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: keychainService,
            kSecAttrAccount as String: keychainAccount,
        ]
    }
}

extension LABiometryType {
    /// SF Symbol name for the lock screen / settings row.
    var iconName: String {
        switch self {
        case .faceID: return "faceid"
        case .touchID: return "touchid"
        case .opticID: return "opticid"
        default: return "lock.fill"
        }
    }

    /// Human label used in button copy and the settings toggle.
    var label: String {
        switch self {
        case .faceID: return "Face ID"
        case .touchID: return "Touch ID"
        case .opticID: return "Optic ID"
        default: return "Biometrics"
        }
    }
}
