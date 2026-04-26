import Foundation
import Combine

@MainActor
final class ChatService: ObservableObject {
    static let shared = ChatService()

    @Published var conversations: [ConversationDto] = []
    @Published var threads: [String: [MessageDto]] = [:]
    @Published private(set) var isConnected = false

    private let connection: ChatConnection
    private var connectionObserver: AnyCancellable?

    var unreadCount: Int { conversations.filter(\.hasUnread).count }

    private init() {
        connection = ChatConnection(
            url: AppConfig.signalRHubURL,
            tokenProvider: { await AuthManager.shared.currentAccessToken() }
        )
        connection.onReceiveMessage  { [weak self] in self?.handleIncoming($0) }
        connection.onMessageSent     { [weak self] in self?.handleSent($0) }
        connection.onConversationRead { [weak self] in self?.handleConversationRead($0) }

        connectionObserver = connection.$isConnected
            .receive(on: RunLoop.main)
            .sink { [weak self] connected in
                self?.isConnected = connected
                if connected {
                    Task { await self?.refreshConversations() }
                }
            }
    }

    // MARK: - Lifecycle

    func start() async {
        await connection.start()
        await refreshConversations()
    }

    func stop() async {
        await connection.stop()
    }

    func reconnect() async {
        await connection.reconnect()
    }

    // MARK: - Public API

    func send(to recipientId: String, content: String, conversationId: String? = nil) async throws {
        try await connection.sendMessage(recipientId: recipientId, content: content)
    }

    func markRead(_ conversationId: String) async throws {
        try await connection.markRead(conversationId: conversationId)
        if let idx = conversations.firstIndex(where: { $0.id == conversationId }) {
            conversations[idx].hasUnread = false
        }
    }

    func loadHistory(conversationId: String) async {
        let messages = (try? await APIClient.shared.getMessages(conversationId: conversationId)) ?? []
        threads[conversationId] = messages
    }

    func refreshConversations() async {
        if let result = try? await APIClient.shared.getConversations() {
            conversations = result
        }
    }

    func upsertConversation(_ convo: ConversationDto) {
        if let idx = conversations.firstIndex(where: { $0.id == convo.id }) {
            conversations[idx] = convo
        } else {
            conversations.insert(convo, at: 0)
        }
    }

    // MARK: - Event handlers

    private func handleIncoming(_ p: MessagePayload) {
        var messages = threads[p.conversationId] ?? []
        guard !messages.contains(where: { $0.id == p.messageId }) else { return }
        messages.append(MessageDto(from: p))
        threads[p.conversationId] = messages
        if let idx = conversations.firstIndex(where: { $0.id == p.conversationId }) {
            conversations[idx].lastMessage   = p.content
            conversations[idx].lastMessageAt = p.sentAt
            conversations[idx].hasUnread     = true
            // Move to top
            let updated = conversations.remove(at: idx)
            conversations.insert(updated, at: 0)
        } else {
            Task { await refreshConversations() }
        }
        Haptics.light()
    }

    private func handleSent(_ p: MessagePayload) {
        var messages = threads[p.conversationId] ?? []
        if let idx = messages.firstIndex(where: { $0.id == p.messageId }) {
            messages[idx] = MessageDto(from: p)
        } else {
            messages.append(MessageDto(from: p))
        }
        threads[p.conversationId] = messages
        if let idx = conversations.firstIndex(where: { $0.id == p.conversationId }) {
            conversations[idx].lastMessage   = p.content
            conversations[idx].lastMessageAt = p.sentAt
        }
    }

    private func handleConversationRead(_ conversationId: String) {
        if let idx = conversations.firstIndex(where: { $0.id == conversationId }) {
            conversations[idx].hasUnread = false
        }
    }
}

extension MessageDto {
    init(from p: MessagePayload) {
        self.init(
            id: p.messageId,
            conversationId: p.conversationId,
            senderId: p.senderId,
            content: p.content,
            sentAt: p.sentAt,
            readAt: nil
        )
    }
}
