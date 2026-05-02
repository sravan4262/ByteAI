import SwiftUI

// MARK: - TerminalOrb
//
// 56pt floating "chat orb" / "support orb" shown when a terminal is collapsed.
// Tapping the orb restores the full terminal. The orb is draggable so the user
// can move it out of the way of underlying content.
//
// Pinned bottom-trailing of its parent with `padding(.trailing, 16)` and
// `padding(.bottom, 100)` (above the standard tab bar). A drag gesture stores
// an offset so the orb can be repositioned freely; we deliberately skip edge
// clamping — users can always drag it back, and clamping correctly across all
// safe-area variants is more than this PR needs.
struct TerminalOrb: View {
    let label: String
    var unreadCount: Int? = nil
    let onTap: () -> Void

    @State private var orbOffset: CGSize = .zero
    @GestureState private var dragTranslation: CGSize = .zero

    var body: some View {
        ZStack(alignment: .bottomTrailing) {
            Color.clear

            ZStack(alignment: .topTrailing) {
                Button(action: {
                    Haptics.light()
                    onTap()
                }) {
                    ZStack {
                        Circle()
                            .fill(Color.byteBackground)
                            .overlay(
                                Circle().stroke(Color.byteGreen.opacity(0.55), lineWidth: 1.5)
                            )
                            .overlay(
                                Circle().stroke(Color.byteGreen.opacity(0.18), lineWidth: 6)
                                    .blur(radius: 4)
                            )
                            .shadow(color: Color.byteGreen.opacity(0.35), radius: 12, y: 4)
                            .frame(width: 56, height: 56)

                        Text(label)
                            .font(.byteMono(10, weight: .bold))
                            .foregroundColor(.byteGreen)
                            .tracking(0.6)
                    }
                }
                .buttonStyle(.plain)
                .accessibilityLabel("Restore \(label) terminal")

                if let unread = unreadCount, unread > 0 {
                    Text(unread > 99 ? "99+" : "\(unread)")
                        .font(.byteMono(9, weight: .bold))
                        .foregroundColor(.white)
                        .padding(.horizontal, 5)
                        .padding(.vertical, 2)
                        .background(Color.byteAccent)
                        .clipShape(Capsule())
                        .overlay(Capsule().stroke(Color.byteBackground, lineWidth: 1.5))
                        .offset(x: 4, y: -4)
                        .accessibilityLabel("\(unread) unread")
                }
            }
            .offset(
                x: orbOffset.width + dragTranslation.width,
                y: orbOffset.height + dragTranslation.height
            )
            .gesture(
                DragGesture()
                    .updating($dragTranslation) { value, state, _ in
                        state = value.translation
                    }
                    .onEnded { value in
                        orbOffset = CGSize(
                            width: orbOffset.width + value.translation.width,
                            height: orbOffset.height + value.translation.height
                        )
                    }
            )
            .padding(.trailing, 16)
            .padding(.bottom, 100)
            .transition(.scale.combined(with: .opacity))
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .bottomTrailing)
        .allowsHitTesting(true)
    }
}
