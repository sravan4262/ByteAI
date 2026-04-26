import SwiftUI

// MARK: - Destructive inline confirm (rm pattern)
// "rm" → click → "DELETE? · YES · NO". No modals. Hover on rm reveals red intent.
// Used on comment cards, Q&A delete in compose interview.

struct RmConfirmButton: View {
    let onDelete: () -> Void
    @State private var confirming = false

    var body: some View {
        if confirming {
            HStack(spacing: 6) {
                Text("DELETE?")
                    .font(.byteMono(10, weight: .bold))
                    .foregroundColor(.byteText1)
                    .tracking(0.5)

                Button {
                    confirming = false
                    onDelete()
                } label: {
                    Text("YES")
                        .font(.byteMono(10, weight: .bold))
                        .foregroundColor(.byteRed)
                        .padding(.horizontal, 10)
                        .padding(.vertical, 4)
                        .background(IdentityColor.red.bgFaint)
                        .overlay(
                            RoundedRectangle(cornerRadius: 8)
                                .stroke(IdentityColor.red.borderFaint, lineWidth: 1)
                        )
                        .clipShape(RoundedRectangle(cornerRadius: 8))
                }
                .buttonStyle(.plain)

                Button {
                    confirming = false
                } label: {
                    Text("NO")
                        .font(.byteMono(10, weight: .bold))
                        .foregroundColor(.byteText1)
                        .padding(.horizontal, 10)
                        .padding(.vertical, 4)
                        .background(IdentityColor.blue.bgFaint)
                        .overlay(
                            RoundedRectangle(cornerRadius: 8)
                                .stroke(IdentityColor.blue.borderFaint, lineWidth: 1)
                        )
                        .clipShape(RoundedRectangle(cornerRadius: 8))
                }
                .buttonStyle(.plain)
            }
            .frame(minHeight: 36)
        } else {
            Button {
                confirming = true
            } label: {
                Text("rm")
                    .font(.byteMono(12, weight: .bold))
                    .foregroundColor(.byteText1)
                    .tracking(0.5)
                    .padding(.horizontal, 12)
                    .padding(.vertical, 6)
                    .background(IdentityColor.blue.bgFaint)
                    .overlay(
                        RoundedRectangle(cornerRadius: 8)
                            .stroke(IdentityColor.blue.borderFaint, lineWidth: 1)
                    )
                    .clipShape(RoundedRectangle(cornerRadius: 8))
            }
            .buttonStyle(.plain)
            .frame(minHeight: 36)
        }
    }
}

#Preview {
    VStack(spacing: 20) {
        RmConfirmButton {}
    }
    .padding()
    .background(Color.byteBackground)
}
