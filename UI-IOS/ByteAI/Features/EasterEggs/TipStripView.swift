import SwiftUI

// MARK: - TipStripView
//
// A small "did you know?" strip that rotates through hidden-feature hints
// while the user browses the feed. Auto-dismissable; once dismissed it stays
// hidden forever (UserDefaults flag) so we never nag.

private struct Tip {
    let highlight: String
    let text: String
}

private let TIPS: [Tip] = [
    Tip(highlight: "Shake",            text: "to reach support from anywhere"),
    Tip(highlight: "Pinch",            text: "to zoom the entire app · double-tap to reset"),
    Tip(highlight: "Swipe up — bottom-right", text: "to open the chat terminal"),
    Tip(highlight: "Long-press the app icon", text: "to jump straight to support or chat"),
    Tip(highlight: "@google role:swe #hard",  text: "in Smart Mode filters interviews"),
    Tip(highlight: "Triple-tap the logo", text: "to see every gesture"),
]

private let DISMISS_KEY = "byteai.tipstrip.dismissed"
private let ROTATE_INTERVAL: TimeInterval = 12

struct TipStripView: View {
    @State private var index = 0
    @State private var dismissed = UserDefaults.standard.bool(forKey: DISMISS_KEY)

    var body: some View {
        if dismissed {
            EmptyView()
        } else {
            HStack(spacing: 8) {
                Image(systemName: "lightbulb.fill")
                    .font(.system(size: 10))
                    .foregroundColor(.bytePurple)

                Text("TIP")
                    .font(.byteMono(9, weight: .bold))
                    .tracking(0.6)
                    .foregroundColor(.byteText3)

                let tip = TIPS[index]
                (Text(tip.highlight)
                    .font(.byteMono(11, weight: .semibold))
                    .foregroundColor(.bytePurple)
                + Text("  ")
                + Text(tip.text)
                    .font(.byteMono(11))
                    .foregroundColor(.byteText2))
                    .lineLimit(1)
                    .truncationMode(.tail)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .id(index)
                    .transition(.opacity.combined(with: .move(edge: .top)))

                Button {
                    UserDefaults.standard.set(true, forKey: DISMISS_KEY)
                    withAnimation(.easeOut(duration: 0.2)) { dismissed = true }
                } label: {
                    Image(systemName: "xmark")
                        .font(.system(size: 10, weight: .semibold))
                        .foregroundColor(.byteText3)
                        .padding(6)
                        .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
                .accessibilityLabel("Dismiss tip")
            }
            .padding(.horizontal, 10)
            .padding(.vertical, 6)
            .background(Color.bytePurple.opacity(0.04))
            .overlay(
                RoundedRectangle(cornerRadius: 10)
                    .stroke(Color.bytePurple.opacity(0.18), lineWidth: 1)
            )
            .clipShape(RoundedRectangle(cornerRadius: 10))
            .padding(.horizontal, 16)
            .task {
                while !Task.isCancelled {
                    try? await Task.sleep(nanoseconds: UInt64(ROTATE_INTERVAL * 1_000_000_000))
                    if Task.isCancelled { break }
                    withAnimation(.easeInOut(duration: 0.25)) {
                        index = (index + 1) % TIPS.count
                    }
                }
            }
        }
    }
}

#Preview {
    ZStack {
        Color.byteBackground.ignoresSafeArea()
        TipStripView()
    }
}
