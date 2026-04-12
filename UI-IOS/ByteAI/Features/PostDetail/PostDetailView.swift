import SwiftUI

// MARK: - Post Detail View
// Mirrors /(app)/post/[id]/page.tsx

struct PostDetailView: View {
    @State var post: Post
    @StateObject private var vm: PostDetailViewModel

    init(post: Post) {
        self._post = State(initialValue: post)
        self._vm = StateObject(wrappedValue: PostDetailViewModel(postId: post.id))
    }

    var body: some View {
        ZStack {
            Color.byteBackground.ignoresSafeArea()

            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    // Full post header
                    PostHeader(post: post)

                    // Title
                    Text(post.title)
                        .font(.byteH2)
                        .foregroundColor(.byteText1)

                    // Full body (no truncation)
                    Text(post.body)
                        .font(.byteBody)
                        .foregroundColor(.byteText2)
                        .lineSpacing(4)

                    // Code block
                    if let code = post.code {
                        CodeBlockView(snippet: code)
                    }

                    // Tags
                    FlowLayout(spacing: 6) {
                        ForEach(post.tags, id: \.self) { tag in
                            TagView(label: tag)
                        }
                    }

                    Divider().background(Color.byteBorderMedium)

                    // Reaction stats
                    HStack(spacing: 12) {
                        StatChip(icon: "heart.fill", value: post.likes, color: .byteRed)
                        StatChip(icon: "bubble.left.fill", value: post.comments, color: .byteCyan)
                        StatChip(icon: "bookmark.fill", value: post.bookmarks, color: .bytePurple)
                        if let views = post.views {
                            StatChip(icon: "eye.fill", value: views, color: .byteText3)
                        }
                    }

                    // Action bar
                    HStack(spacing: 8) {
                        ActionButton(
                            icon: "heart",
                            count: post.likes,
                            isActive: post.isLiked,
                            activeColor: .byteRed
                        ) {
                            withAnimation(.spring(response: 0.3)) {
                                post.isLiked.toggle()
                                post.likes += post.isLiked ? 1 : -1
                            }
                        }

                        ActionButton(icon: "square.and.arrow.up") {}

                        Spacer()

                        ActionButton(
                            icon: "bookmark",
                            isActive: post.isBookmarked,
                            activeColor: .byteCyan
                        ) {
                            withAnimation { post.isBookmarked.toggle() }
                        }
                    }

                    Divider().background(Color.byteBorderMedium)

                    // Comments section
                    CommentsSection(vm: vm)
                }
                .padding(16)
            }
        }
        .navigationTitle("Byte")
        .navigationBarTitleDisplayMode(.inline)
        .task { await vm.loadComments() }
    }
}

// MARK: - Stat Chip

private struct StatChip: View {
    let icon: String
    let value: Int
    let color: Color

    var body: some View {
        HStack(spacing: 4) {
            Image(systemName: icon).font(.system(size: 11)).foregroundColor(color)
            Text("\(value)").font(.byteMonoSmall).foregroundColor(.byteText2)
        }
        .padding(.horizontal, 8)
        .padding(.vertical, 4)
        .background(color.opacity(0.08))
        .cornerRadius(6)
    }
}

// MARK: - Comments Section

private struct CommentsSection: View {
    @ObservedObject var vm: PostDetailViewModel
    @State private var newComment = ""
    @FocusState private var isInputFocused: Bool

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack {
                Text("COMMENTS")
                    .font(.byteMono(11, weight: .bold))
                    .foregroundColor(.byteText3)
                    .tracking(1)
                Spacer()
                if !vm.comments.isEmpty {
                    Text("\(vm.comments.count)")
                        .font(.byteMonoSmall)
                        .foregroundColor(.byteText2)
                }
            }

            // Add comment input
            HStack(spacing: 10) {
                AvatarView(MockData.users[0].initials, variant: .cyan, size: .sm)

                TextField("Add a comment...", text: $newComment, axis: .vertical)
                    .font(.byteBody)
                    .foregroundColor(.byteText1)
                    .tint(.byteAccent)
                    .focused($isInputFocused)
                    .lineLimit(1...4)
                    .padding(10)
                    .background(Color.byteElement)
                    .cornerRadius(8)
                    .overlay(
                        RoundedRectangle(cornerRadius: 8)
                            .stroke(isInputFocused ? Color.byteAccent.opacity(0.5) : Color.byteBorderMedium, lineWidth: 1)
                    )

                if !newComment.isEmpty {
                    Button {
                        Task { await vm.addComment(body: newComment) }
                        newComment = ""
                        isInputFocused = false
                    } label: {
                        Image(systemName: "paperplane.fill")
                            .font(.system(size: 14))
                            .foregroundColor(.byteAccent)
                    }
                }
            }

            if vm.isLoadingComments {
                HStack { ByteSpinner(size: 20) }.frame(maxWidth: .infinity)
            } else if vm.comments.isEmpty {
                EmptyStateView(icon: "bubble.left", title: "No comments yet", message: "Be the first to share your thoughts.")
            } else {
                ForEach(vm.comments) { comment in
                    CommentRow(comment: comment)
                }
            }
        }
    }
}

// MARK: - Comment Row

struct CommentRow: View {
    let comment: Comment

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(spacing: 8) {
                AvatarView(user: comment.author, size: .sm)
                VStack(alignment: .leading, spacing: 2) {
                    HStack(spacing: 4) {
                        Text(comment.author.displayName)
                            .font(.byteSans(12, weight: .semibold))
                            .foregroundColor(.byteText1)
                        Text("·")
                            .foregroundColor(.byteText3)
                        Text(comment.timestamp)
                            .font(.byteMonoTiny)
                            .foregroundColor(.byteText3)
                    }
                    Text(comment.author.role)
                        .font(.byteMonoTiny)
                        .foregroundColor(.byteText3)
                }
            }

            Text(comment.content)
                .font(.byteBody)
                .foregroundColor(.byteText2)
                .padding(.leading, 40)

            // Vote + reply
            HStack(spacing: 10) {
                Spacer().frame(width: 32)
                ActionButton(icon: "arrow.up", count: comment.votes, action: {})
                Text("Reply")
                    .font(.byteMonoTiny)
                    .foregroundColor(.byteText2)
            }

            // Nested replies
            if !comment.replies.isEmpty {
                VStack(alignment: .leading, spacing: 8) {
                    ForEach(comment.replies) { reply in
                        HStack(alignment: .top, spacing: 8) {
                            Rectangle()
                                .fill(Color.byteBorderMedium)
                                .frame(width: 1)
                                .padding(.leading, 20)
                            CommentRow(comment: reply)
                        }
                    }
                }
            }

            Divider().background(Color.byteBorder)
        }
    }
}

// MARK: - Flow Layout (tags)

struct FlowLayout: Layout {
    var spacing: CGFloat = 8

    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        let rows = computeRows(proposal: proposal, subviews: subviews)
        let height = rows.reduce(0) { $0 + $1.maxHeight } + CGFloat(max(0, rows.count - 1)) * spacing
        return CGSize(width: proposal.width ?? 0, height: height)
    }

    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        var rows = computeRows(proposal: proposal, subviews: subviews)
        var y = bounds.minY
        for row in rows {
            var x = bounds.minX
            for subview in row.subviews {
                let size = subview.sizeThatFits(.unspecified)
                subview.place(at: CGPoint(x: x, y: y), proposal: ProposedViewSize(size))
                x += size.width + spacing
            }
            y += row.maxHeight + spacing
        }
    }

    private struct Row {
        var subviews: [LayoutSubview] = []
        var maxHeight: CGFloat = 0
    }

    private func computeRows(proposal: ProposedViewSize, subviews: Subviews) -> [Row] {
        let maxWidth = proposal.width ?? .infinity
        var rows: [Row] = []
        var currentRow = Row()
        var currentX: CGFloat = 0

        for subview in subviews {
            let size = subview.sizeThatFits(.unspecified)
            if currentX + size.width > maxWidth, !currentRow.subviews.isEmpty {
                rows.append(currentRow)
                currentRow = Row()
                currentX = 0
            }
            currentRow.subviews.append(subview)
            currentRow.maxHeight = max(currentRow.maxHeight, size.height)
            currentX += size.width + spacing
        }
        if !currentRow.subviews.isEmpty { rows.append(currentRow) }
        return rows
    }
}

// MARK: - ViewModel

@MainActor
final class PostDetailViewModel: ObservableObject {
    let postId: String
    @Published var comments: [Comment] = []
    @Published var isLoadingComments = false

    init(postId: String) { self.postId = postId }

    func loadComments() async {
        isLoadingComments = true
        defer { isLoadingComments = false }
        comments = (try? await APIClient.shared.getComments(postId: postId)) ?? []
    }

    func addComment(body: String) async {
        try? await APIClient.shared.addComment(postId: postId, body: body)
        await loadComments()
    }
}

#Preview {
    NavigationStack {
        PostDetailView(post: MockData.posts[0])
    }
    .background(Color.byteBackground)
}
