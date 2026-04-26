import Foundation
import SignalRClient

// MARK: - SignalR connection wrapper
// Wraps moozzyk's SignalR-Client-Swift HubConnection. Handlers run on @MainActor.

@MainActor
final class ChatConnection: ObservableObject {
    @Published private(set) var isConnected = false

    private var hub: HubConnection?
    private var hubDelegate: ConnectionDelegate?
    private let url: URL
    private let tokenProvider: () async -> String?

    private var receiveMessageHandler: ((MessagePayload) -> Void)?
    private var messageSentHandler:    ((MessagePayload) -> Void)?
    private var conversationReadHandler: ((String) -> Void)?

    init(url: URL, tokenProvider: @escaping () async -> String?) {
        self.url = url
        self.tokenProvider = tokenProvider
    }

    // MARK: - Lifecycle

    func start() async {
        guard hub == nil else { return }
        let token = (await tokenProvider()) ?? ""

        let connection = HubConnectionBuilder(url: url)
            .withHttpConnectionOptions { options in
                options.accessTokenProvider = { token }
            }
            .withAutoReconnect()
            .withLogging(minLogLevel: .warning)
            .build()

        connection.on(method: "ReceiveMessage") { [weak self] (payload: MessagePayload) in
            Task { @MainActor in self?.receiveMessageHandler?(payload) }
        }
        connection.on(method: "MessageSent") { [weak self] (payload: MessagePayload) in
            Task { @MainActor in self?.messageSentHandler?(payload) }
        }
        connection.on(method: "ConversationRead") { [weak self] (id: String) in
            Task { @MainActor in self?.conversationReadHandler?(id) }
        }

        let delegate = ConnectionDelegate(owner: self)
        connection.delegate = delegate
        // SDK holds delegate weakly — keep a strong reference here
        self.hubDelegate = delegate

        connection.start()
        self.hub = connection
    }

    func stop() async {
        hub?.stop()
        hub = nil
        hubDelegate = nil
        isConnected = false
    }

    /// Stop and start. Use when the auth token rotates.
    func reconnect() async {
        await stop()
        await start()
    }

    // MARK: - Hub method invocations

    func sendMessage(recipientId: String, content: String) async throws {
        guard let hub else { throw ChatError.notConnected }
        try await withCheckedThrowingContinuation { (c: CheckedContinuation<Void, Error>) in
            hub.invoke(method: "SendMessage", arguments: [recipientId, content]) { error in
                if let error { c.resume(throwing: error) } else { c.resume() }
            }
        }
    }

    func markRead(conversationId: String) async throws {
        guard let hub else { throw ChatError.notConnected }
        try await withCheckedThrowingContinuation { (c: CheckedContinuation<Void, Error>) in
            hub.invoke(method: "MarkRead", arguments: [conversationId]) { error in
                if let error { c.resume(throwing: error) } else { c.resume() }
            }
        }
    }

    // MARK: - Handler registration

    func onReceiveMessage(_ handler: @escaping (MessagePayload) -> Void) {
        receiveMessageHandler = handler
    }

    func onMessageSent(_ handler: @escaping (MessagePayload) -> Void) {
        messageSentHandler = handler
    }

    func onConversationRead(_ handler: @escaping (String) -> Void) {
        conversationReadHandler = handler
    }

    fileprivate func setConnected(_ connected: Bool) {
        isConnected = connected
    }
}

private final class ConnectionDelegate: HubConnectionDelegate {
    weak var owner: ChatConnection?
    init(owner: ChatConnection) { self.owner = owner }

    func connectionDidOpen(hubConnection: HubConnection) {
        Task { @MainActor in owner?.setConnected(true) }
    }
    func connectionDidFailToOpen(error: Error) {
        Task { @MainActor in owner?.setConnected(false) }
    }
    func connectionDidClose(error: Error?) {
        Task { @MainActor in owner?.setConnected(false) }
    }
    func connectionWillReconnect(error: Error) {
        Task { @MainActor in owner?.setConnected(false) }
    }
    func connectionDidReconnect() {
        Task { @MainActor in owner?.setConnected(true) }
    }
}

enum ChatError: Error { case notConnected }

struct MessagePayload: Decodable {
    let messageId:      String
    let conversationId: String
    let senderId:       String
    let content:        String
    let sentAt:         String
}
