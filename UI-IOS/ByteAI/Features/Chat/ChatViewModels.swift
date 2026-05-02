import Foundation
import Combine

@MainActor
final class ConversationsVM: ObservableObject {
    @Published var query = ""
    @Published var mutuals: [PersonResult] = []
    @Published var isLoadingMutuals = false

    func loadMutuals() async {
        isLoadingMutuals = true; defer { isLoadingMutuals = false }
        mutuals = (try? await APIClient.shared.getMutualFollows()) ?? []
    }

    func openConversation(with person: PersonResult) async -> ConversationDto? {
        do {
            let convo = try await APIClient.shared.getOrCreateConversation(otherUserId: person.id)
            ChatService.shared.upsertConversation(convo)
            return convo
        } catch {
            ToastCenter.shared.show("Couldn't open conversation", kind: .error)
            return nil
        }
    }

    func filteredConversations(_ all: [ConversationDto]) -> [ConversationDto] {
        let q = query.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        guard !q.isEmpty else { return all }
        return all.filter {
            $0.otherDisplayName.lowercased().contains(q) ||
            $0.otherUsername.lowercased().contains(q)
        }
    }
}

@MainActor
final class ChatThreadVM: ObservableObject {
    let conversation: ConversationDto
    @Published var draft = ""
    @Published var isSending = false
    @Published var isLoadingHistory = false
    /// Inline (non-modal) moderation rejection shown above the chat input. Chat
    /// is dense enough that a full sheet would be too heavy — the banner
    /// auto-dismisses after 5s or when tapped. Setting back to nil hides it.
    @Published var contentRejection: ContentRejection?
    private var bannerDismissTask: Task<Void, Never>?

    init(conversation: ConversationDto) {
        self.conversation = conversation
    }

    var messages: [MessageDto] {
        ChatService.shared.threads[conversation.id] ?? []
    }

    func load() async {
        isLoadingHistory = true
        defer { isLoadingHistory = false }
        await ChatService.shared.loadHistory(conversationId: conversation.id)
        try? await ChatService.shared.markRead(conversation.id)
    }

    func send() async {
        let trimmed = draft.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return }
        isSending = true; defer { isSending = false }
        let copy = trimmed
        draft = ""
        do {
            try await ChatService.shared.send(
                to: conversation.otherUserId,
                content: copy,
                conversationId: conversation.id
            )
            Haptics.light()
        } catch {
            draft = copy // restore so user can retry
            if let rejection = APIError.rejection(from: error) {
                showRejectionBanner(rejection)
                return
            }
            ToastCenter.shared.show("Couldn't send message", kind: .error)
        }
    }

    /// Surface the moderation banner above the chat input and schedule auto-dismiss
    /// in 5s. Cancels any prior pending dismissal.
    private func showRejectionBanner(_ rejection: ContentRejection) {
        contentRejection = rejection
        bannerDismissTask?.cancel()
        bannerDismissTask = Task { [weak self] in
            try? await Task.sleep(nanoseconds: 5_000_000_000)
            guard !Task.isCancelled else { return }
            await MainActor.run { self?.contentRejection = nil }
        }
    }

    func dismissRejectionBanner() {
        bannerDismissTask?.cancel()
        contentRejection = nil
    }
}
