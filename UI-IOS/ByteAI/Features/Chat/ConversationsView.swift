import SwiftUI

struct ConversationsView: View {
    @StateObject private var vm = ConversationsVM()
    @EnvironmentObject private var chat: ChatService
    @EnvironmentObject private var router: DeepLinkRouter
    @Environment(\.dismiss) private var dismiss
    @State private var showNew = false
    @State private var pushedConversation: ConversationDto?
    @FocusState private var searchFocused: Bool

    private var unreadCount: Int {
        chat.conversations.reduce(0) { $0 + ($1.hasUnread ? 1 : 0) }
    }

    var body: some View {
        NavigationStack {
            ZStack(alignment: .bottom) {
                Color.byteBackground.ignoresSafeArea()

                VStack(spacing: 0) {
                    inboxTitleBar
                    accentLine
                    inboxSearchBar

                    summaryLine

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
                        Spacer()
                        VStack(spacing: 6) {
                            Text("◆ no conversations yet")
                                .font(.byteMono(11, weight: .semibold))
                                .foregroundColor(.byteGreen)
                            Text("tap NEW_CONVERSATION below to start one")
                                .font(.byteMono(10))
                                .foregroundColor(.byteText2)
                        }
                        Spacer()
                    } else {
                        ScrollView {
                            LazyVStack(spacing: 0) {
                                ForEach(vm.filteredConversations(chat.conversations)) { convo in
                                    Button { pushedConversation = convo } label: {
                                        TerminalConversationRow(convo: convo, index: indexFor(convo))
                                    }
                                    .buttonStyle(.plain)
                                    Rectangle()
                                        .fill(Color.byteBorderHigh.opacity(0.4))
                                        .frame(height: 1)
                                        .padding(.leading, 48)
                                }
                            }
                        }
                        .refreshable { await chat.refreshConversations() }
                    }

                    // Bottom safe-area space so the floating pill never overlaps content.
                    Color.clear.frame(height: 64)
                }

                NewConversationPill {
                    showNew = true
                }
                .padding(.bottom, 12)
            }
            .toolbar(.hidden, for: .navigationBar)
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

    private func indexFor(_ convo: ConversationDto) -> Int {
        (vm.filteredConversations(chat.conversations).firstIndex(where: { $0.id == convo.id }) ?? 0) + 1
    }

    // MARK: title bar — traffic lights + INBOX label + LIVE/OFFLINE status
    private var inboxTitleBar: some View {
        ZStack {
            HStack(spacing: 6) {
                Button { dismiss() } label: {
                    Circle()
                        .fill(Color(red: 1, green: 0.37, blue: 0.34))
                        .overlay(Circle().stroke(Color.black.opacity(0.15), lineWidth: 1))
                        .frame(width: 12, height: 12)
                }
                .buttonStyle(.plain)
                .accessibilityLabel("Close inbox")

                Button { vm.query = "" } label: {
                    Circle()
                        .fill(Color(red: 1, green: 0.74, blue: 0.18))
                        .overlay(Circle().stroke(Color.black.opacity(0.15), lineWidth: 1))
                        .frame(width: 12, height: 12)
                }
                .buttonStyle(.plain)
                .accessibilityLabel("Clear search")

                Circle()
                    .fill(Color.white.opacity(0.10))
                    .overlay(Circle().stroke(Color.white.opacity(0.08), lineWidth: 1))
                    .frame(width: 12, height: 12)

                Spacer()

                connectionBadge
            }
            .padding(.horizontal, 14)

            HStack(spacing: 6) {
                ZStack {
                    RoundedRectangle(cornerRadius: 4)
                        .fill(Color.byteGreen.opacity(0.10))
                        .overlay(RoundedRectangle(cornerRadius: 4).stroke(Color.byteGreen.opacity(0.20), lineWidth: 1))
                        .frame(width: 16, height: 16)
                    Image(systemName: "tray")
                        .font(.system(size: 9))
                        .foregroundColor(.byteGreen)
                }
                Text("INBOX")
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

    @ViewBuilder
    private var connectionBadge: some View {
        if chat.isConnected {
            HStack(spacing: 4) {
                Circle().fill(Color.byteGreen).frame(width: 5, height: 5)
                Text("LIVE")
                    .font(.byteMono(9, weight: .bold))
                    .tracking(0.5)
                    .foregroundColor(.byteGreen)
            }
            .padding(.horizontal, 6).padding(.vertical, 2)
            .background(Color.byteGreen.opacity(0.08))
            .overlay(RoundedRectangle(cornerRadius: 4)
                .stroke(Color.byteGreen.opacity(0.20), lineWidth: 1))
            .clipShape(RoundedRectangle(cornerRadius: 4))
        } else {
            Text("OFFLINE")
                .font(.byteMono(9, weight: .bold))
                .tracking(0.5)
                .foregroundColor(.byteText3)
                .padding(.horizontal, 6).padding(.vertical, 2)
                .background(Color.byteText3.opacity(0.08))
                .overlay(RoundedRectangle(cornerRadius: 4)
                    .stroke(Color.byteText3.opacity(0.20), lineWidth: 1))
                .clipShape(RoundedRectangle(cornerRadius: 4))
        }
    }

    private var accentLine: some View {
        LinearGradient(
            colors: [Color.byteGreen, Color.byteGreen.opacity(0.25), .clear],
            startPoint: .leading, endPoint: .trailing
        )
        .frame(height: 1)
    }

    // MARK: inline mono search field — replaces .searchable for terminal aesthetic
    private var inboxSearchBar: some View {
        HStack(spacing: 8) {
            Image(systemName: "magnifyingglass")
                .font(.system(size: 11))
                .foregroundColor(.byteGreen.opacity(0.7))
            TextField("search conversations…", text: $vm.query)
                .font(.byteMono(11))
                .foregroundColor(.byteText1)
                .tint(.byteGreen)
                .autocorrectionDisabled()
                .textInputAutocapitalization(.never)
                .focused($searchFocused)
            if !vm.query.isEmpty {
                Button { vm.query = "" } label: {
                    Image(systemName: "xmark.circle.fill")
                        .font(.system(size: 14))
                        .foregroundColor(.byteText3)
                }
                .buttonStyle(.plain)
            }
        }
        .padding(.horizontal, 12).padding(.vertical, 8)
        .background(Color.byteElement)
        .overlay(
            RoundedRectangle(cornerRadius: 8)
                .stroke(searchFocused ? Color.byteGreen : Color.byteBorderHigh, lineWidth: 1)
        )
        .clipShape(RoundedRectangle(cornerRadius: 8))
        .padding(.horizontal, 14)
        .padding(.vertical, 8)
    }

    @ViewBuilder
    private var summaryLine: some View {
        if !chat.conversations.isEmpty {
            HStack(spacing: 6) {
                Text("◆")
                    .font(.byteMono(10))
                    .foregroundColor(.byteGreen.opacity(0.7))
                Text("\(chat.conversations.count) conversation\(chat.conversations.count == 1 ? "" : "s")")
                    .font(.byteMono(10, weight: .semibold))
                    .foregroundColor(.byteText2)
                if unreadCount > 0 {
                    Text("· \(unreadCount) unread")
                        .font(.byteMono(10, weight: .semibold))
                        .foregroundColor(.byteAccent)
                }
                Spacer()
            }
            .padding(.horizontal, 14)
            .padding(.bottom, 6)
        }
    }
}

// MARK: - Terminal-styled Conversation Row

private struct TerminalConversationRow: View {
    let convo: ConversationDto
    let index: Int

    var body: some View {
        HStack(spacing: 10) {
            // [01] index
            Text(String(format: "[%02d]", index))
                .font(.byteMono(10, weight: .semibold))
                .foregroundColor(.byteText3)
                .frame(width: 32, alignment: .leading)

            AvatarView(
                String(convo.otherDisplayName.prefix(1)).uppercased(),
                variant: .cyan,
                size: .sm,
                imageUrl: convo.otherAvatarUrl
            )

            VStack(alignment: .leading, spacing: 2) {
                HStack(spacing: 6) {
                    if convo.hasUnread {
                        Circle().fill(Color.byteAccent).frame(width: 6, height: 6)
                    }
                    Text("@\(convo.otherUsername)")
                        .font(.byteMono(11, weight: .semibold))
                        .foregroundColor(.byteText1)
                        .lineLimit(1)
                    Spacer(minLength: 4)
                    if let when = convo.lastMessageAt {
                        Text(formatTime(when))
                            .font(.byteMono(9))
                            .foregroundColor(.byteText3)
                    }
                }
                Text(convo.lastMessage ?? "say hi 👋")
                    .font(.byteMono(10))
                    .foregroundColor(convo.hasUnread ? .byteText1 : .byteText2)
                    .lineLimit(1)
            }
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 10)
        .frame(maxWidth: .infinity, alignment: .leading)
        .contentShape(Rectangle())
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
        } else if Calendar.current.dateComponents([.day], from: date, to: Date()).day ?? 0 < 7 {
            f.dateStyle = .none; f.timeStyle = .none
            f.dateFormat = "EEE"
        } else {
            f.dateStyle = .short; f.timeStyle = .none
        }
        return f.string(from: date)
    }
}

// MARK: - New Conversation pill (bottom, thumb-reachable)

private struct NewConversationPill: View {
    let action: () -> Void

    var body: some View {
        Button { Haptics.medium(); action() } label: {
            HStack(spacing: 6) {
                Image(systemName: "plus")
                    .font(.system(size: 11, weight: .bold))
                Text("NEW_CONVERSATION")
                    .font(.byteMono(11, weight: .bold))
                    .tracking(0.8)
            }
            .foregroundColor(.byteGreen)
            .padding(.horizontal, 16).padding(.vertical, 10)
            .background(IdentityColor.green.bgActive)
            .overlay(Capsule().stroke(IdentityColor.green.solid, lineWidth: 1))
            .clipShape(Capsule())
            .shadow(color: Color.byteGreen.opacity(0.30), radius: 16, y: 4)
        }
        .buttonStyle(.plain)
        .accessibilityLabel("New conversation")
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
                quickActionStrip
                terminalInput
            }
        }
        .onAppear {
            withAnimation(.easeInOut(duration: 0.6).repeatForever(autoreverses: true)) {
                caretOn.toggle()
            }
            inputFocused = true
        }
        .task {
            await vm.loadMutuals()
            await vm.loadInitialContext(conversations: chat.conversations)
        }
        .toolbar {
            ToolbarItemGroup(placement: .keyboard) {
                Button { vm.recallPrevious() } label: {
                    Image(systemName: "chevron.up")
                        .font(.system(size: 14, weight: .semibold))
                }
                .disabled(!vm.canRecallPrevious)
                .accessibilityLabel("Previous command")

                Button { vm.recallNext() } label: {
                    Image(systemName: "chevron.down")
                        .font(.system(size: 14, weight: .semibold))
                }
                .disabled(!vm.canRecallNext)
                .accessibilityLabel("Next command")

                Button { vm.tabComplete() } label: {
                    Image(systemName: "arrow.right.to.line.compact")
                        .font(.system(size: 14, weight: .semibold))
                }
                .accessibilityLabel("Tab complete")

                Spacer()

                if !vm.draft.isEmpty {
                    Button { vm.draft = "" } label: {
                        Image(systemName: "xmark.circle.fill")
                            .font(.system(size: 16))
                    }
                    .accessibilityLabel("Clear input")
                }

                Button("Done") { inputFocused = false }
                    .font(.byteSans(13, weight: .semibold))
            }
        }
    }

    // Tap-to-fill command palette above the input.
    @ViewBuilder
    private var quickActionStrip: some View {
        if vm.draft.isEmpty {
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 6) {
                    ForEach(ChatQuickAction.allCases, id: \.self) { action in
                        ChatQuickChip(action: action) {
                            handleQuickAction(action)
                        }
                    }
                }
                .padding(.horizontal, 14)
                .padding(.vertical, 6)
            }
            .background(Color.byteGreen.opacity(0.02))
            .overlay(alignment: .top) {
                Rectangle().fill(Color.byteBorderHigh.opacity(0.4)).frame(height: 1)
            }
            .transition(.opacity)
        }
    }

    private func handleQuickAction(_ action: ChatQuickAction) {
        Haptics.light()
        switch action {
        case .help, .inbox, .recent, .clear:
            vm.draft = action.commandToken
            Task {
                await vm.submit(
                    conversations: chat.conversations,
                    onClose: { dismiss() },
                    onOpen: { convo in dismiss(); onOpenThread(convo) }
                )
            }
        case .dm:
            // Pre-fill the prompt — user types the @handle.
            vm.draft = "dm @"
            inputFocused = true
        case .search:
            vm.draft = "search "
            inputFocused = true
        }
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
        ChatTerminalLine(id: 1, kind: .system("ByteAI Chat v1.0 — type help or tap a command below."))
    ]
    @Published var draft = ""
    @Published var isLoading = false

    private var mutuals: [PersonResult] = []
    private var pendingContacts: [ChatTerminalContact] = []
    private var nextId = 2
    private var hasLoadedContext = false

    // Command history — `↑`/`↓` keyboard accessory cycles through this ring.
    private var history: [String] = []
    private var historyCursor: Int = -1
    private static let maxHistory = 20

    var canRecallPrevious: Bool { !history.isEmpty && historyCursor < history.count - 1 }
    var canRecallNext: Bool { historyCursor > 0 }

    func recallPrevious() {
        guard canRecallPrevious else { return }
        historyCursor += 1
        draft = history[history.count - 1 - historyCursor]
        Haptics.selection()
    }

    func recallNext() {
        guard canRecallNext else { return }
        historyCursor -= 1
        draft = history[history.count - 1 - historyCursor]
        Haptics.selection()
    }

    func tabComplete() {
        let prefix = draft.lowercased().trimmingCharacters(in: .whitespaces)
        guard !prefix.isEmpty else { return }
        let pool = ["help", "inbox", "recent", "search ", "dm @", "clear", "exit"]
        if let match = pool.first(where: { $0.hasPrefix(prefix) }), match != prefix {
            draft = match
            Haptics.light()
        }
    }

    func loadMutuals() async {
        mutuals = (try? await APIClient.shared.getMutualFollows()) ?? []
    }

    /// Push a recent-block on first appear so the empty terminal isn't dead air on iPhone.
    func loadInitialContext(conversations: [ConversationDto]) async {
        guard !hasLoadedContext else { return }
        hasLoadedContext = true
        if !mutuals.isEmpty {
            push(.text("◆ \(mutuals.count) mutual follow\(mutuals.count == 1 ? "" : "s") available.", dim: true))
        }
        let recent = conversations.prefix(5)
        if !recent.isEmpty {
            push(.text("◆ recent — type a number to open", dim: false))
            pendingContacts = recent.enumerated().map { i, c in
                ChatTerminalContact(id: c.otherUserId, username: c.otherUsername,
                                    displayName: c.otherDisplayName, avatarUrl: c.otherAvatarUrl, index: i + 1)
            }
            pendingContacts.forEach { push(.contact($0)) }
        }
    }

    func clear() {
        lines = [ChatTerminalLine(id: nextId, kind: .system("ByteAI Chat v1.0 — type help or tap a command below."))]
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
        recordHistory(raw)
        historyCursor = -1
        let lower = raw.lowercased()
        if lower == "clear" { draft = ""; clear(); return }
        if lower == "exit" || lower == "quit" { draft = ""; onClose(); return }
        push(.cmd(raw))
        draft = ""
        await runCommand(raw: raw, conversations: conversations, onOpen: onOpen)
    }

    private func recordHistory(_ raw: String) {
        let cleaned = raw.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !cleaned.isEmpty else { return }
        if let last = history.last, last == cleaned { return }
        history.append(cleaned)
        if history.count > Self.maxHistory {
            history.removeFirst(history.count - Self.maxHistory)
        }
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

// MARK: - Chat Quick Action chip strip

enum ChatQuickAction: CaseIterable, Hashable {
    case help, inbox, dm, search, recent, clear

    var label: String {
        switch self {
        case .help:   return "help"
        case .inbox:  return "inbox"
        case .dm:     return "dm"
        case .search: return "search"
        case .recent: return "recent"
        case .clear:  return "clear"
        }
    }

    var glyph: String {
        switch self {
        case .help:   return "questionmark.circle"
        case .inbox:  return "tray"
        case .dm:     return "at"
        case .search: return "magnifyingglass"
        case .recent: return "clock.arrow.circlepath"
        case .clear:  return "xmark.bin"
        }
    }

    /// Token typed into the input on tap.
    var commandToken: String {
        switch self {
        case .help:   return "help"
        case .inbox:  return "inbox"
        case .dm:     return "dm @"
        case .search: return "search "
        case .recent: return "recent"
        case .clear:  return "clear"
        }
    }
}

private struct ChatQuickChip: View {
    let action: ChatQuickAction
    let onTap: () -> Void

    var body: some View {
        Button(action: onTap) {
            HStack(spacing: 5) {
                Image(systemName: action.glyph)
                    .font(.system(size: 9, weight: .semibold))
                    .foregroundColor(.byteGreen)
                Text(action.label)
                    .font(.byteMono(10, weight: .semibold))
                    .tracking(0.4)
                    .foregroundColor(.byteText1)
            }
            .padding(.horizontal, 10)
            .padding(.vertical, 5)
            .background(IdentityColor.green.bgFaint)
            .overlay(
                RoundedRectangle(cornerRadius: 7)
                    .stroke(IdentityColor.green.borderFaint, lineWidth: 1)
            )
            .clipShape(RoundedRectangle(cornerRadius: 7))
        }
        .buttonStyle(.plain)
        .accessibilityLabel("\(action.label) shortcut")
    }
}
