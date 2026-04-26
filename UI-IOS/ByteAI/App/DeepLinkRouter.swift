import Foundation
import Combine

@MainActor
final class DeepLinkRouter: ObservableObject {
    static let shared = DeepLinkRouter()

    @Published var pendingPostId: String?
    @Published var pendingConversationId: String?
    @Published var requestedTab: Int?
    @Published var showNotifications = false

    private init() {}

    func openPost(id: String) {
        pendingPostId = id
        requestedTab = 0 // feed tab
    }

    func openConversation(id: String) {
        pendingConversationId = id
    }

    func openNotifications() {
        showNotifications = true
    }

    func clearPendingPost() { pendingPostId = nil }
    func clearPendingConversation() { pendingConversationId = nil }
}
