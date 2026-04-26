import SwiftUI

// MARK: - Content card with accent gradient top line
// Used on PostCard, comment cards, post detail. The 1px gradient line at the top
// fades from accent → 0.3 alpha → transparent so it signals entry, not enclosure.

struct CardWithTopGradient<Content: View>: View {
    var identity: IdentityColor = .blue
    @ViewBuilder let content: () -> Content

    var body: some View {
        VStack(spacing: 0) {
            LinearGradient(
                colors: [identity.solid, identity.tint(0.3), .clear],
                startPoint: .leading, endPoint: .trailing
            )
            .frame(height: 1)

            content()
        }
        .background(Color.byteCard)
        .overlay(
            RoundedRectangle(cornerRadius: 14)
                .stroke(Color.byteBorderHigh, lineWidth: 1)
        )
        .clipShape(RoundedRectangle(cornerRadius: 14))
    }
}

#Preview {
    VStack(spacing: 12) {
        CardWithTopGradient {
            VStack(alignment: .leading, spacing: 8) {
                Text("@username")
                    .font(.byteMono(13, weight: .bold))
                    .foregroundColor(.byteText1)
                Text("This is a card with the gradient top line.")
                    .font(.byteBody)
                    .foregroundColor(.byteText2)
            }
            .padding(16)
        }

        CardWithTopGradient(identity: .purple) {
            Text("Interview-themed card")
                .font(.byteBody)
                .foregroundColor(.byteText1)
                .padding(16)
        }
    }
    .padding()
    .background(Color.byteBackground)
}
