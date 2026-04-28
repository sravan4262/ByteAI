import SwiftUI

// MARK: - Interview Detail View

struct InterviewDetailView: View {
    let interviewId: String
    @StateObject private var vm: InterviewDetailViewModel
    @State private var commentText = ""
    @Environment(\.dismiss) private var dismiss

    init(interviewId: String) {
        self.interviewId = interviewId
        self._vm = StateObject(wrappedValue: InterviewDetailViewModel(id: interviewId))
    }

    var body: some View {
        ZStack {
            Color.byteBackground.ignoresSafeArea()

            if vm.isLoading {
                ByteSpinner(size: 32)
            } else if let interview = vm.interview {
                VStack(spacing: 0) {
                    ScrollView {
                        VStack(alignment: .leading, spacing: 0) {
                            MetaSection(interview: interview, vm: vm)
                            QuestionsSection(interview: interview, vm: vm)
                            CommentsSection(comments: vm.comments) { c in
                                Task { await vm.deleteComment(c) }
                            }
                            Color.clear.frame(height: 80)
                        }
                    }

                    CommentBar(text: $commentText, submitting: vm.submitting) {
                        Task { await vm.addComment(commentText); commentText = "" }
                    }
                }
            } else {
                Text("Interview not found")
                    .font(.system(.subheadline, design: .monospaced))
                    .foregroundColor(.byteText3)
            }
        }
        .navigationTitle("")
        .navigationBarTitleDisplayMode(.inline)
        .toolbarBackground(Color.byteBackground, for: .navigationBar)
        .toolbarColorScheme(.dark, for: .navigationBar)
        .toolbar {
            ToolbarItem(placement: .navigationBarTrailing) {
                HStack(spacing: 16) {
                    if let iv = vm.interview {
                        Button { Task { await vm.toggleBookmark() } } label: {
                            Image(systemName: vm.isBookmarked ? "bookmark.fill" : "bookmark")
                                .foregroundColor(vm.isBookmarked ? .byteCyan : .byteText2)
                        }
                        Button {
                            let msg = "Check out this interview on ByteAI: \(iv.title)"
                            let av = UIActivityViewController(activityItems: [msg], applicationActivities: nil)
                            UIApplication.shared.connectedScenes
                                .compactMap { $0 as? UIWindowScene }
                                .first?.windows.first?
                                .rootViewController?.present(av, animated: true)
                        } label: {
                            Image(systemName: "square.and.arrow.up")
                                .foregroundColor(.byteText2)
                        }
                    }
                }
            }
        }
        .task { await vm.load() }
    }
}

// MARK: - Meta Section

private struct MetaSection: View {
    let interview: Interview
    @ObservedObject var vm: InterviewDetailViewModel

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Author row — anonymous: ghost emoji + 👻 anonymous post badge
            if interview.isAnonymous {
                HStack(alignment: .top, spacing: 12) {
                    ZStack {
                        Circle()
                            .fill(Color.byteElement)
                            .frame(width: 38, height: 38)
                            .overlay(Circle().stroke(Color.byteBorderHigh, lineWidth: 1))
                        Text("👻").font(.system(size: 22))
                    }
                    VStack(alignment: .leading, spacing: 4) {
                        Text("Anonymous")
                            .font(.byteMono(13, weight: .bold))
                            .foregroundColor(.byteText2)
                        Text("👻 anonymous post")
                            .font(.byteMono(10, weight: .semibold))
                            .foregroundColor(.bytePurple)
                            .padding(.horizontal, 8).padding(.vertical, 3)
                            .background(IdentityColor.purple.bgFaint)
                            .overlay(RoundedRectangle(cornerRadius: 4).stroke(IdentityColor.purple.borderFaint, lineWidth: 1))
                            .clipShape(RoundedRectangle(cornerRadius: 4))
                    }
                    Spacer(minLength: 0)
                    Text(relativeTime(from: interview.createdAt))
                        .font(.byteMono(11))
                        .foregroundColor(.byteText2)
                }
            } else {
                HStack(spacing: 10) {
                    AvatarView(user: interview.author, size: .sm)
                    VStack(alignment: .leading, spacing: 2) {
                        Text("@\(interview.author.username)")
                            .font(.byteMono(13, weight: .semibold))
                            .foregroundColor(.byteText1)
                        if !interview.author.role.isEmpty || !interview.author.company.isEmpty {
                            let role = interview.author.role
                            let company = interview.author.company
                            let separator = (role.isEmpty || company.isEmpty) ? "" : " @ "
                            Text("\(role)\(separator)\(company)")
                                .font(.byteMono(11))
                                .foregroundColor(.byteText2)
                        }
                    }
                    Spacer()
                    Text(relativeTime(from: interview.createdAt))
                        .font(.byteMono(11))
                        .foregroundColor(.byteText2)
                }
            }

            // Type + metadata chips — INTERVIEW · company · role · location
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 6) {
                    BadgePill(text: "INTERVIEW", color: .bytePurple)
                    if let company = interview.company {
                        BadgePill(text: company.uppercased(), color: .byteText1)
                    }
                    if let role = interview.role {
                        BadgePill(text: role.uppercased(), color: .byteText1)
                    }
                    if let location = interview.location {
                        HStack(spacing: 4) {
                            Image(systemName: "mappin").font(.system(size: 9))
                            Text(location.uppercased())
                                .font(.byteMono(9, weight: .bold))
                        }
                        .foregroundColor(.byteText1)
                        .padding(.horizontal, 7).padding(.vertical, 3)
                        .background(Color.byteText1.opacity(0.08))
                        .overlay(RoundedRectangle(cornerRadius: 5).stroke(Color.byteBorderHigh, lineWidth: 1))
                        .clipShape(RoundedRectangle(cornerRadius: 5))
                    }
                    DifficultyChip(difficulty: interview.difficulty)
                }
            }

            Text(interview.title)
                .font(.system(size: 20, weight: .bold))
                .foregroundColor(.byteText1)
        }
        .padding(20)
        .overlay(alignment: .bottom) {
            Divider().background(Color.byteBorder)
        }
    }
}

// MARK: - Questions Section

private struct QuestionsSection: View {
    let interview: Interview
    @ObservedObject var vm: InterviewDetailViewModel

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                AccentBarHeader(label: "\(interview.questions.count) QUESTIONS", identity: .purple, size: .compact)
                Spacer()
                Button {
                    if vm.allExpanded {
                        vm.expandedIds = []
                    } else {
                        vm.expandedIds = Set(interview.questions.map { $0.id })
                    }
                } label: {
                    HStack(spacing: 4) {
                        Image(systemName: vm.allExpanded ? "arrow.up.left.and.arrow.down.right" : "arrow.down.right.and.arrow.up.left")
                            .font(.system(size: 11))
                        Text(vm.allExpanded ? "COLLAPSE ALL" : "EXPAND ALL")
                            .font(.system(size: 10, weight: .bold, design: .monospaced))
                    }
                    .foregroundColor(vm.allExpanded ? .bytePurple : .byteText2)
                }
            }

            ForEach(Array(interview.questions.enumerated()), id: \.element.id) { idx, q in
                QuestionCard(
                    q: q,
                    index: idx,
                    expanded: vm.expandedIds.contains(q.id),
                    onToggle: { vm.toggleQuestion(q.id) }
                )
            }
        }
        .padding(20)
        .overlay(alignment: .bottom) { Divider().background(Color.byteBorder) }
    }
}

private struct QuestionCard: View {
    let q: InterviewQuestion
    let index: Int
    let expanded: Bool
    let onToggle: () -> Void
    @State private var isLiked: Bool
    @State private var likeCount: Int

    init(q: InterviewQuestion, index: Int, expanded: Bool, onToggle: @escaping () -> Void) {
        self.q = q; self.index = index; self.expanded = expanded; self.onToggle = onToggle
        _isLiked = State(initialValue: q.isLiked)
        _likeCount = State(initialValue: q.likeCount)
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            Button(action: onToggle) {
                HStack(alignment: .top, spacing: 10) {
                    Text("Q\(index + 1)")
                        .font(.system(size: 9, weight: .bold, design: .monospaced))
                        .foregroundColor(.byteAccent)
                        .padding(.horizontal, 5).padding(.vertical, 2)
                        .background(Color.byteAccentDim)
                        .cornerRadius(4)
                        .padding(.top, 2)
                    Text(q.question)
                        .font(.system(size: 14, weight: .medium))
                        .foregroundColor(.byteText1)
                        .lineLimit(expanded ? nil : 2)
                        .frame(maxWidth: .infinity, alignment: .leading)
                    Image(systemName: expanded ? "chevron.up" : "chevron.down")
                        .font(.system(size: 12))
                        .foregroundColor(.byteText3)
                }
                .padding(14)
            }
            .buttonStyle(.plain)

            if expanded {
                Divider().background(Color.byteBorder)
                VStack(alignment: .leading, spacing: 10) {
                    Text(q.answer)
                        .font(.system(size: 13))
                        .foregroundColor(.byteText2)
                        .lineSpacing(3)
                    HStack(spacing: 16) {
                        Button {
                            let next = !isLiked
                            isLiked = next; likeCount += next ? 1 : -1
                            if next { UIImpactFeedbackGenerator(style: .light).impactOccurred() }
                            Task { try? await (next ? APIClient.shared.likeQuestion(questionId: q.id) : APIClient.shared.unlikeQuestion(questionId: q.id)) }
                        } label: {
                            Label("\(likeCount)", systemImage: isLiked ? "hand.thumbsup.fill" : "hand.thumbsup")
                                .font(.system(size: 12))
                                .foregroundColor(isLiked ? .byteGreen : .byteText3)
                        }
                    }
                }
                .padding(.horizontal, 14).padding(.bottom, 14)

                // Per-question comment thread (web parity: inline collapsible thread)
                Divider().background(Color.byteBorder)
                QuestionCommentThread(questionId: q.id, initialCount: q.commentCount)
            }
        }
        .background(Color.byteElement)
        .cornerRadius(10)
        .overlay(RoundedRectangle(cornerRadius: 10).stroke(Color.byteBorderMedium, lineWidth: 1))
    }
}

// MARK: - Per-question comment thread
// Mirrors UI/components/features/interviews/interview-detail-screen.tsx QuestionCommentThread.
// Lazy-loaded on first open; supports add + delete-own.

private struct QuestionCommentThread: View {
    let questionId: String
    let initialCount: Int
    @State private var isOpen = false
    @State private var isLoaded = false
    @State private var comments: [QuestionComment] = []
    @State private var draft = ""
    @State private var isSending = false
    @FocusState private var inputFocused: Bool

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            Button {
                withAnimation(.easeInOut(duration: 0.18)) { isOpen.toggle() }
                if isOpen, !isLoaded { Task { await load() } }
            } label: {
                HStack(spacing: 6) {
                    Image(systemName: "bubble.left").font(.system(size: 11)).foregroundColor(.byteAccent)
                    Text(displayedCount > 0 ? "COMMENTS (\(displayedCount))" : "COMMENTS")
                        .font(.byteMono(10, weight: .bold))
                        .tracking(0.6)
                        .foregroundColor(.byteText1)
                    Spacer()
                    Image(systemName: isOpen ? "chevron.up" : "chevron.down")
                        .font(.system(size: 11))
                        .foregroundColor(.byteAccent)
                }
                .padding(.horizontal, 14).padding(.vertical, 10)
            }
            .buttonStyle(.plain)

            if isOpen {
                VStack(alignment: .leading, spacing: 10) {
                    if isLoaded == false {
                        HStack(spacing: 6) {
                            ByteSpinner(size: 12)
                            Text("Loading…").font(.byteMono(10)).foregroundColor(.byteText2)
                        }
                    } else if comments.isEmpty {
                        Text("No comments yet")
                            .font(.byteMono(10))
                            .foregroundColor(.byteText2)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 4)
                    } else {
                        ForEach(comments) { c in
                            QuestionCommentRow(comment: c) {
                                Task { await delete(c) }
                            }
                        }
                    }

                    // Inline input — pill, gradient send circle
                    HStack(spacing: 8) {
                        TextField("Add a comment…", text: $draft, axis: .vertical)
                            .font(.byteSans(12))
                            .foregroundColor(.byteText1)
                            .tint(.byteAccent)
                            .focused($inputFocused)
                            .lineLimit(1...3)
                            .padding(.horizontal, 12).padding(.vertical, 8)
                            .background(IdentityColor.blue.bgFaint)
                            .overlay(Capsule().stroke(inputFocused ? .byteAccent : IdentityColor.blue.borderFaint, lineWidth: 1))
                            .clipShape(Capsule())
                        Button {
                            let text = draft
                            draft = ""
                            inputFocused = false
                            Task { await submit(text) }
                        } label: {
                            Image(systemName: "paperplane.fill")
                                .font(.system(size: 11))
                                .foregroundColor(.white)
                                .frame(width: 28, height: 28)
                                .background(LinearGradient(colors: [.byteAccent, Color(hex: "#1d4ed8")],
                                                           startPoint: .topLeading, endPoint: .bottomTrailing))
                                .clipShape(Circle())
                                .opacity(draft.trimmingCharacters(in: .whitespaces).isEmpty ? 0.4 : 1)
                        }
                        .buttonStyle(.plain)
                        .disabled(draft.trimmingCharacters(in: .whitespaces).isEmpty || isSending)
                    }
                }
                .padding(.horizontal, 14).padding(.bottom, 12)
                .transition(.opacity.combined(with: .move(edge: .top)))
            }
        }
    }

    private var displayedCount: Int { isLoaded ? comments.count : initialCount }

    private func load() async {
        let result = (try? await APIClient.shared.getQuestionComments(questionId: questionId)) ?? []
        comments = result
        isLoaded = true
    }

    private func submit(_ body: String) async {
        let trimmed = body.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return }
        isSending = true
        defer { isSending = false }
        if let created = try? await APIClient.shared.addQuestionComment(questionId: questionId, body: trimmed) {
            comments.append(created)
        }
    }

    private func delete(_ c: QuestionComment) async {
        do {
            try await APIClient.shared.deleteQuestionComment(commentId: c.id)
            comments.removeAll { $0.id == c.id }
        } catch { /* swallow — ToastCenter feedback could be added later */ }
    }
}

private struct QuestionCommentRow: View {
    let comment: QuestionComment
    let onDelete: () -> Void

    private var isOwn: Bool {
        guard let me = AuthManager.shared.currentUser else { return false }
        return comment.authorId == me.id
    }

    var body: some View {
        HStack(alignment: .top, spacing: 8) {
            // Tiny avatar — initial in a circle
            ZStack {
                Circle().fill(IdentityColor.purple.bgFaint).frame(width: 24, height: 24)
                Text(initial).font(.byteMono(10, weight: .bold)).foregroundColor(.bytePurple)
            }
            VStack(alignment: .leading, spacing: 4) {
                HStack(spacing: 6) {
                    Text("@\(comment.authorUsername ?? "user")")
                        .font(.byteMono(10, weight: .bold))
                        .foregroundColor(.byteText1)
                    if let role = comment.authorRoleTitle, !role.isEmpty {
                        Text(role)
                            .font(.byteMono(10))
                            .foregroundColor(.byteAccent)
                            .lineLimit(1)
                    }
                    Spacer()
                    Text(relativeTime(from: comment.createdAt))
                        .font(.byteMono(10))
                        .foregroundColor(.byteText2)
                    if isOwn {
                        Button(action: onDelete) {
                            Image(systemName: "trash")
                                .font(.system(size: 10))
                                .foregroundColor(.byteText3)
                        }
                        .buttonStyle(.plain)
                    }
                }
                Text(comment.body)
                    .font(.byteSans(12))
                    .foregroundColor(.byteText2)
                    .fixedSize(horizontal: false, vertical: true)
            }
        }
        .padding(8)
        .background(Color.byteBackground)
        .overlay(RoundedRectangle(cornerRadius: 10).stroke(Color.byteBorderHigh, lineWidth: 1))
        .clipShape(RoundedRectangle(cornerRadius: 10))
    }

    private var initial: String {
        let name = comment.authorDisplayName ?? comment.authorUsername ?? ""
        return String(name.first ?? "U").uppercased()
    }
}

// MARK: - Comments Section

private struct CommentsSection: View {
    let comments: [InterviewComment]
    let onDelete: (InterviewComment) -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            AccentBarHeader(label: "\(comments.count) DISCUSSION", identity: .purple, size: .compact)

            if comments.isEmpty {
                EmptyStateView(
                    icon: "bubble.left",
                    title: "NO DISCUSSION YET",
                    message: "Be the first to add insight."
                )
                .padding(.vertical, 4)
            } else {
                ForEach(comments) { c in
                    InterviewCommentRow(comment: c) { onDelete(c) }
                }
            }
        }
        .padding(20)
    }
}

private struct InterviewCommentRow: View {
    let comment: InterviewComment
    let onDelete: () -> Void

    private var isOwn: Bool {
        guard let me = AuthManager.shared.currentUser else { return false }
        return comment.authorId == me.id
    }

    private var initial: String {
        let name = comment.authorDisplayName ?? comment.authorUsername ?? ""
        return String(name.first ?? "U").uppercased()
    }

    var body: some View {
        HStack(alignment: .top, spacing: 10) {
            ZStack {
                Circle().fill(IdentityColor.purple.bgFaint).frame(width: 30, height: 30)
                if let url = comment.authorAvatarUrl, !url.isEmpty {
                    AsyncImage(url: URL(string: url)) { phase in
                        switch phase {
                        case .success(let image): image.resizable().aspectRatio(contentMode: .fill)
                        default: Text(initial).font(.byteMono(11, weight: .bold)).foregroundColor(.bytePurple)
                        }
                    }
                    .frame(width: 30, height: 30)
                    .clipShape(Circle())
                } else {
                    Text(initial).font(.byteMono(11, weight: .bold)).foregroundColor(.bytePurple)
                }
            }

            VStack(alignment: .leading, spacing: 4) {
                HStack(spacing: 6) {
                    Text("@\(comment.authorUsername ?? "user")")
                        .font(.byteMono(11, weight: .bold))
                        .foregroundColor(.byteText1)
                    if let role = comment.authorRoleTitle, !role.isEmpty {
                        Text(role)
                            .font(.byteMono(10))
                            .foregroundColor(.byteAccent)
                            .lineLimit(1)
                    }
                    Spacer()
                    Text(relativeTime(from: comment.createdAt))
                        .font(.byteMono(10))
                        .foregroundColor(.byteText2)
                    if isOwn {
                        Button(action: onDelete) {
                            Image(systemName: "trash")
                                .font(.system(size: 11))
                                .foregroundColor(.byteText3)
                        }
                        .buttonStyle(.plain)
                    }
                }
                Text(comment.body)
                    .font(.byteSans(13))
                    .foregroundColor(.byteText2)
                    .fixedSize(horizontal: false, vertical: true)
            }
        }
        .padding(12)
        .background(Color.byteCard)
        .overlay(RoundedRectangle(cornerRadius: 12).stroke(Color.byteBorderHigh, lineWidth: 1))
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }
}

// MARK: - Comment Bar

private struct CommentBar: View {
    @Binding var text: String
    let submitting: Bool
    let onSubmit: () -> Void

    var body: some View {
        HStack(spacing: 10) {
            TextField("Add a comment...", text: $text, axis: .vertical)
                .font(.system(size: 14))
                .foregroundColor(.byteText1)
                .padding(.horizontal, 14).padding(.vertical, 10)
                .background(Color.byteElement)
                .cornerRadius(20)
                .overlay(RoundedRectangle(cornerRadius: 20).stroke(Color.byteBorderMedium, lineWidth: 1))
                .lineLimit(1...4)
            if submitting {
                ProgressView().tint(.byteAccent)
            } else {
                Button(action: onSubmit) {
                    Image(systemName: "arrow.up.circle.fill")
                        .font(.system(size: 28))
                        .foregroundColor(text.trimmingCharacters(in: .whitespaces).isEmpty ? .byteText3 : .byteAccent)
                }
                .disabled(text.trimmingCharacters(in: .whitespaces).isEmpty)
            }
        }
        .padding(.horizontal, 16).padding(.vertical, 10)
        .background(Color.byteCard)
        .overlay(alignment: .top) { Divider().background(Color.byteBorder) }
    }
}

// MARK: - Badge Pill helper

private struct BadgePill: View {
    let text: String
    let color: Color
    var body: some View {
        Text(text)
            .font(.system(size: 9, weight: .bold, design: .monospaced))
            .foregroundColor(color)
            .padding(.horizontal, 7).padding(.vertical, 3)
            .background(color.opacity(0.12))
            .cornerRadius(5)
            .overlay(RoundedRectangle(cornerRadius: 5).stroke(color.opacity(0.4), lineWidth: 1))
    }
}

// MARK: - ViewModel

@MainActor
class InterviewDetailViewModel: ObservableObject {
    let id: String
    @Published var interview: Interview?
    @Published var comments: [InterviewComment] = []
    @Published var isLoading = true
    @Published var isBookmarked = false
    @Published var submitting = false
    @Published var expandedIds: Set<String> = []

    var allExpanded: Bool {
        guard let iv = interview, !iv.questions.isEmpty else { return false }
        return expandedIds.count == iv.questions.count
    }

    init(id: String) { self.id = id }

    func load() async {
        isLoading = true
        async let iv = APIClient.shared.getInterview(id: id)
        async let cs = APIClient.shared.getInterviewComments(interviewId: id)
        do {
            interview = try await iv
            comments = (try? await cs) ?? []
        } catch { }
        isLoading = false
    }

    func toggleQuestion(_ qid: String) {
        if expandedIds.contains(qid) { expandedIds.remove(qid) }
        else { expandedIds.insert(qid) }
    }

    func toggleBookmark() async {
        isBookmarked.toggle()
        do {
            _ = try await APIClient.shared.toggleBookmark(postId: id, type: "interview")
        } catch { isBookmarked.toggle() }
    }

    func addComment(_ text: String) async {
        guard !text.trimmingCharacters(in: .whitespaces).isEmpty else { return }
        submitting = true
        do {
            try await APIClient.shared.addInterviewComment(interviewId: id, body: text)
            comments = (try? await APIClient.shared.getInterviewComments(interviewId: id)) ?? comments
        } catch { }
        submitting = false
    }

    func deleteComment(_ c: InterviewComment) async {
        do {
            try await APIClient.shared.deleteInterviewComment(interviewId: id, commentId: c.id)
            comments.removeAll { $0.id == c.id }
        } catch { /* swallow — could surface a toast */ }
    }
}

// MARK: - Helpers

private func relativeTime(from iso: String) -> String {
    let formatter = ISO8601DateFormatter()
    formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
    guard let date = formatter.date(from: iso) else { return iso }
    let diff = Date().timeIntervalSince(date)
    switch diff {
    case ..<60:    return "just now"
    case ..<3600:  return "\(Int(diff/60))m ago"
    case ..<86400: return "\(Int(diff/3600))h ago"
    default:       return "\(Int(diff/86400))d ago"
    }
}

// Silence throw-but-no-await warnings on fire-and-forget async calls
extension Task where Failure == Error {
    @discardableResult func `catch`() -> Self { self }
}
