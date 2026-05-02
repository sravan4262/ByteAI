import SwiftUI

@MainActor
final class GestureManager: ObservableObject {
    static let shared = GestureManager()

    @Published var showSupportTerminal = false
    @Published var showChatTerminal = false
    @Published var showHiddenFeatures = false
    @Published var chatConversation: ConversationDto? = nil
    @Published var zoomScale: CGFloat = 1.0

    private let minZoom: CGFloat = 1.0
    private let maxZoom: CGFloat = 3.0

    private init() {}

    func applyZoomDelta(_ delta: CGFloat) {
        zoomScale = min(maxZoom, max(minZoom, zoomScale * delta))
    }

    func resetZoom() {
        withAnimation(.spring(response: 0.35, dampingFraction: 0.7)) {
            zoomScale = 1.0
        }
    }

    func openSupport() {
        guard !showSupportTerminal else { return }
        Haptics.medium()
        showSupportTerminal = true
    }

    func openChat() {
        guard !showChatTerminal else { return }
        Haptics.medium()
        showChatTerminal = true
    }

    func openHiddenFeatures() {
        guard !showHiddenFeatures else { return }
        Haptics.light()
        showHiddenFeatures = true
    }
}
