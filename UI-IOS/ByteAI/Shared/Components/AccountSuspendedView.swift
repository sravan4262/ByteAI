import SwiftUI

/// Full-screen takeover shown when the API returns 403 ACCOUNT_SUSPENDED.
/// The app root mounts this in place of its content; once the user taps
/// SIGN OUT we drop the local Supabase session and route back to sign-in.
struct AccountSuspendedView: View {
    let message: String
    let onSignOut: () -> Void

    private let supportEmail = "officialbyteai@gmail.com"

    var body: some View {
        ZStack {
            Color.byteBackground.ignoresSafeArea()

            VStack(alignment: .leading, spacing: 20) {
                header

                VStack(alignment: .leading, spacing: 10) {
                    Text("YOUR ACCOUNT IS SUSPENDED")
                        .font(.byteTitleMedium)
                        .foregroundColor(.byteText1)

                    Text(message)
                        .font(.byteBodyMedium)
                        .foregroundColor(.byteText2)
                        .lineSpacing(3)
                        .fixedSize(horizontal: false, vertical: true)
                }

                supportLink

                Button(action: onSignOut) {
                    Text("SIGN OUT")
                        .font(.byteMono(12, weight: .bold))
                        .tracking(1.0)
                        .foregroundColor(.byteText1)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 14)
                        .background(Color.byteElement)
                        .overlay(
                            RoundedRectangle(cornerRadius: 10)
                                .stroke(Color.byteBorderHigh, lineWidth: 1)
                        )
                        .clipShape(RoundedRectangle(cornerRadius: 10))
                }
                .buttonStyle(.plain)
            }
            .padding(20)
            .frame(maxWidth: 420)
            .background(
                RoundedRectangle(cornerRadius: 14)
                    .fill(Color.byteCard)
                    .overlay(
                        RoundedRectangle(cornerRadius: 14)
                            .stroke(Color.byteRed.opacity(0.35), lineWidth: 1)
                    )
            )
            .padding(.horizontal, 16)
        }
    }

    private var header: some View {
        HStack(spacing: 10) {
            Image(systemName: "xmark.octagon.fill")
                .font(.system(size: 20))
                .foregroundColor(.byteRed)
            Text("ACCOUNT_SUSPENDED")
                .font(.byteMono(11, weight: .bold))
                .tracking(0.8)
                .foregroundColor(.byteRed)
                .padding(.horizontal, 8).padding(.vertical, 3)
                .background(Color.byteRed.opacity(0.12))
                .overlay(
                    RoundedRectangle(cornerRadius: 5)
                        .stroke(Color.byteRed.opacity(0.4), lineWidth: 1)
                )
                .clipShape(RoundedRectangle(cornerRadius: 5))
            Spacer()
        }
    }

    private var supportLink: some View {
        Link(destination: URL(string: "mailto:\(supportEmail)?subject=Account%20suspension%20appeal")!) {
            HStack(spacing: 8) {
                Image(systemName: "envelope")
                    .font(.system(size: 13))
                    .foregroundColor(.byteAccent)
                Text(supportEmail)
                    .font(.byteMono(11, weight: .regular))
                    .foregroundColor(.byteText1)
                Spacer()
            }
            .padding(.horizontal, 12).padding(.vertical, 10)
            .background(Color.byteElement)
            .overlay(
                RoundedRectangle(cornerRadius: 10)
                    .stroke(Color.byteBorderMedium, lineWidth: 1)
            )
            .clipShape(RoundedRectangle(cornerRadius: 10))
        }
    }
}

#Preview {
    AccountSuspendedView(
        message: "Your account has been suspended. Please contact officialbyteai@gmail.com to appeal.",
        onSignOut: {}
    )
}
