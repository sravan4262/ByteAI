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

    /// Latest JWT fetched from the async tokenProvider. Refreshed at start() and on each reconnect.
    private(set) var cachedToken: String = ""

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

        // Keep a strong reference to self so the token provider closure can call
        // tokenProvider() fresh on each reconnect — avoids using a stale JWT after
        // token rotation. The closure must be synchronous per the SDK contract, so
        // we cache the latest token in `cachedToken` and refresh it whenever the
        // connection (re)opens via the delegate.
        await refreshCachedToken()

        let connection = HubConnectionBuilder(url: url)
            .withHttpConnectionOptions { [weak self] options in
                options.accessTokenProvider = { self?.cachedToken ?? "" }
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

    /// Stop and start with a fresh token. Called by ChatService when auth state changes.
    func reconnect() async {
        await stop()
        await start()
    }

    /// Fetch the latest JWT and cache it synchronously accessible by the SDK's token provider closure.
    func refreshCachedToken() async {
        cachedToken = (await tokenProvider()) ?? ""
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
        Task { @MainActor in
            // Refresh the cached token before the reconnected session makes any calls,
            // so the SDK's synchronous token provider closure returns a fresh JWT.
            await owner?.refreshCachedToken()
            owner?.setConnected(true)
        }
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
