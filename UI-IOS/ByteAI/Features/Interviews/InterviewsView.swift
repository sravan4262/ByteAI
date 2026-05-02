import SwiftUI

// MARK: - Interviews View

struct InterviewsView: View {
    @StateObject private var vm = InterviewsViewModel()
    @EnvironmentObject private var router: DeepLinkRouter
    @State private var deepLinkInterviewId: String?

    var body: some View {
        NavigationStack {
            ZStack(alignment: .top) {
                Color.byteBackground.ignoresSafeArea()

                VStack(spacing: 0) {
                    FloatingHeaderCard(
                        icon: "briefcase.fill",
                        title: "INTERVIEWS",
                        subtitle: "FIND INTERVIEWS ACROSS TOP COMPANIES · ACE YOUR NEXT ROLE",
                        identity: .purple
                    ) { EmptyView() }

                    InterviewFilterBar(vm: vm)
                        .padding(.horizontal, 16)
                        .padding(.bottom, 8)

                    if vm.isLoading && vm.interviews.isEmpty {
                        Spacer()
                        ByteSpinner()
                        Spacer()
                    } else if vm.interviews.isEmpty {
                        Spacer()
                        EmptyStateView(
                            icon: "briefcase",
                            title: "No interviews found",
                            message: "Try adjusting your filters."
                        )
                        Spacer()
                    } else {
                        ScrollView(.vertical, showsIndicators: false) {
                            ByteScrollOffsetReader(coordinateSpace: "byteScroll")
                            LazyVStack(spacing: 12) {
                                ForEach(vm.interviews) { interview in
                                    InterviewPageCard(interview: interview)
                                        .onAppear {
                                            if interview.id == vm.interviews.last?.id {
                                                Task { await vm.loadMore() }
                                            }
                                        }
                                }
                            }
                            .padding(.horizontal, 12)
                            .padding(.vertical, 8)
                            .byteScrollContentSize()
                        }
                        .coordinateSpace(name: "byteScroll")
                        .byteScrollbar()
                        .refreshable { await vm.load() }
                    }
                }
            }
            .navigationBarHidden(true)
            // Universal-link / share-link entry: jump straight to detail
            // without forcing the list to load first. The detail view fetches
            // its own data by id.
            .navigationDestination(item: $deepLinkInterviewId) { id in
                InterviewDetailView(interviewId: id)
            }
        }
        .task { await vm.load() }
        .onChange(of: router.pendingInterviewId) { _, id in
            guard let id else { return }
            deepLinkInterviewId = id
            router.clearPendingInterview()
        }
    }
}

// MARK: - Full-Screen Interview Card (TikTok-rail layout)

struct InterviewPageCard: View {
    let interview: Interview
    @State private var expandedId: String? = nil
    @State private var isBookmarked: Bool
    @State private var bookmarkGlow = false
    @State private var miniProfileTarget: MiniProfileTarget? = nil
    /// Drives the whole-card-tap navigation. Programmatic NavigationLink rather
    /// than a wrapping `NavigationLink { … }` because the card already contains
    /// nested NavigationLinks (action row's "comments" + "View") and SwiftUI
    /// won't compose those correctly inside an outer link.
    @State private var navigateToDetail = false

    init(interview: Interview) {
        self.interview = interview
        _isBookmarked = State(initialValue: interview.isBookmarked)
    }

    private var visibleQuestions: [InterviewQuestion] {
        Array(interview.questions.prefix(4))
    }

    private var questionCountLabel: String {
        let n = interview.questions.count
        return "\(n) Q\(n == 1 ? "" : "'s")"
    }

    var body: some View {
        CardWithTopGradient(identity: .purple) {
            VStack(alignment: .leading, spacing: 12) {
                // Tappable region: header + meta + title + question rows. Putting
                // the gesture on this inner VStack (NOT the outer one with
                // `actionRow`) keeps the action row's own buttons / NavigationLinks
                // routing their taps correctly. QuestionRow's expand/collapse
                // toggle is itself a Button, so it wins over an ancestor tap
                // gesture by SwiftUI's gesture composition rules.
                VStack(alignment: .leading, spacing: 12) {
                    if interview.isAnonymous {
                        AnonymousAuthorRow(timestamp: Post.relativeTime(from: interview.createdAt))
                    } else {
                        PostHeader(post: Post(
                            id: interview.id,
                            title: interview.title,
                            body: "",
                            author: interview.author,
                            tags: [],
                            likes: 0, comments: 0, shares: 0, bookmarks: 0,
                            timestamp: Post.relativeTime(from: interview.createdAt),
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
                            MetaChip(text: questionCountLabel, icon: "list.bullet.rectangle")
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
                            .font(.byteTerminalSmall)
                            .foregroundColor(.byteText2)
                            .padding(.top, 2)
                    }
                }
                .contentShape(Rectangle())
                .onTapGesture { navigateToDetail = true }

                actionRow
                    .padding(.top, 4)
            }
            .padding(18)
        }
        .navigationDestination(isPresented: $navigateToDetail) {
            InterviewDetailView(interviewId: interview.id)
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

            // Share a real URL (mirrors `/interviews/[id]` on the web) rather
            // than a free-form string — links pasted into chats now resolve
            // back to the interview detail page on desktop / mobile web.
            // Subject + message line up with the pattern in
            // `Features/Feed/PostCardView.swift` so the iOS share sheet looks
            // the same across content types.
            ShareLink(
                item: ShareURL.interview(id: interview.id),
                subject: Text(interview.title),
                message: Text("Check out this interview on ByteAI")
            ) {
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
                    Text("View")
                        .font(.byteSans(13, weight: .semibold))
                    Text("→")
                        .font(.byteMono(11, weight: .bold))
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
            Text(text).font(.byteTerminalSmall).tracking(0.5)
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

                    Image(systemName: "chevron.up.chevron.down")
                        .font(.system(size: 11))
                        .foregroundColor(.byteText3)
                }
            }
            .buttonStyle(.plain)
            .padding(.vertical, 10)

            if isExpanded {
                Text(question.answer)
                    .font(.byteBody)
                    .foregroundColor(.byteText2)
                    .lineSpacing(3)
                    .lineLimit(6)
                    .padding(.leading, 36)
                    .padding(.bottom, 10)
                    .transition(.opacity.combined(with: .move(edge: .top)))
            }

            Divider().background(Color.byteBorder)
        }
    }
}

// MARK: - Interview Filter Bar — QUERY_BUILDER strip
// Reads like a SQL `WHERE` clause the user composes live. Each axis is an
// inline `KEY = value` chip (mono); tap one to expand into a typeable inline
// search popover, with autocomplete + free-text + "browse all" fallback to
// the existing SearchableDropdownSheet. LEVEL is a closed list (no typing).
//
// Logic preserved: every binding is `vm.selectedX`, every commit triggers the
// existing `didSet → load()` cycle. Identity color: purple.

private struct InterviewFilterBar: View {
    @ObservedObject var vm: InterviewsViewModel

    @State private var expanded: QueryAxis?
    @State private var draft: String = ""
    @State private var showFullSheet: QueryAxis?
    @AppStorage("byteai.interviews.smartCompose") private var smartMode: Bool = false
    @State private var smartDraft: String = ""
    @Namespace private var chipNamespace

    private static let difficultyOptions: [SearchableDropdown.DropdownOption] = [
        .init(value: "easy",   label: "EASY"),
        .init(value: "medium", label: "MEDIUM"),
        .init(value: "hard",   label: "HARD"),
    ]

    private var hasAnyFilter: Bool {
        !vm.selectedCompany.isEmpty || !vm.selectedRole.isEmpty
            || !vm.selectedLocation.isEmpty || !vm.selectedDifficulty.isEmpty
    }

    private var activeCount: Int {
        [vm.selectedCompany, vm.selectedRole, vm.selectedLocation, vm.selectedDifficulty]
            .reduce(0) { $0 + ($1.isEmpty ? 0 : 1) }
    }

    /// Counts of values across the currently-loaded interviews — used as the
    /// dim trailing chip in popover rows. Pure derivation, no extra fetch.
    private func suggestionsFor(_ axis: QueryAxis, query: String) -> [QuerySuggestion] {
        let q = query.trimmingCharacters(in: .whitespaces).lowercased()
        let pool: [String]
        switch axis {
        case .company:    pool = vm.companies
        case .role:       pool = vm.roles
        case .location:   pool = vm.locations
        case .level:      pool = []
        }
        let scored = pool.compactMap { value -> (rank: Int, value: String)? in
            let lower = value.lowercased()
            if q.isEmpty                  { return (2, value) }
            if lower.hasPrefix(q)         { return (0, value) }
            if lower.contains(q)          { return (1, value) }
            // Cheap subsequence fuzzy match.
            if isSubsequence(q, of: lower) { return (3, value) }
            return nil
        }
        let counts = countsFor(axis)
        return scored
            .sorted { $0.rank < $1.rank || ($0.rank == $1.rank && $0.value < $1.value) }
            .prefix(8)
            .map { QuerySuggestion(value: $0.value, count: counts[$0.value.lowercased()] ?? 0) }
    }

    private func countsFor(_ axis: QueryAxis) -> [String: Int] {
        var dict: [String: Int] = [:]
        for item in vm.interviews {
            let val: String?
            switch axis {
            case .company:  val = item.company
            case .role:     val = item.role
            case .location: val = item.location
            case .level:    val = nil
            }
            guard let v = val?.lowercased(), !v.isEmpty else { continue }
            dict[v, default: 0] += 1
        }
        return dict
    }

    private func isSubsequence(_ q: String, of target: String) -> Bool {
        var qi = q.startIndex
        for c in target {
            guard qi < q.endIndex else { return true }
            if c == q[qi] { qi = q.index(after: qi) }
        }
        return qi == q.endIndex
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            headerLine
            if smartMode {
                smartComposeBar
                smartParsedPreview
            } else {
                chipStrip
            }
        }
        .sheet(item: $showFullSheet) { axis in
            SearchableDropdownSheet(
                value: bindingFor(axis: axis),
                options: optionsFor(axis: axis),
                placeholder: axis.label,
                allLabel: axis.placeholder,
                showAllOption: true,
                identity: .purple
            )
            .presentationDetents([.large])
            .presentationDragIndicator(.visible)
        }
    }

    // MARK: header line — `▌FILTERS WHERE ●● 2 active   RESET`
    private var headerLine: some View {
        HStack(spacing: 10) {
            Capsule().fill(Color.bytePurple).frame(width: 3, height: 14)
            Text("FILTERS")
                .font(.byteMono(13, weight: .bold))
                .tracking(1.0)
                .foregroundColor(.byteText1)
            Text("WHERE")
                .font(.byteMono(12, weight: .semibold))
                .tracking(0.8)
                .foregroundColor(.bytePurple)

            if hasAnyFilter {
                HStack(spacing: 4) {
                    ForEach(0..<min(activeCount, 4), id: \.self) { _ in
                        Circle().fill(Color.bytePurple).frame(width: 6, height: 6)
                    }
                    Text("\(activeCount) active")
                        .font(.byteMono(11, weight: .semibold))
                        .tracking(0.4)
                        .foregroundColor(.byteText3)
                }
                .padding(.leading, 4)
            } else {
                Text("── 4 columns")
                    .font(.byteTerminalSmall)
                    .tracking(0.3)
                    .foregroundColor(.byteText3)
            }

            Spacer()

            // Smart-compose toggle — power-user mode that parses one mono line.
            Button {
                Haptics.light()
                withAnimation(.spring(response: 0.3, dampingFraction: 0.8)) {
                    smartMode.toggle()
                    expanded = nil
                    if smartMode { smartDraft = currentSmartFromState() }
                }
            } label: {
                HStack(spacing: 4) {
                    Image(systemName: smartMode ? "wand.and.stars.inverse" : "wand.and.stars")
                        .font(.system(size: 11, weight: .semibold))
                    Text("smart")
                        .font(.byteMono(11, weight: .bold))
                        .tracking(0.5)
                }
                .foregroundColor(smartMode ? .white : .bytePurple)
                .padding(.horizontal, 10).padding(.vertical, 5)
                .background(smartMode ? Color.bytePurple : IdentityColor.purple.bgFaint)
                .overlay(
                    RoundedRectangle(cornerRadius: 7)
                        .stroke(IdentityColor.purple.solid.opacity(smartMode ? 0 : 0.5), lineWidth: 1)
                )
                .clipShape(RoundedRectangle(cornerRadius: 7))
            }
            .buttonStyle(.plain)
            .accessibilityLabel("Toggle smart compose mode")

            if hasAnyFilter {
                Button {
                    withAnimation(.easeInOut(duration: 0.15)) {
                        vm.selectedCompany = ""
                        vm.selectedRole = ""
                        vm.selectedLocation = ""
                        vm.selectedDifficulty = ""
                        expanded = nil
                        draft = ""
                        smartDraft = ""
                    }
                    Haptics.light()
                } label: {
                    Text("RESET")
                        .font(.byteMono(12, weight: .bold))
                        .tracking(0.6)
                        .foregroundColor(.bytePurple)
                        .padding(.horizontal, 12).padding(.vertical, 6)
                        .background(IdentityColor.purple.bgActive)
                        .overlay(
                            RoundedRectangle(cornerRadius: 7)
                                .stroke(IdentityColor.purple.solid.opacity(0.6), lineWidth: 1)
                        )
                        .clipShape(RoundedRectangle(cornerRadius: 7))
                }
                .buttonStyle(.plain)
            }
        }
    }

    // MARK: smart-compose bar — single mono input parsed to all 4 axes
    private var smartComposeBar: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack(spacing: 8) {
                Text(">")
                    .font(.byteMono(15, weight: .bold))
                    .foregroundColor(.bytePurple)
                TextField("@stripe role:swe loc:sf #hard", text: $smartDraft)
                    .font(.byteMono(14, weight: .medium))
                    .foregroundColor(.byteText1)
                    .tint(.bytePurple)
                    .autocorrectionDisabled()
                    .textInputAutocapitalization(.never)
                    .submitLabel(.done)
                    .onSubmit { commitSmart() }
                if !smartDraft.isEmpty {
                    Button { smartDraft = "" } label: {
                        Image(systemName: "xmark.circle.fill")
                            .font(.system(size: 16))
                            .foregroundColor(.byteText3)
                    }
                    .buttonStyle(.plain)
                }
                Button { commitSmart(); Haptics.medium() } label: {
                    Image(systemName: "return")
                        .font(.system(size: 15, weight: .bold))
                        .foregroundColor(smartDraft.isEmpty ? .byteText3 : .bytePurple)
                }
                .buttonStyle(.plain)
                .disabled(smartDraft.isEmpty)
            }
            .padding(.horizontal, 12).padding(.vertical, 10)
            .background(IdentityColor.purple.bgFaint)
            .overlay(
                RoundedRectangle(cornerRadius: 8)
                    .stroke(IdentityColor.purple.borderFaint, lineWidth: 1)
            )
            .clipShape(RoundedRectangle(cornerRadius: 8))

            // Inline syntax legend — only when input is empty so it doesn't crowd
            // active typing.
            if smartDraft.isEmpty {
                VStack(alignment: .leading, spacing: 3) {
                    syntaxRow(token: "@name",          meaning: "company")
                    syntaxRow(token: "role:value",     meaning: "role")
                    syntaxRow(token: "loc:value",      meaning: "location")
                    syntaxRow(token: "#easy/#medium/#hard", meaning: "level")
                }
                .padding(.leading, 4)
            }
        }
    }

    private func syntaxRow(token: String, meaning: String) -> some View {
        HStack(spacing: 6) {
            Text(token)
                .font(.byteMono(11, weight: .semibold))
                .foregroundColor(.bytePurple.opacity(0.9))
            Text("→")
                .font(.byteMono(10))
                .foregroundColor(.byteText3)
            Text(meaning)
                .font(.byteTerminalSmall)
                .foregroundColor(.byteText3)
        }
    }

    // MARK: smart-compose live preview chips (parsed from smartDraft)
    @ViewBuilder
    private var smartParsedPreview: some View {
        let parsed = SmartCompose.parse(smartDraft)
        if parsed.hasAny {
            HStack(spacing: 6) {
                Text("◆")
                    .font(.byteTerminalSmall)
                    .foregroundColor(.bytePurple)
                if let v = parsed.company { previewChip(key: "company", value: v) }
                if let v = parsed.role    { previewChip(key: "role",    value: v) }
                if let v = parsed.location { previewChip(key: "loc",    value: v) }
                if let v = parsed.level   { previewChip(key: "level",   value: v) }
                Spacer()
            }
            .padding(.top, 2)
        }
    }

    private func previewChip(key: String, value: String) -> some View {
        HStack(spacing: 4) {
            Text("\(key)=")
                .font(.byteMono(11, weight: .semibold))
                .foregroundColor(.bytePurple.opacity(0.85))
            Text("\"\(value)\"")
                .font(.byteMono(11, weight: .semibold))
                .foregroundColor(.byteText1)
        }
        .padding(.horizontal, 8).padding(.vertical, 3)
        .background(IdentityColor.purple.bgActive)
        .overlay(
            RoundedRectangle(cornerRadius: 6)
                .stroke(IdentityColor.purple.solid, lineWidth: 0.7)
        )
        .clipShape(RoundedRectangle(cornerRadius: 6))
    }

    private func commitSmart() {
        let parsed = SmartCompose.parse(smartDraft)
        withAnimation(.easeInOut(duration: 0.2)) {
            vm.selectedCompany    = parsed.company  ?? ""
            vm.selectedRole       = parsed.role     ?? ""
            vm.selectedLocation   = parsed.location ?? ""
            vm.selectedDifficulty = parsed.level    ?? ""
        }
    }

    /// Roundtrip current selected state back into a smart-compose string when
    /// the user toggles smart mode ON — preserves what's already filtered.
    private func currentSmartFromState() -> String {
        var parts: [String] = []
        if !vm.selectedCompany.isEmpty    { parts.append("@\(vm.selectedCompany)") }
        if !vm.selectedRole.isEmpty       { parts.append("role:\(vm.selectedRole)") }
        if !vm.selectedLocation.isEmpty   { parts.append("loc:\(vm.selectedLocation)") }
        if !vm.selectedDifficulty.isEmpty { parts.append("#\(vm.selectedDifficulty)") }
        return parts.joined(separator: " ")
    }

    // MARK: chip strip — 4 segments + popover anchored under the active one
    private var chipStrip: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 6) {
                ForEach(QueryAxis.allCases, id: \.self) { axis in
                    QueryChip(
                        axis: axis,
                        currentValue: currentValue(for: axis),
                        isExpanded: expanded == axis,
                        isCompacted: expanded != nil && expanded != axis,
                        draft: $draft,
                        suggestions: expanded == axis ? suggestionsFor(axis, query: draft) : [],
                        namespace: chipNamespace,
                        onTap: { tap(axis: axis) },
                        onClear: { clear(axis: axis) },
                        onCommit: { value in commit(axis: axis, value: value) },
                        onLongPress: { showFullSheet = axis },
                        onBrowseAll: { showFullSheet = axis }
                    )
                }
            }
            .padding(.vertical, 4)
        }
    }

    // MARK: bindings + helpers

    private func tap(axis: QueryAxis) {
        Haptics.light()
        withAnimation(.spring(response: 0.32, dampingFraction: 0.8)) {
            if expanded == axis {
                expanded = nil
                draft = ""
            } else {
                expanded = axis
                draft = ""
            }
        }
    }

    private func clear(axis: QueryAxis) {
        Haptics.light()
        withAnimation(.easeInOut(duration: 0.12)) {
            switch axis {
            case .company:  vm.selectedCompany    = ""
            case .role:     vm.selectedRole       = ""
            case .location: vm.selectedLocation   = ""
            case .level:    vm.selectedDifficulty = ""
            }
        }
    }

    private func commit(axis: QueryAxis, value: String) {
        let trimmed = value.trimmingCharacters(in: .whitespaces)
        Haptics.medium()
        withAnimation(.spring(response: 0.32, dampingFraction: 0.8)) {
            switch axis {
            case .company:  vm.selectedCompany    = trimmed
            case .role:     vm.selectedRole       = trimmed
            case .location: vm.selectedLocation   = trimmed
            case .level:    vm.selectedDifficulty = trimmed
            }
            expanded = nil
            draft = ""
        }
    }

    private func currentValue(for axis: QueryAxis) -> String {
        switch axis {
        case .company:  return vm.selectedCompany
        case .role:     return vm.selectedRole
        case .location: return vm.selectedLocation
        case .level:    return vm.selectedDifficulty
        }
    }

    private func bindingFor(axis: QueryAxis) -> Binding<String?> {
        switch axis {
        case .company:
            return Binding(
                get: { vm.selectedCompany.isEmpty ? nil : vm.selectedCompany },
                set: { vm.selectedCompany = $0 ?? "" }
            )
        case .role:
            return Binding(
                get: { vm.selectedRole.isEmpty ? nil : vm.selectedRole },
                set: { vm.selectedRole = $0 ?? "" }
            )
        case .location:
            return Binding(
                get: { vm.selectedLocation.isEmpty ? nil : vm.selectedLocation },
                set: { vm.selectedLocation = $0 ?? "" }
            )
        case .level:
            return Binding(
                get: { vm.selectedDifficulty.isEmpty ? nil : vm.selectedDifficulty },
                set: { vm.selectedDifficulty = $0 ?? "" }
            )
        }
    }

    private func optionsFor(axis: QueryAxis) -> [SearchableDropdown.DropdownOption] {
        switch axis {
        case .company:  return vm.companies.map { .init(value: $0, label: $0) }
        case .role:     return vm.roles.map     { .init(value: $0, label: $0) }
        case .location: return vm.locations.map { .init(value: $0, label: $0) }
        case .level:    return Self.difficultyOptions
        }
    }
}

// MARK: - QueryAxis enum

enum QueryAxis: String, CaseIterable, Identifiable, Hashable {
    case company, role, location, level

    var id: String { rawValue }

    var label: String {
        switch self {
        case .company:  return "company"
        case .role:     return "role"
        case .location: return "location"
        case .level:    return "level"
        }
    }

    var icon: String {
        switch self {
        case .company:  return "building.2"
        case .role:     return "person.text.rectangle"
        case .location: return "mappin"
        case .level:    return "chart.bar"
        }
    }

    var placeholder: String {
        switch self {
        case .company:  return "ALL COMPANIES"
        case .role:     return "ALL ROLES"
        case .location: return "ALL LOCATIONS"
        case .level:    return "ALL LEVELS"
        }
    }

    var inputPrompt: String {
        switch self {
        case .company:  return "type a company…"
        case .role:     return "type a role…"
        case .location: return "type a location…"
        case .level:    return "select a level"
        }
    }
}

private struct QuerySuggestion: Identifiable, Hashable {
    let value: String
    let count: Int
    var id: String { value }
}

// MARK: - QueryChip

private struct QueryChip: View {
    let axis: QueryAxis
    let currentValue: String
    let isExpanded: Bool
    let isCompacted: Bool
    @Binding var draft: String
    let suggestions: [QuerySuggestion]
    let namespace: Namespace.ID
    let onTap: () -> Void
    let onClear: () -> Void
    let onCommit: (String) -> Void
    let onLongPress: () -> Void
    let onBrowseAll: () -> Void

    @FocusState private var inputFocused: Bool

    private var isActive: Bool { !currentValue.isEmpty }

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            chipBody

            if isExpanded && axis != .level {
                QueryChipPopover(
                    axis: axis,
                    draft: draft,
                    suggestions: suggestions,
                    onSelect: { onCommit($0) },
                    onUseDraft: { onCommit(draft) },
                    onBrowseAll: onBrowseAll
                )
                .transition(.opacity.combined(with: .move(edge: .top)))
            }

            if isExpanded && axis == .level {
                QueryChipLevelPicker(
                    selected: currentValue,
                    onSelect: { onCommit($0) }
                )
                .transition(.opacity.combined(with: .move(edge: .top)))
            }
        }
    }

    @ViewBuilder
    private var chipBody: some View {
        Button(action: onTap) {
            chipContent
                .padding(.horizontal, 12).padding(.vertical, 9)
                .background(isActive || isExpanded ? IdentityColor.purple.bgActive : IdentityColor.purple.bgFaint)
                .overlay(
                    RoundedRectangle(cornerRadius: 9)
                        .stroke(isActive || isExpanded ? IdentityColor.purple.solid : IdentityColor.purple.borderFaint,
                                lineWidth: isActive || isExpanded ? 1.2 : 1)
                )
                .clipShape(RoundedRectangle(cornerRadius: 9))
                .shadow(color: isExpanded ? Color.bytePurple.opacity(0.20) : .clear, radius: 8)
        }
        .buttonStyle(.plain)
        .scaleEffect(isCompacted ? 0.92 : 1.0)
        .opacity(isCompacted ? 0.55 : 1.0)
        .onLongPressGesture {
            Haptics.medium()
            onLongPress()
        }
        .accessibilityLabel("\(axis.label) filter, \(isActive ? currentValue : "any")")
    }

    @ViewBuilder
    private var chipContent: some View {
        if isExpanded && axis != .level {
            HStack(spacing: 7) {
                Image(systemName: axis.icon)
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundColor(.bytePurple)
                Text("\(axis.label) =")
                    .font(.byteMono(13, weight: .semibold))
                    .tracking(0.4)
                    .foregroundColor(.byteText2)
                TextField(axis.inputPrompt, text: $draft)
                    .font(.byteMono(14, weight: .semibold))
                    .foregroundColor(.byteText1)
                    .tint(.bytePurple)
                    .autocorrectionDisabled()
                    .textInputAutocapitalization(.never)
                    .focused($inputFocused)
                    .submitLabel(.done)
                    .onSubmit {
                        let trimmed = draft.trimmingCharacters(in: .whitespaces)
                        if !trimmed.isEmpty { onCommit(trimmed) }
                    }
                    .frame(minWidth: 80, maxWidth: 200)
                    .onAppear { DispatchQueue.main.asyncAfter(deadline: .now() + 0.15) { inputFocused = true } }
            }
        } else if isCompacted {
            // Other chips, dimmed to icon+key only.
            HStack(spacing: 6) {
                Image(systemName: axis.icon)
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundColor(isActive ? .bytePurple : .byteText3)
                Text(axis.label.uppercased())
                    .font(.byteMono(11, weight: .bold))
                    .tracking(0.5)
                    .foregroundColor(isActive ? .bytePurple : .byteText3)
            }
        } else {
            // Inactive or active rest state.
            HStack(spacing: 7) {
                Image(systemName: axis.icon)
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundColor(isActive ? .bytePurple : .byteText2)
                Text("\(axis.label) =")
                    .font(.byteMono(12, weight: .semibold))
                    .tracking(0.4)
                    .foregroundColor(isActive ? .bytePurple.opacity(0.85) : .byteText3)
                if isActive {
                    Text("\"\(currentValue)\"")
                        .font(.byteMono(13, weight: .semibold))
                        .tracking(0.3)
                        .foregroundColor(.bytePurple)
                        .lineLimit(1)
                    Button(action: onClear) {
                        Image(systemName: "xmark")
                            .font(.system(size: 10, weight: .bold))
                            .foregroundColor(.bytePurple.opacity(0.7))
                            .padding(2)
                    }
                    .buttonStyle(.plain)
                } else {
                    Text("*")
                        .font(.byteMono(13, weight: .bold))
                        .foregroundColor(.byteText3)
                    Image(systemName: "chevron.down")
                        .font(.system(size: 11, weight: .semibold))
                        .foregroundColor(.byteText3)
                }
            }
        }
    }
}

// MARK: - QueryChipPopover (typeable autocomplete card)

private struct QueryChipPopover: View {
    let axis: QueryAxis
    let draft: String
    let suggestions: [QuerySuggestion]
    let onSelect: (String) -> Void
    let onUseDraft: () -> Void
    let onBrowseAll: () -> Void

    var body: some View {
        VStack(spacing: 0) {
            Rectangle().fill(Color.byteBorderHigh).frame(height: 1)

            HStack(spacing: 6) {
                Text("◆ matches")
                    .font(.byteMono(9))
                    .foregroundColor(.byteText3)
                Text("\(suggestions.count)")
                    .font(.byteMono(9, weight: .bold))
                    .foregroundColor(.bytePurple)
                Spacer()
            }
            .padding(.horizontal, 10).padding(.vertical, 4)
            .background(IdentityColor.purple.bgFaint)

            VStack(spacing: 0) {
                ForEach(suggestions) { sug in
                    Button { onSelect(sug.value) } label: {
                        HStack(spacing: 8) {
                            Text(">")
                                .font(.byteMono(10))
                                .foregroundColor(.bytePurple.opacity(0.6))
                            HighlightedMonoText(text: sug.value, highlight: draft, color: .bytePurple)
                                .font(.byteMono(11))
                                .lineLimit(1)
                            Spacer()
                            if sug.count > 0 {
                                Text("· \(sug.count)")
                                    .font(.byteMono(9))
                                    .foregroundColor(.byteText3)
                            }
                        }
                        .padding(.horizontal, 10).padding(.vertical, 6)
                        .frame(maxWidth: .infinity, alignment: .leading)
                    }
                    .buttonStyle(.plain)
                    Divider().background(Color.byteBorderHigh.opacity(0.4))
                }

                // Free-text fallback row.
                if !draft.trimmingCharacters(in: .whitespaces).isEmpty {
                    Button(action: onUseDraft) {
                        HStack(spacing: 8) {
                            Image(systemName: "return")
                                .font(.system(size: 10, weight: .semibold))
                                .foregroundColor(.byteGreen)
                            Text("use \"\(draft)\" as custom value")
                                .font(.byteMono(10))
                                .foregroundColor(.byteText2)
                            Spacer()
                        }
                        .padding(.horizontal, 10).padding(.vertical, 6)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .background(Color.byteGreen.opacity(0.04))
                    }
                    .buttonStyle(.plain)
                    Divider().background(Color.byteBorderHigh.opacity(0.4))
                }

                // Browse-all fallback row.
                Button(action: onBrowseAll) {
                    HStack(spacing: 8) {
                        Image(systemName: "list.bullet")
                            .font(.system(size: 10, weight: .semibold))
                            .foregroundColor(.byteText2)
                        Text("browse all \(axis.label.uppercased()) options")
                            .font(.byteMono(10))
                            .foregroundColor(.byteText2)
                        Spacer()
                        Image(systemName: "arrow.up.right")
                            .font(.system(size: 9))
                            .foregroundColor(.byteText3)
                    }
                    .padding(.horizontal, 10).padding(.vertical, 6)
                    .frame(maxWidth: .infinity, alignment: .leading)
                }
                .buttonStyle(.plain)
            }
        }
        .background(Color.byteCard)
        .overlay(
            RoundedRectangle(cornerRadius: 10)
                .stroke(IdentityColor.purple.borderFaint, lineWidth: 1)
        )
        .clipShape(RoundedRectangle(cornerRadius: 10))
        .shadow(color: Color.bytePurple.opacity(0.18), radius: 18, y: 6)
        .padding(.top, 6)
        .frame(minWidth: 240, maxWidth: 280)
    }
}

// MARK: - QueryChipLevelPicker (closed list — 3-segment)

private struct QueryChipLevelPicker: View {
    let selected: String
    let onSelect: (String) -> Void

    private let levels: [(key: String, label: String)] = [
        ("easy", "EASY"),
        ("medium", "MEDIUM"),
        ("hard", "HARD"),
    ]

    var body: some View {
        HStack(spacing: 4) {
            ForEach(levels, id: \.key) { level in
                Button { onSelect(level.key) } label: {
                    Text(level.label)
                        .font(.byteMono(10, weight: .bold))
                        .tracking(0.6)
                        .foregroundColor(selected == level.key ? .bytePurple : .byteText2)
                        .padding(.horizontal, 12).padding(.vertical, 6)
                        .background(selected == level.key ? IdentityColor.purple.bgActive : IdentityColor.purple.bgFaint)
                        .overlay(
                            RoundedRectangle(cornerRadius: 6)
                                .stroke(selected == level.key ? IdentityColor.purple.solid : IdentityColor.purple.borderFaint, lineWidth: 1)
                        )
                        .clipShape(RoundedRectangle(cornerRadius: 6))
                }
                .buttonStyle(.plain)
            }
        }
        .padding(.top, 6)
    }
}

// MARK: - HighlightedMonoText (matched-substring purple)

private struct HighlightedMonoText: View {
    let text: String
    let highlight: String
    let color: Color

    var body: some View {
        Text(attributed)
    }

    private var attributed: AttributedString {
        var s = AttributedString(text)
        s.foregroundColor = .byteText1
        let q = highlight.trimmingCharacters(in: .whitespaces).lowercased()
        guard !q.isEmpty,
              let range = text.lowercased().range(of: q) else { return s }
        let nsRange = NSRange(range, in: text)
        if let attrRange = Range(nsRange, in: s) {
            s[attrRange].foregroundColor = color
            s[attrRange].font = .byteMono(11, weight: .bold)
        }
        return s
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
        let hadData = !interviews.isEmpty
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
            // Task cancelled (e.g. view dismissed mid-load) — keep existing interviews
        } catch let urlError as URLError where urlError.code == .cancelled {
            // URLSession cancellation from refreshable gesture — keep existing interviews
        } catch {
            if hadData {
                // Refresh failure: preserve the list the user was already looking at
                ToastCenter.shared.show("Couldn't refresh — pull down to retry", kind: .error)
            } else {
                interviews = []
            }
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

// MARK: - SmartCompose parser
// Tokenises a one-line query like `@stripe role:swe loc:sf #hard` into
// the four interview filter axes. Bare words fall through as company.

enum SmartCompose {
    struct Parsed {
        var company: String?
        var role: String?
        var location: String?
        var level: String?

        var hasAny: Bool {
            company != nil || role != nil || location != nil || level != nil
        }
    }

    private static let levels: Set<String> = ["easy", "medium", "hard"]

    static func parse(_ raw: String) -> Parsed {
        var out = Parsed()
        var bareCompanyTokens: [String] = []

        let tokens = raw
            .split(whereSeparator: { $0.isWhitespace })
            .map(String.init)

        for tok in tokens {
            if tok.isEmpty { continue }

            if tok.hasPrefix("@") {
                let value = String(tok.dropFirst())
                if !value.isEmpty { out.company = value }
                continue
            }
            if tok.hasPrefix("#") {
                let value = String(tok.dropFirst()).lowercased()
                if levels.contains(value) { out.level = value }
                continue
            }
            if let colonRange = tok.range(of: ":") {
                let key = tok[tok.startIndex..<colonRange.lowerBound].lowercased()
                let value = String(tok[colonRange.upperBound...])
                guard !value.isEmpty else { continue }
                switch key {
                case "role":               out.role = value
                case "loc", "location":    out.location = value
                case "level", "difficulty":
                    let lower = value.lowercased()
                    if levels.contains(lower) { out.level = lower }
                case "company", "co":      out.company = value
                default: break
                }
                continue
            }
            // Bare word — accumulate as company tokens.
            bareCompanyTokens.append(tok)
        }

        if out.company == nil, !bareCompanyTokens.isEmpty {
            out.company = bareCompanyTokens.joined(separator: " ")
        }
        return out
    }
}
