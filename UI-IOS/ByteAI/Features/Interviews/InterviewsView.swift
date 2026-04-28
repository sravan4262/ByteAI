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
                            .padding(.top, 90)
                            .transition(.opacity.combined(with: .scale(scale: 0.85)))
                            .animation(.spring(response: 0.35, dampingFraction: 0.75), value: isRefreshing)
                    }

                    // Top chrome — purple FloatingHeaderCard + filter bar (matches web)
                    VStack(spacing: 8) {
                        FloatingHeaderCard(
                            icon: "briefcase.fill",
                            title: "INTERVIEWS",
                            subtitle: "FIND INTERVIEWS ACROSS TOP COMPANIES · ACE YOUR NEXT ROLE",
                            identity: .purple
                        ) { EmptyView() }

                        InterviewFilterBar(vm: vm)
                            .padding(.horizontal, 16)
                    }
                    .padding(.bottom, 6)
                    .background(
                        LinearGradient(
                            colors: [Color.byteBackground.opacity(0.97), Color.byteBackground.opacity(0.7), .clear],
                            startPoint: .top, endPoint: .bottom
                        )
                        .frame(height: 200)
                        .allowsHitTesting(false),
                        alignment: .top
                    )
                }
            }
            .navigationBarHidden(true)
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
                .foregroundColor(.byteText2)
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
    @State private var isBookmarked: Bool
    @State private var bookmarkGlow = false
    @State private var miniProfileTarget: MiniProfileTarget? = nil

    init(interview: Interview) {
        self.interview = interview
        _isBookmarked = State(initialValue: interview.isBookmarked)
    }

    private var visibleQuestions: [InterviewQuestion] {
        Array(interview.questions.prefix(4))
    }

    var body: some View {
        ZStack(alignment: .bottom) {
            Color.byteBackground

            VStack(alignment: .leading, spacing: 0) {
                Color.clear.frame(height: 140) // clears floating header + filter bar

                VStack(alignment: .leading, spacing: 12) {
                    if interview.isAnonymous {
                        AnonymousAuthorRow(timestamp: interview.createdAt)
                    } else {
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
                        )) {
                            miniProfileTarget = MiniProfileTarget(
                                userId: interview.author.id,
                                username: interview.author.username,
                                displayName: interview.author.displayName,
                                initials: interview.author.initials,
                                avatarUrl: interview.author.avatarUrl,
                                role: interview.author.role,
                                company: interview.author.company,
                                tags: []
                            )
                        }
                    }

                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 6) {
                            TypeBadge("INTERVIEW", color: .bytePurple)
                            if let company = interview.company { MetaChip(text: company) }
                            if let role = interview.role { MetaChip(text: role) }
                            if let location = interview.location { MetaChip(text: location, icon: "mappin") }
                            DifficultyChip(difficulty: interview.difficulty)
                        }
                    }

                    Text(interview.title)
                        .font(.byteSans(18, weight: .bold))
                        .foregroundColor(.byteText1)
                        .lineLimit(2)

                    Divider().background(Color.byteBorder)

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
                            .foregroundColor(.byteText2)
                            .padding(.top, 2)
                    }

                    // ── Horizontal action row — mirrors BytePageCard.actionRow ──────
                    actionRow
                        .padding(.top, 4)
                }
                .padding(.horizontal, 20)

                Spacer()

                HStack {
                    Spacer()
                    Image(systemName: "chevron.compact.up")
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundColor(.byteText3)
                    Spacer()
                }
                .frame(height: 28)
            }

            VStack {
                Spacer()
                LinearGradient(
                    colors: [.clear, Color.byteBackground.opacity(0.6)],
                    startPoint: .top, endPoint: .bottom
                )
                .frame(height: 72)
                .allowsHitTesting(false)
            }
        }
        .sheet(item: $miniProfileTarget) { target in
            UserMiniProfileSheet(target: target)
        }
    }

    // Horizontal pill-style action row matching BytePageCard — Save / Share / Comments / VIEW
    private var actionRow: some View {
        HStack(spacing: 8) {
            Button {
                withAnimation(.spring(response: 0.25, dampingFraction: 0.45)) {
                    isBookmarked.toggle()
                    bookmarkGlow = isBookmarked
                }
                if isBookmarked { Haptics.light() }
                Task { try? await APIClient.shared.toggleBookmark(postId: interview.id, type: "interview") }
            } label: {
                interviewPillLabel(
                    icon: isBookmarked ? "bookmark.fill" : "bookmark",
                    text: isBookmarked ? "SAVED" : "SAVE",
                    isActive: isBookmarked,
                    activeTint: .byteCyan
                )
                .shadow(color: bookmarkGlow ? Color.byteCyan.opacity(0.45) : .clear, radius: 6)
            }
            .buttonStyle(.plain)

            ShareLink(item: "Check out this interview on ByteAI: \(interview.title)") {
                interviewPillLabel(icon: "square.and.arrow.up", text: "SHARE", isActive: false)
            }
            .buttonStyle(.plain)

            NavigationLink(destination: InterviewDetailView(interviewId: interview.id)) {
                interviewPillLabel(
                    icon: "bubble.left",
                    text: "\(interview.commentCount)",
                    isActive: false
                )
            }
            .buttonStyle(.plain)

            Spacer(minLength: 8)

            NavigationLink(destination: InterviewDetailView(interviewId: interview.id)) {
                HStack(spacing: 6) {
                    Text("VIEW_INTERVIEW")
                        .font(.byteMono(10, weight: .bold))
                        .tracking(1.0)
                    Text("→")
                        .font(.byteMono(10, weight: .bold))
                }
                .foregroundColor(IdentityColor.purple.solid)
                .padding(.horizontal, 14).padding(.vertical, 10)
                .background(IdentityColor.purple.bgCTA)
                .overlay(RoundedRectangle(cornerRadius: 8).stroke(IdentityColor.purple.borderCTA, lineWidth: 1))
                .clipShape(RoundedRectangle(cornerRadius: 8))
            }
            .buttonStyle(.plain)
        }
    }

    @ViewBuilder
    private func interviewPillLabel(icon: String, text: String, isActive: Bool, activeTint: Color = .bytePurple) -> some View {
        HStack(spacing: 6) {
            Image(systemName: icon).font(.system(size: 13))
            Text(text).font(.byteMono(11)).tracking(0.5)
        }
        .foregroundColor(isActive ? activeTint : .byteText1)
        .padding(.horizontal, 12).padding(.vertical, 8)
        .background(isActive ? IdentityColor.purple.bgActive : IdentityColor.purple.bgFaint)
        .overlay(
            RoundedRectangle(cornerRadius: 8)
                .stroke(isActive ? activeTint : IdentityColor.purple.borderFaint, lineWidth: 1)
        )
        .clipShape(RoundedRectangle(cornerRadius: 8))
    }
}

// MARK: - Anonymous author row (web parity: ghost emoji + "Anonymous" + 👻 anonymous post badge)

private struct AnonymousAuthorRow: View {
    let timestamp: String

    var body: some View {
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
            Text(timestamp)
                .font(.byteMono(10))
                .foregroundColor(.byteText2)
        }
    }
}

// MARK: - Difficulty chip — colored EASY/MEDIUM/HARD pill (web parity)

struct DifficultyChip: View {
    let difficulty: Interview.Difficulty

    private var color: Color {
        switch difficulty {
        case .easy:   return .byteGreen
        case .medium: return .byteOrange
        case .hard:   return .byteRed
        }
    }

    var body: some View {
        Text(difficulty.rawValue.uppercased())
            .font(.byteMono(10, weight: .bold))
            .tracking(0.6)
            .foregroundColor(color)
            .padding(.horizontal, 8).padding(.vertical, 4)
            .background(color.opacity(0.07))
            .overlay(RoundedRectangle(cornerRadius: 6).stroke(color.opacity(0.35), lineWidth: 1))
            .clipShape(RoundedRectangle(cornerRadius: 6))
    }
}

// MARK: - Meta chip (small inline metadata pill — company / role / location)

private struct MetaChip: View {
    let text: String
    var icon: String? = nil

    var body: some View {
        HStack(spacing: 4) {
            if let icon {
                Image(systemName: icon).font(.system(size: 9))
            }
            Text(text)
                .font(.byteMono(10, weight: .semibold))
                .lineLimit(1)
        }
        .foregroundColor(.byteText1)
        .padding(.horizontal, 8).padding(.vertical, 4)
        .background(Color.byteElement)
        .overlay(RoundedRectangle(cornerRadius: 6).stroke(Color.byteBorderHigh, lineWidth: 1))
        .clipShape(RoundedRectangle(cornerRadius: 6))
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
                        .font(.byteMono(10, weight: .bold))
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

// MARK: - Filter Bar — web parity: COMPANY · ROLE · LOCATION + RESET

// MARK: - Interview Filter Bar
// Token-bar design: active filters shown as dismissible chips inline.
// Tapping the ⊞ icon opens a single bottom sheet with all 4 filters as full-width rows.

private struct InterviewFilterBar: View {
    @ObservedObject var vm: InterviewsViewModel
    @State private var showPanel = false

    private static let difficultyOptions: [SearchableDropdown.DropdownOption] = [
        .init(value: "easy",   label: "EASY"),
        .init(value: "medium", label: "MEDIUM"),
        .init(value: "hard",   label: "HARD"),
    ]

    private var activeFilters: [(label: String, key: ReferenceWritableKeyPath<InterviewsViewModel, String>)] {
        var out: [(String, ReferenceWritableKeyPath<InterviewsViewModel, String>)] = []
        if !vm.selectedCompany.isEmpty    { out.append((vm.selectedCompany,    \.selectedCompany)) }
        if !vm.selectedRole.isEmpty       { out.append((vm.selectedRole,       \.selectedRole)) }
        if !vm.selectedLocation.isEmpty   { out.append((vm.selectedLocation,   \.selectedLocation)) }
        if !vm.selectedDifficulty.isEmpty { out.append((vm.selectedDifficulty, \.selectedDifficulty)) }
        return out
    }

    var body: some View {
        HStack(spacing: 8) {
            // Token area — chips when active, placeholder when empty
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 6) {
                    if activeFilters.isEmpty {
                        Text("filter interviews…")
                            .font(.byteMono(11))
                            .foregroundColor(.byteText3)
                            .onTapGesture { showPanel = true }
                    } else {
                        ForEach(activeFilters, id: \.label) { filter in
                            HStack(spacing: 4) {
                                Text(filter.label.uppercased())
                                    .font(.byteMono(10, weight: .semibold))
                                    .foregroundColor(.bytePurple)
                                Button {
                                    withAnimation(.easeInOut(duration: 0.12)) {
                                        vm.clearFilter(filter.key)
                                    }
                                } label: {
                                    Image(systemName: "xmark")
                                        .font(.system(size: 8, weight: .bold))
                                        .foregroundColor(.bytePurple.opacity(0.7))
                                }
                                .buttonStyle(.plain)
                            }
                            .padding(.horizontal, 8).padding(.vertical, 4)
                            .background(IdentityColor.purple.bgActive)
                            .overlay(RoundedRectangle(cornerRadius: 6)
                                .stroke(IdentityColor.purple.solid, lineWidth: 1))
                            .clipShape(RoundedRectangle(cornerRadius: 6))
                        }
                    }
                }
                .padding(.vertical, 2)
            }

            // Filter toggle button
            Button { showPanel = true } label: {
                ZStack(alignment: .topTrailing) {
                    Image(systemName: "slider.horizontal.3")
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundColor(activeFilters.isEmpty ? .byteText2 : .bytePurple)
                        .padding(9)
                        .background(activeFilters.isEmpty
                            ? IdentityColor.purple.bgFaint
                            : IdentityColor.purple.bgActive)
                        .overlay(RoundedRectangle(cornerRadius: 8)
                            .stroke(activeFilters.isEmpty
                                ? IdentityColor.purple.borderFaint
                                : IdentityColor.purple.solid, lineWidth: 1))
                        .clipShape(RoundedRectangle(cornerRadius: 8))

                    if !activeFilters.isEmpty {
                        Text("\(activeFilters.count)")
                            .font(.system(size: 9, weight: .bold, design: .monospaced))
                            .foregroundColor(.white)
                            .frame(width: 14, height: 14)
                            .background(Color.bytePurple)
                            .clipShape(Circle())
                            .offset(x: 4, y: -4)
                    }
                }
            }
            .buttonStyle(.plain)
        }
        .sheet(isPresented: $showPanel) {
            InterviewFilterPanel(
                vm: vm,
                difficultyOptions: Self.difficultyOptions
            )
            .presentationDetents([.height(360)])
            .presentationDragIndicator(.visible)
            .presentationBackground(Color.byteCard)
        }
    }
}

// MARK: - Filter Panel Sheet
// Full-width selector rows for all 4 dimensions — no nested sheets.

private struct InterviewFilterPanel: View {
    @ObservedObject var vm: InterviewsViewModel
    let difficultyOptions: [SearchableDropdown.DropdownOption]
    @Environment(\.dismiss) private var dismiss

    private var hasAnyFilter: Bool {
        !vm.selectedCompany.isEmpty || !vm.selectedRole.isEmpty
            || !vm.selectedLocation.isEmpty || !vm.selectedDifficulty.isEmpty
    }

    var body: some View {
        VStack(spacing: 0) {
            // Header
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text("FILTER INTERVIEWS")
                        .font(.byteMono(13, weight: .bold))
                        .foregroundColor(.byteText1)
                        .tracking(0.6)
                    if hasAnyFilter {
                        Text("\(activeCount) filter\(activeCount == 1 ? "" : "s") active")
                            .font(.byteMono(10))
                            .foregroundColor(.bytePurple)
                    }
                }
                Spacer()
                if hasAnyFilter {
                    Button {
                        vm.selectedCompany = ""
                        vm.selectedRole = ""
                        vm.selectedLocation = ""
                        vm.selectedDifficulty = ""
                    } label: {
                        Text("RESET ALL")
                            .font(.byteMono(10, weight: .bold))
                            .tracking(0.5)
                            .foregroundColor(.byteText3)
                            .padding(.horizontal, 10).padding(.vertical, 5)
                            .overlay(Capsule().stroke(Color.byteBorderHigh, lineWidth: 1))
                    }
                    .buttonStyle(.plain)
                }
            }
            .padding(.horizontal, 20).padding(.top, 20).padding(.bottom, 14)

            Divider().background(Color.byteBorderHigh)

            // Filter rows
            VStack(spacing: 0) {
                FilterPanelRow(
                    icon: "building.2", label: "COMPANY", placeholder: "All companies",
                    options: vm.companies.map { .init(value: $0, label: $0) },
                    value: Binding(
                        get: { vm.selectedCompany.isEmpty ? nil : vm.selectedCompany },
                        set: { vm.selectedCompany = $0 ?? "" }
                    )
                )
                Divider().background(Color.byteBorderHigh.opacity(0.5)).padding(.leading, 52)

                FilterPanelRow(
                    icon: "person.text.rectangle", label: "ROLE", placeholder: "All roles",
                    options: vm.roles.map { .init(value: $0, label: $0) },
                    value: Binding(
                        get: { vm.selectedRole.isEmpty ? nil : vm.selectedRole },
                        set: { vm.selectedRole = $0 ?? "" }
                    )
                )
                Divider().background(Color.byteBorderHigh.opacity(0.5)).padding(.leading, 52)

                FilterPanelRow(
                    icon: "mappin", label: "LOCATION", placeholder: "All locations",
                    options: vm.locations.map { .init(value: $0, label: $0) },
                    value: Binding(
                        get: { vm.selectedLocation.isEmpty ? nil : vm.selectedLocation },
                        set: { vm.selectedLocation = $0 ?? "" }
                    )
                )
                Divider().background(Color.byteBorderHigh.opacity(0.5)).padding(.leading, 52)

                FilterPanelRow(
                    icon: "chart.bar", label: "LEVEL", placeholder: "All levels",
                    options: difficultyOptions,
                    value: Binding(
                        get: { vm.selectedDifficulty.isEmpty ? nil : vm.selectedDifficulty },
                        set: { vm.selectedDifficulty = $0 ?? "" }
                    )
                )
            }

            Spacer()
        }
    }

    private var activeCount: Int {
        [vm.selectedCompany, vm.selectedRole, vm.selectedLocation, vm.selectedDifficulty]
            .filter { !$0.isEmpty }.count
    }
}

// MARK: - Filter Panel Row

private struct FilterPanelRow: View {
    let icon: String
    let label: String
    let placeholder: String
    let options: [SearchableDropdown.DropdownOption]
    @Binding var value: String?

    @State private var isOpen = false

    var body: some View {
        Button { isOpen = true } label: {
            HStack(spacing: 14) {
                ZStack {
                    RoundedRectangle(cornerRadius: 8)
                        .fill(value != nil ? IdentityColor.purple.bgActive : IdentityColor.purple.bgFaint)
                        .frame(width: 32, height: 32)
                    Image(systemName: icon)
                        .font(.system(size: 13, weight: .medium))
                        .foregroundColor(value != nil ? .bytePurple : .byteText2)
                }

                VStack(alignment: .leading, spacing: 2) {
                    Text(label)
                        .font(.byteMono(9, weight: .bold))
                        .foregroundColor(.byteText3)
                        .tracking(0.6)
                    Text(value?.uppercased() ?? placeholder)
                        .font(.byteMono(13, weight: value != nil ? .semibold : .regular))
                        .foregroundColor(value != nil ? .byteText1 : .byteText2)
                        .lineLimit(1)
                }

                Spacer()

                if value != nil {
                    Button {
                        withAnimation(.easeInOut(duration: 0.12)) { value = nil }
                    } label: {
                        Image(systemName: "xmark.circle.fill")
                            .font(.system(size: 16))
                            .foregroundColor(.byteText3)
                    }
                    .buttonStyle(.plain)
                } else {
                    Image(systemName: "chevron.right")
                        .font(.system(size: 11, weight: .semibold))
                        .foregroundColor(.byteText3)
                }
            }
            .padding(.horizontal, 20).padding(.vertical, 14)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .sheet(isPresented: $isOpen) {
            SearchableDropdownSheet(
                value: $value,
                options: options,
                placeholder: label,
                allLabel: placeholder,
                showAllOption: true,
                identity: .purple
            )
            .presentationDetents([.medium, .large])
            .presentationDragIndicator(.visible)
        }
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
    @Published var selectedRole = "" {
        didSet { guard oldValue != selectedRole else { return }; Task { await load() } }
    }
    @Published var selectedLocation = "" {
        didSet { guard oldValue != selectedLocation else { return }; Task { await load() } }
    }
    @Published var selectedDifficulty = "" {
        didSet { guard oldValue != selectedDifficulty else { return }; Task { await load() } }
    }

    func clearFilter(_ key: ReferenceWritableKeyPath<InterviewsViewModel, String>) {
        self[keyPath: key] = ""
    }

    @Published var companies: [String] = []
    @Published var roles: [String] = []
    @Published var locations: [String] = []

    private var page = 1
    private var hasMore = true
    private var lookupsLoaded = false

    func load() async {
        isLoading = true
        defer { isLoading = false }
        page = 1
        hasMore = true
        do {
            interviews = try await APIClient.shared.getInterviews(
                company: selectedCompany.isEmpty ? nil : selectedCompany,
                role: selectedRole.isEmpty ? nil : selectedRole,
                location: selectedLocation.isEmpty ? nil : selectedLocation,
                difficulty: selectedDifficulty.isEmpty ? nil : selectedDifficulty
            )
        } catch is CancellationError {
            // Pull-to-refresh released early — keep existing interviews
        } catch {
            interviews = []
        }
        if !lookupsLoaded {
            lookupsLoaded = true
            await loadFilterOptions()
        }
    }

    func loadMore() async {
        guard hasMore, !isLoading else { return }
        page += 1
        do {
            let more = try await APIClient.shared.getInterviews(
                company: selectedCompany.isEmpty ? nil : selectedCompany,
                role: selectedRole.isEmpty ? nil : selectedRole,
                location: selectedLocation.isEmpty ? nil : selectedLocation,
                difficulty: selectedDifficulty.isEmpty ? nil : selectedDifficulty,
                page: page
            )
            if more.isEmpty { hasMore = false } else { interviews.append(contentsOf: more) }
        } catch {
            hasMore = false
        }
    }

    /// Populates the Company / Role / Location dropdowns. Mirrors web's
    /// `getInterviewCompanies/Roles/Locations` calls in `interviews-screen.tsx`.
    private func loadFilterOptions() async {
        async let c = APIClient.shared.getInterviewCompanies()
        async let r = APIClient.shared.getInterviewRoles()
        async let l = APIClient.shared.getInterviewLocations()
        if let result = try? await c { companies = result.sorted() }
        if let result = try? await r { roles = result.sorted() }
        if let result = try? await l { locations = result.sorted() }
    }
}

#Preview { InterviewsView() }
