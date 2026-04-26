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
                NewConversationSheet { person in
                    Task {
                        if let convo = await vm.openConversation(with: person) {
                            showNew = false
                            pushedConversation = convo
                        }
                    }
                }
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

private struct NewConversationSheet: View {
    @StateObject private var vm = ConversationsVM()
    @Environment(\.dismiss) private var dismiss
    let onSelect: (PersonResult) -> Void

    var body: some View {
        NavigationStack {
            ZStack {
                Color.byteBackground.ignoresSafeArea()

                if vm.isLoadingMutuals && vm.mutuals.isEmpty {
                    VStack(spacing: 8) {
                        ForEach(0..<5, id: \.self) { _ in
                            RowSkeleton().padding(.horizontal, 16)
                        }
                        Spacer()
                    }
                    .padding(.vertical, 12)
                    .redacted(reason: .placeholder)
                    .accessibilityHidden(true)
                } else if vm.mutuals.isEmpty {
                    EmptyStateView(
                        icon: "person.2",
                        title: "No mutuals yet",
                        message: "You can chat with people you both follow."
                    )
                } else {
                    List(vm.mutuals) { person in
                        Button { onSelect(person) } label: {
                            HStack(spacing: 12) {
                                AvatarView(person.initials,
                                           variant: AvatarVariant(rawValue: person.avatarVariant) ?? .cyan,
                                           size: .sm)
                                VStack(alignment: .leading, spacing: 2) {
                                    Text(person.displayName)
                                        .font(.byteSans(14, weight: .semibold))
                                        .foregroundColor(.byteText1)
                                    Text("@\(person.username)")
                                        .font(.byteMonoTiny)
                                        .foregroundColor(.byteText3)
                                }
                                Spacer()
                            }
                        }
                        .listRowBackground(Color.byteCard)
                        .listRowSeparatorTint(Color.byteBorder)
                    }
                    .listStyle(.plain)
                    .scrollContentBackground(.hidden)
                }
            }
            .navigationTitle("New Message")
            .navigationBarTitleDisplayMode(.inline)
            .toolbarBackground(Color.byteBackground, for: .navigationBar)
            .toolbarColorScheme(.dark, for: .navigationBar)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Cancel") { dismiss() }.foregroundColor(.byteText2)
                }
            }
        }
        .task { await vm.loadMutuals() }
    }
}
