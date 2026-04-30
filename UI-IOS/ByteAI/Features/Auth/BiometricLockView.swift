import SwiftUI
import LocalAuthentication

/// Lock screen shown when the Supabase session is valid AND the user has
/// FaceID lock enabled. NOT a re-authentication: success just transitions
/// `AuthManager.state` from `.locked` back to `.authenticated`.
///
/// Auto-prompts on appear (Apple HIG: don't make the user tap a button to
/// see the system FaceID sheet). Falls back to device passcode after 3
/// failed attempts. Always offers a "Sign out instead" escape hatch in
/// case the user is genuinely stuck.
struct BiometricLockView: View {
    @EnvironmentObject private var authManager: AuthManager
    @State private var failedAttempts = 0
    @State private var isEvaluating = false

    private let lock = BiometricLock.shared

    private var biometryLabel: String { lock.biometryType.label }
    private var biometryIcon: String { lock.biometryType.iconName }

    var body: some View {
        ZStack {
            Color.byteBackground.ignoresSafeArea()

            VStack(spacing: 28) {
                Spacer()

                ByteAILogoView(size: .lg, showText: false)

                VStack(spacing: 6) {
                    Text("ByteAI is locked")
                        .font(.byteSans(20, weight: .heavy))
                        .foregroundColor(.byteText1)
                    Text("Use \(biometryLabel) to continue")
                        .font(.byteMono(11))
                        .tracking(1.2)
                        .foregroundColor(.byteText2)
                }

                Spacer()

                VStack(spacing: 14) {
                    Button {
                        Task { await runEvaluation() }
                    } label: {
                        HStack(spacing: 10) {
                            if isEvaluating {
                                ProgressView().tint(.byteText1).scaleEffect(0.85)
                            } else {
                                Image(systemName: biometryIcon)
                                    .font(.system(size: 16, weight: .semibold))
                            }
                            Text(isEvaluating ? "Authenticating…" : "Unlock with \(biometryLabel)")
                                .font(.byteMono(13, weight: .semibold))
                                .tracking(0.5)
                        }
                        .foregroundColor(.byteText1)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 14)
                        .background(IdentityColor.blue.bgFaint)
                        .overlay(
                            RoundedRectangle(cornerRadius: 10)
                                .stroke(IdentityColor.blue.borderFaint, lineWidth: 1)
                        )
                        .clipShape(RoundedRectangle(cornerRadius: 10))
                    }
                    .buttonStyle(.plain)
                    .disabled(isEvaluating)

                    Button {
                        Task { await authManager.signOut() }
                    } label: {
                        Text("Sign out instead")
                            .font(.byteMono(11, weight: .semibold))
                            .tracking(1)
                            .foregroundColor(.byteText2)
                    }
                    .buttonStyle(.plain)
                    .disabled(isEvaluating)
                }
                .padding(.horizontal, 28)
                .padding(.bottom, 40)
            }
        }
        // Apple HIG: present the biometric prompt automatically — the user
        // shouldn't have to tap a button just to see the system sheet.
        .task { await runEvaluation() }
    }

    @MainActor
    private func runEvaluation() async {
        guard !isEvaluating else { return }
        isEvaluating = true
        defer { isEvaluating = false }

        // After 3 failures swap to the passcode-fallback policy so a user
        // with a covered face / broken sensor can still get into the app.
        let allowPasscode = failedAttempts >= 3
        do {
            let ok = try await lock.evaluate(
                reason: "Unlock ByteAI",
                allowPasscodeFallback: allowPasscode
            )
            if ok {
                authManager.unlock()
            }
        } catch let nsError as NSError where nsError.code == LAError.userCancel.rawValue {
            // User dismissed the sheet — silent. They can re-tap "Unlock".
        } catch {
            failedAttempts += 1
        }
    }
}
