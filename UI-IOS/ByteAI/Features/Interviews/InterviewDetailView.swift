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
                            CommentsSection(comments: vm.comments)
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

    var diffColor: Color {
        switch interview.difficulty {
        case .easy:   return .byteGreen
        case .medium: return .byteOrange
        case .hard:   return .byteRed
        }
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Difficulty + type badges
            HStack(spacing: 6) {
                BadgePill(text: "INTERVIEW", color: .bytePurple)
                BadgePill(text: interview.difficulty.label.uppercased(), color: diffColor)
                if let company = interview.company {
                    BadgePill(text: company.uppercased(), color: .byteText3)
                }
            }

            Text(interview.title)
                .font(.system(size: 20, weight: .bold))
                .foregroundColor(.byteText1)

            // Author row
            HStack(spacing: 10) {
                AvatarView(user: interview.author, size: .sm)
                VStack(alignment: .leading, spacing: 2) {
                    Text("@\(interview.author.username)")
                        .font(.system(size: 13, weight: .semibold, design: .monospaced))
                        .foregroundColor(.byteText1)
                    if let role = interview.role {
                        let suffix = interview.company.map { " @ \($0)" } ?? ""
                        Text("\(role)\(suffix)")
                            .font(.system(size: 11))
                            .foregroundColor(.byteText3)
                    }
                }
                Spacer()
                Text(relativeTime(from: interview.createdAt))
                    .font(.system(size: 11, design: .monospaced))
                    .foregroundColor(.byteText3)
            }
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
                Text("// \(interview.questions.count) QUESTIONS")
                    .font(.system(size: 11, weight: .bold, design: .monospaced))
                    .foregroundColor(.byteText3)
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
                            .font(.system(size: 9, weight: .bold, design: .monospaced))
                    }
                    .foregroundColor(vm.allExpanded ? .byteAccent : .byteText3)
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
                            Task { await (next ? APIClient.shared.likeQuestion(questionId: q.id) : APIClient.shared.unlikeQuestion(questionId: q.id)).catch() }
                        } label: {
                            Label("\(likeCount)", systemImage: isLiked ? "hand.thumbsup.fill" : "hand.thumbsup")
                                .font(.system(size: 12))
                                .foregroundColor(isLiked ? .byteGreen : .byteText3)
                        }
                        Label("\(q.commentCount)", systemImage: "bubble.right")
                            .font(.system(size: 12))
                            .foregroundColor(.byteText3)
                    }
                }
                .padding(.horizontal, 14).padding(.bottom, 14)
            }
        }
        .background(Color.byteElement)
        .cornerRadius(10)
        .overlay(RoundedRectangle(cornerRadius: 10).stroke(Color.byteBorderMed, lineWidth: 1))
    }
}

// MARK: - Comments Section

private struct CommentsSection: View {
    let comments: [InterviewComment]

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("// \(comments.count) COMMENTS")
                .font(.system(size: 11, weight: .bold, design: .monospaced))
                .foregroundColor(.byteText3)

            if comments.isEmpty {
                Text("Be the first to comment.")
                    .font(.system(size: 13))
                    .foregroundColor(.byteText3)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 20)
            } else {
                ForEach(comments) { c in
                    HStack(alignment: .top, spacing: 10) {
                        Circle()
                            .fill(Color.byteAccentDim)
                            .frame(width: 30, height: 30)
                            .overlay(
                                Text(String(c.authorId.prefix(1)).uppercased())
                                    .font(.system(size: 11, weight: .bold, design: .monospaced))
                                    .foregroundColor(.byteAccent)
                            )
                        VStack(alignment: .leading, spacing: 3) {
                            Text("@\(c.authorId.prefix(8))")
                                .font(.system(size: 12, weight: .semibold, design: .monospaced))
                                .foregroundColor(.byteText1)
                            Text(c.body)
                                .font(.system(size: 13))
                                .foregroundColor(.byteText2)
                            Text(relativeTime(from: c.createdAt))
                                .font(.system(size: 10))
                                .foregroundColor(.byteText3)
                        }
                    }
                }
            }
        }
        .padding(20)
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
                .overlay(RoundedRectangle(cornerRadius: 20).stroke(Color.byteBorderMed, lineWidth: 1))
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
