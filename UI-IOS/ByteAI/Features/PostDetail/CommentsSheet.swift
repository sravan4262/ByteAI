import SwiftUI

// MARK: - Comments View
// Mirrors UI/components/features/comments/comments-screen.tsx
// Push-nav screen (not a sheet) with rm destructive pattern on owned comments.
// Renamed from CommentsSheet → CommentsView for web parity.

struct CommentsView: View {
    let post: Post
    @StateObject private var vm: CommentsVM
    @EnvironmentObject private var toasts: ToastCenter

    init(post: Post) {
        self.post = post
        _vm = StateObject(wrappedValue: CommentsVM(postId: post.id))
    }

    var body: some View {
        ZStack {
            Color.byteBackground.ignoresSafeArea()
                .dismissKeyboardOnTap()

            VStack(spacing: 0) {
                if vm.isLoading && vm.comments.isEmpty {
                    ScrollView {
                        LazyVStack(spacing: 16) {
                            ForEach(0..<5, id: \.self) { _ in RowSkeleton() }
                        }
                        .padding(.horizontal, 16)
                        .padding(.vertical, 12)
                    }
                    .redacted(reason: .placeholder)
                    .accessibilityHidden(true)
                } else if vm.loadError {
                    Spacer()
                    EmptyStateView(
                        icon: "exclamationmark.triangle",
                        title: "Couldn't load comments",
                        message: "Pull down to try again."
                    )
                    .padding(.horizontal, 16)
                    Spacer()
                } else if vm.comments.isEmpty {
                    Spacer()
                    EmptyStateView(
                        icon: "bubble.left",
                        title: "No comments yet",
                        message: "Be the first to add a comment."
                    )
                    .padding(.horizontal, 16)
                    Spacer()
                } else {
                    ScrollView {
                        LazyVStack(alignment: .leading, spacing: 16) {
                            ForEach(vm.comments) { c in
                                CommentRow(
                                    comment: c,
                                    isOwn: vm.isOwn(comment: c),
                                    onDelete: { Task { await vm.delete(c) } }
                                )
                            }
                        }
                        .padding(.horizontal, 12)
                        .padding(.vertical, 12)
                    }
                    .scrollDismissesKeyboard(.interactively)
                    .refreshable { await vm.reload() }
                }

                Divider().background(Color.byteBorderHigh)
                CommentComposeBar(isSending: vm.isSending) { text in
                    await vm.submit(body: text)
                }
            }
        }
        .navigationTitle(vm.comments.isEmpty ? "Comments" : "Comments (\(vm.comments.count))")
        .navigationBarTitleDisplayMode(.inline)
        .toolbarBackground(Color.byteBackground, for: .navigationBar)
        .toolbarColorScheme(.dark, for: .navigationBar)
        .sheet(item: $vm.contentRejection) { rejection in
            ContentRejectedModal(rejection: rejection) {
                vm.contentRejection = nil
            }
            .presentationDetents([.medium, .large])
            .presentationDragIndicator(.visible)
            .presentationBackground(Color.byteCard)
            .presentationCornerRadius(20)
        }
        .task { await vm.load() }
    }
}

// MARK: - Row with rm destructive pattern

private struct CommentRow: View {
    let comment: Comment
    let isOwn: Bool
    let onDelete: () -> Void

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            AvatarView(user: comment.author, size: .sm)

            CardWithTopGradient {
                VStack(alignment: .leading, spacing: 8) {
                    HStack(spacing: 6) {
                        Text("@\(comment.author.username)")
                            .font(.byteMono(11, weight: .bold))
                            .foregroundColor(.byteText1)
                        if comment.author.isVerified {
                            Image(systemName: "checkmark.seal.fill")
                                .font(.system(size: 10))
                                .foregroundColor(.byteAccent)
                        }
                        Text(comment.timestamp)
                            .font(.byteMono(10))
                            .foregroundColor(.byteText2)
                        Spacer()
                        if isOwn {
                            RmConfirmButton(onDelete: onDelete)
                        } else {
                            ContentOverflowMenu(
                                contentType: "comment",
                                contentId: comment.id,
                                isOwnContent: false,
                                authorUserId: nil as String?,
                                authorUsername: nil as String?
                            )
                        }
                    }
                    Text(renderMentions(comment.content))
                        .font(.byteSans(14))
                        .foregroundColor(.byteText2)
                        .fixedSize(horizontal: false, vertical: true)
                        .handleMentionTaps()
                    if comment.votes > 0 {
                        HStack(spacing: 4) {
                            Image(systemName: "arrow.up").font(.system(size: 10))
                            Text("\(comment.votes)").font(.byteMono(10, weight: .bold))
                        }
                        .foregroundColor(.byteText2)
                        .padding(.top, 2)
                    }
                }
                .padding(.horizontal, 14)
                .padding(.vertical, 12)
            }
        }
    }
}

// MARK: - Compose bar (pill input + circular gradient send)

struct CommentComposeBar: View {
    let isSending: Bool
    /// Returns `true` only on a clean submit; on `false` the draft text is restored
    /// so the user can edit and resubmit (e.g. moderation rejected the comment).
    let onSubmit: (String) async -> Bool
    @State private var text = ""
    @FocusState private var focused: Bool

    @ObservedObject private var auth = AuthManager.shared
    private var meAvatarUrl: String? { auth.currentUser?.avatarUrl }
    private var meInitials: String { auth.currentUser?.initials ?? "?" }
    private var meId: String? { auth.currentUser?.id }

    var body: some View {
        HStack(alignment: .center, spacing: 10) {
            AvatarView(meInitials, variant: .cyan, size: .xs, imageUrl: meAvatarUrl, ownerUserId: meId)

            HStack(spacing: 8) {
                TextField("Add a comment…", text: $text, axis: .vertical)
                    .font(.byteSans(14))
                    .foregroundColor(.byteText1)
                    .tint(.byteAccent)
                    .lineLimit(1...4)
                    .focused($focused)
                    .submitLabel(.send)
            }
            .padding(.horizontal, 16).padding(.vertical, 10)
            .background(focused ? IdentityColor.blue.bgHover : IdentityColor.blue.bgFaint)
            .overlay(
                Capsule().stroke(focused ? .byteAccent : IdentityColor.blue.borderFaint, lineWidth: 1)
            )
            .clipShape(Capsule())

            Button {
                let copy = text
                text = ""
                focused = false
                Task {
                    let ok = await onSubmit(copy)
                    if !ok { text = copy }
                }
            } label: {
                Image(systemName: "paperplane.fill")
                    .font(.system(size: 14))
                    .foregroundColor(.white)
                    .frame(width: 38, height: 38)
                    .background(
                        LinearGradient(
                            colors: [.byteAccent, Color(hex: "#1d4ed8")],
                            startPoint: .topLeading, endPoint: .bottomTrailing
                        )
                    )
                    .clipShape(Circle())
                    .shadow(color: IdentityColor.blue.tint(0.5), radius: 8, y: 4)
                    .opacity(text.trimmingCharacters(in: .whitespaces).isEmpty ? 0.4 : 1)
            }
            .buttonStyle(.plain)
            .disabled(text.trimmingCharacters(in: .whitespaces).isEmpty || isSending)
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 10)
        .background(Color.byteBackground.opacity(0.95))
    }
}

// MARK: - ViewModel

@MainActor
final class CommentsVM: ObservableObject {
    @Published var comments: [Comment] = []
    @Published var isLoading = false
    @Published var isSending = false
    @Published var loadError = false
    /// Drives the moderation rejection sheet via `.sheet(item:)`.
    @Published var contentRejection: ContentRejection?
    private let postId: String

    init(postId: String) { self.postId = postId }

    func load() async {
        isLoading = true; loadError = false; defer { isLoading = false }
        do {
            comments = try await APIClient.shared.getComments(postId: postId)
        } catch {
            loadError = true
        }
    }

    func reload() async { await load() }

    /// Returns `true` only on a clean submit. On rejection we surface the modal
    /// and return `false` so the compose bar restores the draft for editing.
    func submit(body: String) async -> Bool {
        let trimmed = body.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return false }
        isSending = true; defer { isSending = false }
        do {
            try await APIClient.shared.addComment(postId: postId, body: trimmed)
            Haptics.success()
            await load()
            broadcastCount()
            return true
        } catch {
            if let rejection = APIError.rejection(from: error) {
                contentRejection = rejection
                return false
            }
            ToastCenter.shared.show("Couldn't post comment", kind: .error)
            return false
        }
    }

    func delete(_ comment: Comment) async {
        do {
            try await APIClient.shared.deleteComment(commentId: comment.id)
            comments.removeAll { $0.id == comment.id }
            ToastCenter.shared.show("Comment deleted", kind: .success)
            broadcastCount()
        } catch {
            ToastCenter.shared.show("Couldn't delete comment", kind: .error)
        }
    }

    // Broadcasts the authoritative count so cards always sync to reality.
    private func broadcastCount() {
        NotificationCenter.default.post(
            name: .postCommentsChanged,
            object: nil,
            userInfo: ["postId": postId, "count": comments.count]
        )
    }

    func isOwn(comment: Comment) -> Bool {
        guard let me = AuthManager.shared.currentUser else { return false }
        return comment.author.id == me.id
    }
}
