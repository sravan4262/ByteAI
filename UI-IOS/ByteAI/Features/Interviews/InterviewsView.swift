import SwiftUI

// MARK: - Scroll anchor for custom pull-to-refresh

private struct InterviewTopAnchorKey: PreferenceKey {
    static var defaultValue: CGFloat = 0
    static func reduce(value: inout CGFloat, nextValue: () -> CGFloat) { value = nextValue() }
}

// MARK: - Interviews View

struct InterviewsView: View {
    @StateObject private var vm = InterviewsViewModel()
    @State private var pullProgress: CGFloat = 0
    @State private var isRefreshing = false
    @State private var anchorBaseline: CGFloat? = nil
    private let refreshThreshold: CGFloat = 58

    var body: some View {
        NavigationStack {
            GeometryReader { geo in
                ZStack(alignment: .top) {
                    Color.byteBackground.ignoresSafeArea()

                    if vm.isLoading && vm.interviews.isEmpty {
                        VStack { Spacer(); ByteSpinner(); Spacer() }.frame(maxWidth: .infinity)
                    } else if vm.interviews.isEmpty {
                        VStack {
                            Spacer()
                            EmptyStateView(
                                icon: "briefcase",
                                title: "No interviews found",
                                message: "Try adjusting your filters."
                            )
                            Spacer()
                        }
                    } else {
                        ScrollView(.vertical, showsIndicators: false) {
                            // Pull anchor
                            Color.clear
                                .frame(height: 0)
                                .background(GeometryReader { proxy in
                                    Color.clear.preference(
                                        key: InterviewTopAnchorKey.self,
                                        value: proxy.frame(in: .global).minY
                                    )
                                })

                            LazyVStack(spacing: 0) {
                                ForEach(vm.interviews) { interview in
                                    InterviewPageCard(interview: interview)
                                        .frame(height: geo.size.height)
                                        .scrollTransition(axis: .vertical) { content, phase in
                                            content
                                                .scaleEffect(1.0 - abs(phase.value) * 0.045)
                                                .opacity(1.0 - abs(phase.value) * 0.38)
                                                .rotation3DEffect(
                                                    .degrees(phase.value * 7),
                                                    axis: (x: 1, y: 0, z: 0),
                                                    perspective: 0.6
                                                )
                                        }
                                        .onAppear {
                                            if interview.id == vm.interviews.last?.id {
                                                Task { await vm.loadMore() }
                                            }
                                        }
                                }
                            }
                            .scrollTargetLayout()
                        }
                        .scrollTargetBehavior(.paging)
                        .scrollIndicators(.hidden)
                        .onPreferenceChange(InterviewTopAnchorKey.self) { value in
                            if anchorBaseline == nil { anchorBaseline = value; return }
                            guard let baseline = anchorBaseline, !isRefreshing else { return }
                            let pulled = value - baseline
                            if pulled > 0 {
                                withAnimation(.linear(duration: 0.04)) {
                                    pullProgress = min(1.0, pulled / refreshThreshold)
                                }
                                if pulled >= refreshThreshold {
                                    isRefreshing = true
                                    UIImpactFeedbackGenerator(style: .medium).impactOccurred()
                                    Task {
                                        await vm.load()
                                        withAnimation(.spring(response: 0.45, dampingFraction: 0.75)) {
                                            isRefreshing = false
                                            pullProgress = 0
                                        }
                                    }
                                }
                            } else if pullProgress > 0 {
                                withAnimation(.spring(response: 0.3, dampingFraction: 0.8)) {
                                    pullProgress = 0
                                }
                            }
                        }
                    }

                    // Pull-to-refresh indicator
                    if pullProgress > 0.05 || isRefreshing {
                        InterviewRefreshIndicator(progress: pullProgress, isRefreshing: isRefreshing)
                            .padding(.top, 12)
                            .transition(.opacity.combined(with: .scale(scale: 0.85)))
                            .animation(.spring(response: 0.35, dampingFraction: 0.75), value: isRefreshing)
                    }

                    // Gradient mask behind filter bar
                    LinearGradient(
                        colors: [Color.byteBackground.opacity(0.97), Color.byteBackground.opacity(0.7), .clear],
                        startPoint: .top,
                        endPoint: .bottom
                    )
                    .frame(height: 80)
                    .allowsHitTesting(false)

                    InterviewFilterBar(vm: vm)
                        .padding(.horizontal, 16)
                        .padding(.top, 10)
                }
            }
            .navigationTitle("Interviews")
            .navigationBarTitleDisplayMode(.inline)
            .toolbarBackground(Color.byteBackground, for: .navigationBar)
            .toolbarColorScheme(.dark, for: .navigationBar)
        }
        .task { await vm.load() }
    }
}

// MARK: - Pull-to-Refresh Indicator

private struct InterviewRefreshIndicator: View {
    let progress: CGFloat
    let isRefreshing: Bool
    @State private var spinAngle: Double = 0

    var body: some View {
        HStack(spacing: 10) {
            ZStack {
                Circle()
                    .stroke(Color.bytePurple.opacity(0.18), lineWidth: 2.5)
                    .frame(width: 22, height: 22)
                if isRefreshing {
                    Circle()
                        .trim(from: 0, to: 0.72)
                        .stroke(Color.bytePurple, style: StrokeStyle(lineWidth: 2.5, lineCap: .round))
                        .frame(width: 22, height: 22)
                        .rotationEffect(.degrees(spinAngle))
                        .onAppear {
                            withAnimation(.linear(duration: 0.72).repeatForever(autoreverses: false)) {
                                spinAngle = 360
                            }
                        }
                } else {
                    Circle()
                        .trim(from: 0, to: progress * 0.78)
                        .stroke(Color.bytePurple, style: StrokeStyle(lineWidth: 2.5, lineCap: .round))
                        .frame(width: 22, height: 22)
                        .rotationEffect(.degrees(-90))
                }
            }
            Text(isRefreshing ? "Refreshing…" : "Release to refresh")
                .font(.byteMono(11, weight: .medium))
                .foregroundColor(.byteText3)
        }
        .padding(.horizontal, 18)
        .padding(.vertical, 9)
        .background(.ultraThinMaterial, in: Capsule())
        .overlay(Capsule().stroke(Color.bytePurple.opacity(0.2), lineWidth: 0.5))
    }
}

// MARK: - Full-Screen Interview Card (TikTok-rail layout)

struct InterviewPageCard: View {
    let interview: Interview
    @State private var expandedId: String? = nil
    @State private var isBookmarked = false
    @State private var bookmarkGlow = false

    private var visibleQuestions: [InterviewQuestion] {
        Array(interview.questions.prefix(4))
    }

    var body: some View {
        ZStack(alignment: .trailing) {
            Color.byteBackground

            // ── Content column ──────────────────────────────────────────────
            VStack(alignment: .leading, spacing: 0) {
                Color.clear.frame(height: 64) // clears filter bar

                VStack(alignment: .leading, spacing: 12) {
                    // Author row
                    PostHeader(post: Post(
                        id: interview.id,
                        title: interview.title,
                        body: "",
                        author: interview.author,
                        tags: [],
                        likes: 0, comments: 0, shares: 0, bookmarks: 0,
                        timestamp: interview.createdAt,
                        isLiked: false, isBookmarked: false,
                        code: nil, views: nil,
                        type: .interview
                    ))

                    // Meta chips
                    HStack(spacing: 8) {
                        TypeBadge("INTERVIEW", color: .bytePurple)
                        DifficultyBadge(difficulty: interview.difficulty)
                        if let company = interview.company {
                            HStack(spacing: 3) {
                                Image(systemName: "building.2").font(.system(size: 9))
                                Text(company.uppercased()).font(.byteMonoTiny)
                            }
                            .foregroundColor(.byteText3)
                        }
                        Spacer()
                        Text("\(interview.questions.count) Q's")
                            .font(.byteMonoTiny)
                            .foregroundColor(.byteText3)
                    }

                    Text(interview.title)
                        .font(.byteSans(18, weight: .bold))
                        .foregroundColor(.byteText1)
                        .lineLimit(2)

                    Divider().background(Color.byteBorder)

                    // Accordion questions
                    VStack(spacing: 0) {
                        ForEach(visibleQuestions) { question in
                            QuestionRow(
                                question: question,
                                isExpanded: expandedId == question.id
                            ) {
                                withAnimation(.spring(response: 0.35, dampingFraction: 0.85)) {
                                    expandedId = expandedId == question.id ? nil : question.id
                                }
                            }
                        }
                    }

                    if interview.questions.count > 4 {
                        Text("+ \(interview.questions.count - 4) more questions")
                            .font(.byteMono(11))
                            .foregroundColor(.byteText3)
                            .padding(.top, 2)
                    }
                }
                .padding(.leading, 20)
                .padding(.trailing, 76)  // right clearance for action rail

                Spacer()

                // Swipe-up hint
                HStack {
                    Spacer()
                    Image(systemName: "chevron.compact.up")
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundColor(.byteText3)
                    Spacer()
                }
                .frame(height: 28)
            }

            // Bottom content fade
            VStack {
                Spacer()
                LinearGradient(
                    colors: [.clear, Color.byteBackground.opacity(0.6)],
                    startPoint: .top,
                    endPoint: .bottom
                )
                .frame(height: 72)
                .allowsHitTesting(false)
            }

            // ── Right-side action rail ────────────────────────────────────────
            VStack(spacing: 26) {
                Spacer()

                // Bookmark
                VStack(spacing: 5) {
                    Button {
                        withAnimation(.spring(response: 0.25, dampingFraction: 0.45)) {
                            isBookmarked.toggle()
                            bookmarkGlow = isBookmarked
                        }
                        if isBookmarked {
                            UIImpactFeedbackGenerator(style: .light).impactOccurred()
                        }
                    } label: {
                        Image(systemName: isBookmarked ? "bookmark.fill" : "bookmark")
                            .font(.system(size: 30))
                            .foregroundStyle(isBookmarked ? Color.byteCyan : Color.byteText1)
                            .shadow(color: bookmarkGlow ? Color.byteCyan.opacity(0.65) : .clear, radius: 9)
                    }
                    .buttonStyle(.plain)

                    Text(isBookmarked ? "Saved" : "Save")
                        .font(.byteSans(11, weight: .medium))
                        .foregroundColor(.byteText3)
                }

                // Share
                VStack(spacing: 5) {
                    ShareLink(item: "Check out this interview on ByteAI: \(interview.title)") {
                        Image(systemName: "square.and.arrow.up")
                            .font(.system(size: 28))
                            .foregroundColor(.byteText1)
                    }
                    Text("Share")
                        .font(.byteSans(11, weight: .medium))
                        .foregroundColor(.byteText3)
                }

                // View Full
                VStack(spacing: 5) {
                    NavigationLink(destination: InterviewDetailView(interviewId: interview.id)) {
                        Image(systemName: "arrow.up.right.square")
                            .font(.system(size: 26))
                            .foregroundColor(.byteText1)
                    }
                    Text("View")
                        .font(.byteSans(11, weight: .medium))
                        .foregroundColor(.byteText3)
                }

                // Role tag (vertical, compact)
                if let role = interview.role {
                    VStack(spacing: 4) {
                        Image(systemName: "person.fill")
                            .font(.system(size: 20))
                            .foregroundColor(.byteText3)
                        Text(role.uppercased())
                            .font(.byteMono(8, weight: .semibold))
                            .foregroundColor(.byteText3)
                            .multilineTextAlignment(.center)
                            .frame(maxWidth: 52)
                    }
                }

                Spacer().frame(height: 24)
            }
            .frame(width: 62)
        }
    }
}

// MARK: - Question Row

private struct QuestionRow: View {
    let question: InterviewQuestion
    let isExpanded: Bool
    let onToggle: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            Button(action: onToggle) {
                HStack(alignment: .top, spacing: 10) {
                    Text("Q\(question.orderIndex)")
                        .font(.byteMono(9, weight: .bold))
                        .foregroundColor(.byteAccent)
                        .padding(.horizontal, 5).padding(.vertical, 2)
                        .background(Color.byteAccentDim)
                        .cornerRadius(4)
                        .padding(.top, 2)

                    Text(question.question)
                        .font(.byteSans(13, weight: .medium))
                        .foregroundColor(.byteText1)
                        .multilineTextAlignment(.leading)
                        .lineLimit(isExpanded ? nil : 2)
                        .frame(maxWidth: .infinity, alignment: .leading)

                    Image(systemName: isExpanded ? "chevron.up" : "chevron.down")
                        .font(.system(size: 11))
                        .foregroundColor(.byteText3)
                }
            }
            .buttonStyle(.plain)
            .padding(.vertical, 10)

            if isExpanded {
                VStack(alignment: .leading, spacing: 10) {
                    Text(question.answer)
                        .font(.byteBody)
                        .foregroundColor(.byteText2)
                        .lineSpacing(3)
                        .lineLimit(6)

                    HStack(spacing: 8) {
                        ActionButton(
                            icon: "hand.thumbsup",
                            count: question.likeCount,
                            isActive: question.isLiked,
                            activeColor: .byteGreen
                        ) {
                            Task {
                                if question.isLiked {
                                    try? await APIClient.shared.unlikeQuestion(questionId: question.id)
                                } else {
                                    try? await APIClient.shared.likeQuestion(questionId: question.id)
                                }
                            }
                        }
                        ActionButton(icon: "bubble.left", count: question.commentCount) {}
                    }
                }
                .padding(.leading, 36)
                .padding(.bottom, 10)
                .transition(.opacity.combined(with: .move(edge: .top)))
            }

            Divider().background(Color.byteBorder)
        }
    }
}

// MARK: - Filter Bar

private struct InterviewFilterBar: View {
    @ObservedObject var vm: InterviewsViewModel

    var body: some View {
        HStack(spacing: 8) {
            Menu {
                Button("All Companies") { vm.selectedCompany = "" }
                Divider()
                ForEach(vm.companies, id: \.self) { c in Button(c) { vm.selectedCompany = c } }
            } label: {
                FilterChip(
                    label: vm.selectedCompany.isEmpty ? "COMPANY" : vm.selectedCompany.uppercased(),
                    icon: "building.2"
                )
            }

            Menu {
                Button("All Levels") { vm.selectedDifficulty = "" }
                ForEach(["easy", "medium", "hard"], id: \.self) { d in
                    Button(d.capitalized) { vm.selectedDifficulty = d }
                }
            } label: {
                FilterChip(
                    label: vm.selectedDifficulty.isEmpty ? "DIFFICULTY" : vm.selectedDifficulty.uppercased(),
                    icon: "slider.horizontal.3"
                )
            }

            Spacer()

            Text("\(vm.interviews.count) results")
                .font(.byteMonoTiny)
                .foregroundColor(.byteText3)
        }
    }
}

private struct FilterChip: View {
    let label: String
    let icon: String

    var body: some View {
        HStack(spacing: 4) {
            Image(systemName: icon).font(.system(size: 10))
            Text(label).font(.byteMono(10, weight: .medium))
            Image(systemName: "chevron.down").font(.system(size: 9))
        }
        .foregroundColor(.byteText2)
        .padding(.horizontal, 10).padding(.vertical, 6)
        .background(Color.byteElement).cornerRadius(6)
        .overlay(RoundedRectangle(cornerRadius: 6).stroke(Color.byteBorderMedium, lineWidth: 1))
    }
}

// MARK: - ViewModel

@MainActor
final class InterviewsViewModel: ObservableObject {
    @Published var interviews: [Interview] = []
    @Published var isLoading = false
    @Published var selectedCompany = "" {
        didSet { guard oldValue != selectedCompany else { return }; Task { await load() } }
    }
    @Published var selectedDifficulty = "" {
        didSet { guard oldValue != selectedDifficulty else { return }; Task { await load() } }
    }

    private var page = 1
    private var hasMore = true

    let companies = ["META", "GOOGLE", "STRIPE", "AMAZON", "APPLE", "MICROSOFT"]

    func load() async {
        isLoading = true
        defer { isLoading = false }
        page = 1
        hasMore = true
        do {
            interviews = try await APIClient.shared.getInterviews(
                company: selectedCompany.isEmpty ? nil : selectedCompany,
                difficulty: selectedDifficulty.isEmpty ? nil : selectedDifficulty
            )
        } catch is CancellationError {
            // Pull-to-refresh released early — keep existing interviews
        } catch {
            interviews = []
        }
    }

    func loadMore() async {
        guard hasMore, !isLoading else { return }
        page += 1
        do {
            let more = try await APIClient.shared.getInterviews(
                company: selectedCompany.isEmpty ? nil : selectedCompany,
                difficulty: selectedDifficulty.isEmpty ? nil : selectedDifficulty,
                page: page
            )
            if more.isEmpty { hasMore = false } else { interviews.append(contentsOf: more) }
        } catch {
            hasMore = false
        }
    }
}

#Preview { InterviewsView() }
