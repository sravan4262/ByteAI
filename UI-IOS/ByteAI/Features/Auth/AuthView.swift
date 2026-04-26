import SwiftUI

// MARK: - Auth Screen
// Mirrors UI/components/features/auth/auth-screen.tsx + unified-auth-form.tsx
// Web parity: Google + GitHub OAuth only. No tabs, no email, no magic link.

struct AuthView: View {
    @EnvironmentObject private var authManager: AuthManager

    // Pre-composed tagline so the type checker doesn't choke on the 4-underline chain.
    private static let tagline: Text = {
        func underlined(_ s: String) -> Text { Text(s).underline().foregroundColor(.byteText2) }
        let dot = Text(". ").foregroundColor(.byteText2)
        let closer = Text("If that sounds like your feed — you're in the right place.")
            .foregroundColor(.byteText1)
            .fontWeight(.medium)
        return underlined("Job postings") + dot
            + underlined("Random videos") + dot
            + underlined("Dank memes") + dot
            + underlined("Content you never asked for") + dot
            + closer
    }()

    var body: some View {
        ZStack {
            Color.byteBackground.ignoresSafeArea()

            // Background grid + radial glow (subtle ambient)
            BackgroundGrid()
                .opacity(0.55)
                .blur(radius: 0.4)
                .allowsHitTesting(false)

            ScrollView {
                VStack(spacing: 20) {
                    // Brand
                    VStack(spacing: 10) {
                        Text("⚡").font(.system(size: 44))
                        VStack(spacing: 6) {
                            Group {
                                Text("Welcome to ")
                                    .foregroundColor(.byteText1)
                                + Text("ByteAI")
                                    .foregroundColor(.byteAccent)
                            }
                            .font(.byteSans(28, weight: .heavy))

                            Text("THE KNOWLEDGE LAYER FOR ")
                                .foregroundColor(.byteText2)
                            + Text("TECH PROFESSIONALS")
                                .foregroundColor(.byteAccent)
                        }
                        .font(.byteMono(10))
                        .tracking(1.8)
                        .multilineTextAlignment(.center)
                    }
                    .padding(.top, 60)

                    // Context copy — web parity: underlined "Job postings", "Random videos",
                    // "Dank memes", "Content you never asked for".
                    VStack(spacing: 8) {
                        Self.tagline.font(.byteSans(12))

                        (Text("ByteAI is strictly tech — knowledge, insights, and real interview experiences, ")
                            .foregroundColor(.byteText2)
                         + Text("shared by people who've been there.")
                            .foregroundColor(.byteText1))
                            .font(.byteSans(12))
                    }
                    .multilineTextAlignment(.center)
                    .lineSpacing(3)

                    // OAuth buttons (same faint-blue-tint pattern)
                    VStack(spacing: 13) {
                        ForEach(AuthProvider.allCases) { provider in
                            OAuthButton(
                                provider: provider,
                                isLoading: authManager.loadingProvider == provider,
                                isDisabled: authManager.isLoading
                            ) {
                                Task { await authManager.signIn(with: provider) }
                            }
                        }
                    }
                }
                .padding(.horizontal, 28)
                .padding(.bottom, 40)
            }
        }
        .alert("Error", isPresented: .constant(authManager.error != nil)) {
            Button("OK") { authManager.error = nil }
        } message: {
            Text(authManager.error ?? "")
        }
    }
}

// MARK: - OAuth Button (faint-blue-tint pattern)

private struct OAuthButton: View {
    let provider: AuthProvider
    let isLoading: Bool
    let isDisabled: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 9) {
                if isLoading {
                    ProgressView().tint(.byteText1).scaleEffect(0.85)
                } else {
                    Image(systemName: provider.iconAsset)
                        .font(.system(size: 15, weight: .semibold))
                }
                Text(isLoading ? "Redirecting…" : provider.label)
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
        .disabled(isDisabled)
        .opacity(isDisabled && !isLoading ? 0.5 : 1)
    }
}

// MARK: - Subtle background grid

private struct BackgroundGrid: View {
    var body: some View {
        Canvas { context, size in
            let spacing: CGFloat = 32
            var x: CGFloat = 0
            while x < size.width {
                var p = Path()
                p.move(to: CGPoint(x: x, y: 0))
                p.addLine(to: CGPoint(x: x, y: size.height))
                context.stroke(p, with: .color(IdentityColor.blue.tint(0.05)), lineWidth: 1)
                x += spacing
            }
            var y: CGFloat = 0
            while y < size.height {
                var p = Path()
                p.move(to: CGPoint(x: 0, y: y))
                p.addLine(to: CGPoint(x: size.width, y: y))
                context.stroke(p, with: .color(IdentityColor.blue.tint(0.05)), lineWidth: 1)
                y += spacing
            }
        }
    }
}

#Preview {
    AuthView().environmentObject(AuthManager.shared)
}
