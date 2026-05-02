import Foundation

// MARK: - QuickActionRouter
//
// Home-screen quick actions (long-press app icon) reach us at two different
// times: cold launch (didFinishLaunchingWithOptions) and warm launch
// (performActionFor). The cold-launch path arrives before RootView has had a
// chance to present any sheets — and before the user is even authenticated —
// so we stash the action here and let RootView consume it once the
// authenticated state machine is ready.
//
// Action types match the strings in Info.plist's UIApplicationShortcutItems.

@MainActor
final class QuickActionRouter: ObservableObject {
    static let shared = QuickActionRouter()

    /// Pending shortcut type set during cold launch; cleared by RootView
    /// once the user is authenticated and the corresponding sheet has been
    /// presented. While unauthenticated, we hold onto it so the gesture isn't
    /// silently dropped.
    @Published var pending: String?

    private init() {}

    /// Warm-launch entry: dispatch directly when possible. If the user is not
    /// authenticated (e.g. they were on the locked or auth screen), we stash
    /// the action exactly like the cold-launch path so the next authenticated
    /// state can consume it.
    func handle(type: String) {
        switch AuthManager.shared.state {
        case .authenticated:
            apply(type: type)
        default:
            pending = type
        }
    }

    /// Drains `pending` if any — called by RootView whenever auth flips to
    /// `.authenticated`.
    func consumePending() {
        guard let type = pending else { return }
        pending = nil
        apply(type: type)
    }

    private func apply(type: String) {
        switch type {
        case "com.byteai.shortcut.support":
            GestureManager.shared.openSupport()
        case "com.byteai.shortcut.chat":
            GestureManager.shared.openChat()
        case "com.byteai.shortcut.shortcuts":
            GestureManager.shared.openHiddenFeatures()
        default:
            break
        }
    }
}
