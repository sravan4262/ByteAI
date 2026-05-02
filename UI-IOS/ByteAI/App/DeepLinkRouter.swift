import Foundation
import Combine

@MainActor
final class DeepLinkRouter: ObservableObject {
    static let shared = DeepLinkRouter()

    @Published var pendingPostId: String?
    @Published var pendingInterviewId: String?
    @Published var pendingConversationId: String?
    @Published var requestedTab: Int?
    @Published var showNotifications = false

    private init() {}

    func openPost(id: String) {
        pendingPostId = id
        requestedTab = 0 // feed tab
    }

    func openInterview(id: String) {
        pendingInterviewId = id
        requestedTab = 1 // interviews tab
    }

    func openConversation(id: String) {
        pendingConversationId = id
    }

    func openNotifications() {
        showNotifications = true
    }

    func clearPendingPost() { pendingPostId = nil }
    func clearPendingInterview() { pendingInterviewId = nil }
    func clearPendingConversation() { pendingConversationId = nil }
}
