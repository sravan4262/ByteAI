import SwiftUI

/// One-time prompt shown to users who land on the main app with a working
/// biometric sensor and haven't been asked yet. Choosing **Enable** runs a
/// real `evaluate` so we don't claim it's on until the device confirms it.
/// **Not now** just dismisses — `BiometricLock.hasPrompted` is set by the
/// caller before showing, so we don't re-ask if the user closes the sheet.
struct BiometricOptInSheet: View {
    @Environment(\.dismiss) private var dismiss
    @State private var isEvaluating = false
    @State private var errorMessage: String?

    private let lock = BiometricLock.shared

    private var biometryLabel: String { lock.biometryType.label }
    private var biometryIcon: String { lock.biometryType.iconName }

    var body: some View {
        ZStack {
            Color.byteBackground.ignoresSafeArea()

            VStack(spacing: 22) {
                Spacer(minLength: 12)

                Image(systemName: biometryIcon)
                    .font(.system(size: 56, weight: .light))
                    .foregroundColor(.byteAccent)

                VStack(spacing: 6) {
                    Text("Use \(biometryLabel) to unlock ByteAI?")
                        .font(.byteSans(18, weight: .heavy))
                        .foregroundColor(.byteText1)
                        .multilineTextAlignment(.center)
                    Text("ByteAI stays signed in. \(biometryLabel) is just a quick check before the app opens — you can turn it off anytime in Preferences.")
                        .font(.byteBodySmall)
                        .foregroundColor(.byteText2)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal, 24)
                }

                if let errorMessage {
                    Text(errorMessage)
                        .font(.byteTerminalSmall)
                        .foregroundColor(.red)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal, 24)
                }

                Spacer(minLength: 12)

                VStack(spacing: 10) {
                    Button {
                        Task { await enable() }
                    } label: {
                        HStack(spacing: 9) {
                            if isEvaluating { ProgressView().tint(.byteText1).scaleEffect(0.85) }
                            Text(isEvaluating ? "Authenticating…" : "Enable \(biometryLabel)")
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
                        dismiss()
                    } label: {
                        Text("Not now")
                            .font(.byteMono(11, weight: .semibold))
                            .tracking(1)
                            .foregroundColor(.byteText2)
                    }
                    .buttonStyle(.plain)
                    .disabled(isEvaluating)
                }
                .padding(.horizontal, 24)
                .padding(.bottom, 18)
            }
        }
    }

    @MainActor
    private func enable() async {
        guard !isEvaluating else { return }
        isEvaluating = true
        errorMessage = nil
        defer { isEvaluating = false }
        do {
            let ok = try await lock.evaluate(reason: "Enable \(biometryLabel) for ByteAI")
            if ok {
                lock.isEnabled = true
                dismiss()
            }
        } catch {
            errorMessage = "Couldn't enable \(biometryLabel). Try again from Preferences."
        }
    }
}
