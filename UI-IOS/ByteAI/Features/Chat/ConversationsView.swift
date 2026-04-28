import SwiftUI

struct ConversationsView: View {
    @StateObject private var vm = ConversationsVM()
    @EnvironmentObject private var chat: ChatService
    @EnvironmentObject private var router: DeepLinkRouter
    @Environment(\.dismiss) private var dismiss
    @State private var showNew = false
    @State private var pushedConversation: ConversationDto?

    var body: some View {
        NavigationStack {
            ZStack {
                Color.byteBackground.ignoresSafeArea()

                if chat.conversations.isEmpty && !chat.isConnected {
                    VStack(spacing: 8) {
                        ForEach(0..<6, id: \.self) { _ in
                            ConversationRowSkeleton().padding(.horizontal, 16)
                        }
                        Spacer()
                    }
                    .padding(.vertical, 12)
                    .redacted(reason: .placeholder)
                    .accessibilityHidden(true)
                } else if chat.conversations.isEmpty {
                    EmptyStateView(
                        icon: "bubble.left.and.bubble.right",
                        title: "No conversations yet",
                        message: "Start one with someone you both follow."
                    )
                } else {
                    List(vm.filteredConversations(chat.conversations)) { convo in
                        Button {
                            pushedConversation = convo
                        } label: {
                            ConversationRow(convo: convo)
                        }
                        .buttonStyle(.plain)
                        .listRowBackground(Color.byteCard)
                        .listRowSeparatorTint(Color.byteBorder)
                    }
                    .listStyle(.plain)
                    .scrollContentBackground(.hidden)
                    .searchable(text: $vm.query, prompt: "Search conversations")
                    .refreshable { await chat.refreshConversations() }
                }
            }
            .navigationTitle("Messages")
            .navigationBarTitleDisplayMode(.inline)
            .toolbarBackground(Color.byteBackground, for: .navigationBar)
            .toolbarColorScheme(.dark, for: .navigationBar)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Close") { dismiss() }.foregroundColor(.byteText2)
                }
                ToolbarItem(placement: .topBarTrailing) {
                    Button { showNew = true } label: {
                        Image(systemName: "square.and.pencil")
                            .foregroundColor(.byteAccent)
                    }
                    .accessibilityLabel("New message")
                }
            }
            .navigationDestination(item: $pushedConversation) { convo in
                ChatThreadView(conversation: convo)
            }
            .sheet(isPresented: $showNew) {
                ChatTerminalSheet { convo in
                    pushedConversation = convo
                }
                .environmentObject(chat)
                .presentationDetents([.large])
                .presentationDragIndicator(.visible)
            }
            .task {
                if chat.conversations.isEmpty {
                    await chat.refreshConversations()
                }
            }
            .onChange(of: router.pendingConversationId) { _, id in
                if let id, let convo = chat.conversations.first(where: { $0.id == id }) {
                    pushedConversation = convo
                    router.clearPendingConversation()
                }
            }
        }
    }
}

private struct ConversationRow: View {
    let convo: ConversationDto

    var body: some View {
        HStack(spacing: 12) {
            AvatarView(
                String(convo.otherDisplayName.prefix(1)).uppercased(),
                variant: .cyan,
                size: .md,
                imageUrl: convo.otherAvatarUrl
            )
            VStack(alignment: .leading, spacing: 3) {
                HStack {
                    Text(convo.otherDisplayName)
                        .font(.byteSans(14, weight: .semibold))
                        .foregroundColor(.byteText1)
                    if convo.hasUnread {
                        Circle().fill(Color.byteAccent).frame(width: 7, height: 7)
                    }
                    Spacer()
                    if let when = convo.lastMessageAt {
                        Text(formatTime(when))
                            .font(.byteMonoTiny)
                            .foregroundColor(.byteText3)
                    }
                }
                Text(convo.lastMessage ?? "Say hi 👋")
                    .font(.byteSmall)
                    .foregroundColor(convo.hasUnread ? .byteText1 : .byteText2)
                    .lineLimit(1)
            }
        }
        .padding(.vertical, 6)
        .accessibilityElement(children: .combine)
    }

    private func formatTime(_ iso: String) -> String {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        let date = formatter.date(from: iso) ?? ISO8601DateFormatter().date(from: iso)
        guard let date else { return "" }
        let f = DateFormatter()
        if Calendar.current.isDateInToday(date) {
            f.dateStyle = .none; f.timeStyle = .short
        } else {
            f.dateStyle = .short; f.timeStyle = .none
        }
        return f.string(from: date)
    }
}

// MARK: - Chat Terminal Sheet
// Terminal-style new-conversation launcher. Mirrors web ChatLauncher.tsx.
// Commands: help · inbox · dm @username · search "user" · recent · <number> · clear · exit

struct ChatTerminalSheet: View {
    @StateObject private var vm = ChatTerminalVM()
    @Environment(\.dismiss) private var dismiss
    @EnvironmentObject private var chat: ChatService
    @FocusState private var inputFocused: Bool
    @State private var caretOn = true
    let onOpenThread: (ConversationDto) -> Void

    var body: some View {
        ZStack {
            Color.byteBackground.ignoresSafeArea()
            VStack(spacing: 0) {
                titleBar
                accentLine
                outputScroll
                terminalInput
            }
        }
        .onAppear {
            withAnimation(.easeInOut(duration: 0.6).repeatForever(autoreverses: true)) {
                caretOn.toggle()
            }
            inputFocused = true
        }
        .task { await vm.loadMutuals() }
    }

    // MARK: Title bar

    private var titleBar: some View {
        ZStack {
            HStack(spacing: 6) {
                Button { dismiss() } label: {
                    Circle()
                        .fill(Color(red: 1, green: 0.37, blue: 0.34))
                        .overlay(Circle().stroke(Color.black.opacity(0.15), lineWidth: 1))
                        .frame(width: 12, height: 12)
                }
                .buttonStyle(.plain)
                .accessibilityLabel("Close chat terminal")

                Button { vm.clear() } label: {
                    Circle()
                        .fill(Color(red: 1, green: 0.74, blue: 0.18))
                        .overlay(Circle().stroke(Color.black.opacity(0.15), lineWidth: 1))
                        .frame(width: 12, height: 12)
                }
                .buttonStyle(.plain)
                .accessibilityLabel("Clear terminal")

                Circle()
                    .fill(Color.white.opacity(0.10))
                    .overlay(Circle().stroke(Color.white.opacity(0.08), lineWidth: 1))
                    .frame(width: 12, height: 12)

                Spacer()
            }
            .padding(.horizontal, 14)

            HStack(spacing: 6) {
                ZStack {
                    RoundedRectangle(cornerRadius: 4)
                        .fill(Color.byteGreen.opacity(0.10))
                        .overlay(RoundedRectangle(cornerRadius: 4).stroke(Color.byteGreen.opacity(0.20), lineWidth: 1))
                        .frame(width: 16, height: 16)
                    Image(systemName: "bubble.left.and.bubble.right")
                        .font(.system(size: 8))
                        .foregroundColor(.byteGreen)
                }
                Text("CHAT")
                    .font(.system(size: 11, weight: .semibold, design: .monospaced))
                    .foregroundColor(.byteText1)
                    .tracking(0.6)
                Text("v1.0")
                    .font(.system(size: 11, design: .monospaced))
                    .foregroundColor(.byteText3)
            }
        }
        .frame(height: 44)
        .background(Color.byteGreen.opacity(0.03))
        .overlay(alignment: .bottom) {
            Rectangle().fill(Color.byteGreen.opacity(0.15)).frame(height: 1)
        }
    }

    private var accentLine: some View {
        LinearGradient(
            colors: [Color.byteGreen, Color.byteGreen.opacity(0.25), .clear],
            startPoint: .leading, endPoint: .trailing
        )
        .frame(height: 1)
    }

    // MARK: Output

    private var outputScroll: some View {
        ScrollViewReader { proxy in
            ScrollView {
                LazyVStack(alignment: .leading, spacing: 2) {
                    ForEach(vm.lines) { line in
                        ChatTerminalLineRow(line: line) { contact in
                            Task { await openContact(contact) }
                        } onOpenConversation: { convo in
                            dismiss()
                            onOpenThread(convo)
                        }
                        .id(line.id)
                    }
                    if vm.isLoading {
                        HStack(spacing: 4) {
                            Text("◆").font(.system(size: 10, design: .monospaced)).foregroundColor(.byteText3)
                            ForEach(0..<3) { i in
                                Circle().fill(Color.byteGreen).frame(width: 4, height: 4)
                                    .opacity(caretOn ? 0.9 : 0.3)
                                    .animation(.easeInOut(duration: 0.6).repeatForever().delay(Double(i) * 0.15), value: caretOn)
                            }
                        }
                        .padding(.vertical, 2).padding(.horizontal, 14)
                    }
                    Color.clear.frame(height: 4).id("chat-bottom")
                }
                .padding(.horizontal, 14)
                .padding(.vertical, 10)
            }
            .onChange(of: vm.lines.count) { _, _ in
                withAnimation(.easeOut(duration: 0.15)) {
                    proxy.scrollTo("chat-bottom", anchor: .bottom)
                }
            }
        }
    }

    // MARK: Input

    private var terminalInput: some View {
        VStack(spacing: 0) {
            Rectangle().fill(Color.byteBorderHigh).frame(height: 1)
            HStack(spacing: 4) {
                HStack(spacing: 3) {
                    Text("byteai").foregroundColor(Color.byteGreen.opacity(0.55))
                    Text("@").foregroundColor(.byteText3)
                    Text("chat").foregroundColor(.byteAccent)
                    Text("$").foregroundColor(.byteGreen).fontWeight(.bold)
                }
                .font(.system(size: 12, design: .monospaced))

                TextField("type a command...", text: $vm.draft, axis: .vertical)
                    .font(.system(size: 12, design: .monospaced))
                    .foregroundColor(.byteText1)
                    .tint(.byteGreen)
                    .lineLimit(1...3)
                    .focused($inputFocused)
                    .submitLabel(.return)
                    .autocorrectionDisabled()
                    .textInputAutocapitalization(.never)
                    .onSubmit {
                        Task {
                            let conversations = chat.conversations
                            await vm.submit(conversations: conversations, onClose: { dismiss() }, onOpen: { convo in
                                dismiss()
                                onOpenThread(convo)
                            })
                        }
                    }

                Rectangle()
                    .fill(Color.byteGreen)
                    .frame(width: 6, height: 14)
                    .opacity(inputFocused && caretOn ? 0.9 : 0.3)
                    .cornerRadius(1)

                Button {
                    Task {
                        let conversations = chat.conversations
                        await vm.submit(conversations: conversations, onClose: { dismiss() }, onOpen: { convo in
                            dismiss()
                            onOpenThread(convo)
                        })
                    }
                } label: {
                    Image(systemName: "return")
                        .font(.system(size: 14, weight: .bold))
                        .foregroundColor(vm.draft.trimmingCharacters(in: .whitespaces).isEmpty ? .byteText3 : .byteGreen)
                }
                .buttonStyle(.plain)
                .disabled(vm.draft.trimmingCharacters(in: .whitespaces).isEmpty || vm.isLoading)
                .accessibilityLabel("Submit")
            }
            .padding(.horizontal, 14).padding(.vertical, 10)
            .background(Color.byteGreen.opacity(0.02))
        }
    }

    private func openContact(_ contact: ChatTerminalContact) async {
        await vm.openByUserId(userId: contact.id, username: contact.username) { convo in
            self.dismiss()
            self.onOpenThread(convo)
        }
    }
}

// MARK: - Chat Terminal Models

struct ChatTerminalContact: Identifiable {
    let id: String
    let username: String
    let displayName: String
    let avatarUrl: String?
    let index: Int
}

struct ChatTerminalLine: Identifiable {
    enum Kind {
        case system(String)
        case cmd(String)
        case text(String, dim: Bool)
        case error(String)
        case conversation(ConversationDto)
        case contact(ChatTerminalContact)
    }
    let id: Int
    let kind: Kind
}

// MARK: - Chat Terminal Line Row

private struct ChatTerminalLineRow: View {
    let line: ChatTerminalLine
    let onContact: (ChatTerminalContact) -> Void
    let onOpenConversation: (ConversationDto) -> Void

    var body: some View {
        switch line.kind {
        case .system(let t):
            HStack(alignment: .top, spacing: 6) {
                Text("◆").frame(width: 12, alignment: .center).opacity(0.6)
                Text(t)
            }
            .font(.system(size: 11, design: .monospaced))
            .foregroundColor(.byteGreen)
            .padding(.bottom, 2)

        case .cmd(let t):
            HStack(alignment: .top, spacing: 6) {
                Text("❯").frame(width: 12, alignment: .center).opacity(0.6).foregroundColor(.byteGreen)
                Text(t).foregroundColor(.byteText1)
            }
            .font(.system(size: 11, design: .monospaced))

        case .text(let t, let dim):
            Text(t)
                .font(.system(size: 11, design: .monospaced))
                .foregroundColor(dim ? .byteText2 : .byteText1)
                .fixedSize(horizontal: false, vertical: true)

        case .error(let t):
            HStack(alignment: .top, spacing: 6) {
                Text("✗").frame(width: 12, alignment: .center).opacity(0.6)
                Text(t)
            }
            .font(.system(size: 11, design: .monospaced))
            .foregroundColor(.byteRed)

        case .conversation(let convo):
            Button { onOpenConversation(convo) } label: {
                HStack(spacing: 10) {
                    AvatarView(
                        String(convo.otherDisplayName.prefix(1)).uppercased(),
                        variant: .cyan, size: .sm, imageUrl: convo.otherAvatarUrl
                    )
                    VStack(alignment: .leading, spacing: 2) {
                        HStack(spacing: 6) {
                            Text(convo.otherDisplayName)
                                .font(.system(size: 12, weight: .semibold, design: .monospaced))
                                .foregroundColor(.byteText1)
                            if convo.hasUnread {
                                Circle().fill(Color.byteAccent).frame(width: 6, height: 6)
                            }
                        }
                        if let last = convo.lastMessage {
                            Text(last)
                                .font(.system(size: 10, design: .monospaced))
                                .foregroundColor(.byteText2)
                                .lineLimit(1)
                        }
                    }
                    Spacer(minLength: 0)
                    Image(systemName: "arrow.right")
                        .font(.system(size: 10, weight: .semibold))
                        .foregroundColor(.byteGreen)
                }
                .padding(.horizontal, 8).padding(.vertical, 6)
                .background(IdentityColor.green.bgFaint)
                .overlay(RoundedRectangle(cornerRadius: 7).stroke(IdentityColor.green.borderFaint, lineWidth: 1))
                .clipShape(RoundedRectangle(cornerRadius: 7))
            }
            .buttonStyle(.plain)

        case .contact(let contact):
            Button { onContact(contact) } label: {
                HStack(spacing: 10) {
                    Text("\(contact.index).")
                        .font(.system(size: 10, weight: .bold, design: .monospaced))
                        .foregroundColor(.byteText2)
                        .frame(width: 16)
                    ZStack {
                        RoundedRectangle(cornerRadius: 4)
                            .fill(Color.byteGreen.opacity(0.1))
                            .overlay(RoundedRectangle(cornerRadius: 4).stroke(Color.byteGreen.opacity(0.2), lineWidth: 1))
                            .frame(width: 28, height: 28)
                        Text(String(contact.username.prefix(1)).uppercased())
                            .font(.system(size: 10, weight: .bold, design: .monospaced))
                            .foregroundColor(.byteGreen)
                    }
                    VStack(alignment: .leading, spacing: 1) {
                        Text(contact.displayName.isEmpty ? contact.username : contact.displayName)
                            .font(.system(size: 11, weight: .medium, design: .monospaced))
                            .foregroundColor(.byteText1)
                        Text("@\(contact.username)")
                            .font(.system(size: 10, design: .monospaced))
                            .foregroundColor(.byteText2)
                    }
                    Spacer(minLength: 0)
                    Image(systemName: "arrow.right")
                        .font(.system(size: 10))
                        .foregroundColor(.byteGreen.opacity(0.5))
                }
                .padding(.horizontal, 8).padding(.vertical, 6)
                .background(Color.byteGreen.opacity(0.03))
                .clipShape(RoundedRectangle(cornerRadius: 7))
            }
            .buttonStyle(.plain)
        }
    }
}

// MARK: - Chat Terminal VM

@MainActor
final class ChatTerminalVM: ObservableObject {
    @Published var lines: [ChatTerminalLine] = [
        ChatTerminalLine(id: 1, kind: .system("ByteAI Chat v1.0 — type help to get started."))
    ]
    @Published var draft = ""
    @Published var isLoading = false

    private var mutuals: [PersonResult] = []
    private var pendingContacts: [ChatTerminalContact] = []
    private var nextId = 2

    func loadMutuals() async {
        mutuals = (try? await APIClient.shared.getMutualFollows()) ?? []
    }

    func clear() {
        lines = [ChatTerminalLine(id: nextId, kind: .system("ByteAI Chat v1.0 — type help to get started."))]
        nextId += 1
        pendingContacts = []
    }

    func submit(
        conversations: [ConversationDto],
        onClose: @escaping () -> Void,
        onOpen: @escaping (ConversationDto) -> Void
    ) async {
        let raw = draft.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !raw.isEmpty else { return }
        let lower = raw.lowercased()
        if lower == "clear" { draft = ""; clear(); return }
        if lower == "exit" || lower == "quit" { draft = ""; onClose(); return }
        push(.cmd(raw))
        draft = ""
        await runCommand(raw: raw, conversations: conversations, onOpen: onOpen)
    }

    func openByUserId(userId: String, username: String, onOpen: @escaping (ConversationDto) -> Void) async {
        isLoading = true
        defer { isLoading = false }
        push(.text("◆ opening @\(username)...", dim: true))
        do {
            let convo = try await APIClient.shared.getOrCreateConversation(otherUserId: userId)
            ChatService.shared.upsertConversation(convo)
            onOpen(convo)
        } catch {
            push(.error("✗ failed to open conversation"))
        }
    }

    private func runCommand(
        raw: String,
        conversations: [ConversationDto],
        onOpen: @escaping (ConversationDto) -> Void
    ) async {
        let parts = raw.split(separator: " ", maxSplits: 1, omittingEmptySubsequences: true).map(String.init)
        let cmd = parts[0].lowercased()
        let arg = parts.count > 1 ? parts[1] : ""

        switch cmd {
        case "help":
            [("Commands:", false),
             ("  inbox                   view your conversations", false),
             ("  dm @username            open or start a DM", false),
             ("  search \"user\"         search mutual follows", false),
             ("  recent                  last 5 people you messaged", false),
             ("  clear                   clear terminal", false),
             ("  exit                    close", false)
            ].forEach { push(.text($0.0, dim: $0.1)) }

        case "inbox":
            if conversations.isEmpty {
                push(.text("◆ no conversations yet", dim: true))
            } else {
                push(.text("◆ \(conversations.count) conversation\(conversations.count == 1 ? "" : "s")", dim: false))
                conversations.prefix(10).forEach { push(.conversation($0)) }
            }

        case "recent":
            let recent = conversations.prefix(5)
            if recent.isEmpty {
                push(.text("◆ no recent conversations", dim: true))
            } else {
                push(.text("◆ recent — type a number to open", dim: false))
                pendingContacts = recent.enumerated().map { i, c in
                    ChatTerminalContact(id: c.otherUserId, username: c.otherUsername,
                                        displayName: c.otherDisplayName, avatarUrl: c.otherAvatarUrl, index: i + 1)
                }
                pendingContacts.forEach { push(.contact($0)) }
            }

        case "search":
            let query = arg.replacingOccurrences(of: "\"", with: "")
                .trimmingCharacters(in: .whitespaces).lowercased()
            let results = query.isEmpty
                ? mutuals
                : mutuals.filter {
                    $0.username.lowercased().contains(query) || $0.displayName.lowercased().contains(query)
                }
            if results.isEmpty {
                push(.text("◆ no mutual follows found", dim: true))
            } else {
                push(.text("◆ \(results.count) result\(results.count == 1 ? "" : "s") — tap or type number", dim: false))
                pendingContacts = results.prefix(10).enumerated().map { i, p in
                    ChatTerminalContact(id: p.id, username: p.username, displayName: p.displayName,
                                        avatarUrl: nil, index: i + 1)
                }
                pendingContacts.forEach { push(.contact($0)) }
            }

        case "dm":
            let handle = arg.hasPrefix("@") ? String(arg.dropFirst()) : arg
            guard !handle.isEmpty else {
                push(.error("✗ usage: dm @username"))
                return
            }
            let lc = handle.lowercased()
            if let person = mutuals.first(where: { $0.username.lowercased() == lc }) {
                await openByUserId(userId: person.id, username: person.username, onOpen: onOpen)
            } else if let c = conversations.first(where: { $0.otherUsername.lowercased() == lc }) {
                await openByUserId(userId: c.otherUserId, username: c.otherUsername, onOpen: onOpen)
            } else {
                push(.error("✗ @\(handle) not found in mutual follows"))
            }

        default:
            if let num = Int(cmd), num >= 1, num <= pendingContacts.count {
                let c = pendingContacts[num - 1]
                await openByUserId(userId: c.id, username: c.username, onOpen: onOpen)
            } else {
                push(.error("✗ unknown command: \(cmd). type 'help' for commands."))
            }
        }
    }

    private func push(_ kind: ChatTerminalLine.Kind) {
        lines.append(ChatTerminalLine(id: nextId, kind: kind))
        nextId += 1
    }
}
