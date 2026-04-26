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
            ToastCenter.shared.show("Couldn't send message", kind: .error)
        }
    }
}
