import SwiftUI

// MARK: - Feed View
// Mirrors UI/components/features/feed/feed-screen.tsx for behavior:
//   - FOR_YOU / TRENDING tab pills
//   - tech-stack filter on FOR_YOU only
//   - "🔥 MOST VIEWED IN LAST 24 HOURS" indicator on TRENDING
//   - infinite-scroll sentinel + "— END —" terminator
// iOS retains TikTok-style vertical paging for native UX, with web's design language
// applied to the floating header, filter chrome, and per-page action rail / CTA.

struct FeedView: View {
    var scrollToTopTrigger: Int = 0
    @StateObject private var vm = FeedViewModel()
    @EnvironmentObject private var router: DeepLinkRouter
    @Environment(\.scenePhase) private var scenePhase
    @State private var selectedPost: Post?
    @State private var showProfile = false
    @State private var showNotifications = false

    var body: some View {
        NavigationStack {
            ZStack {
                Color.byteBackground.ignoresSafeArea()
                content
            }
            .safeAreaInset(edge: .top, spacing: 0) {
                // Floating header + filter chrome — moved into a safe-area inset so the
                // ScrollView's refresh indicator appears below it (was hidden when chrome
                // was rendered as a ZStack overlay on top of the ScrollView).
                VStack(spacing: 8) {
                    FloatingHeaderCard(
                        icon: "bolt.fill",
                        title: "BITS",
                        subtitle: "SHORT · INSIGHTS · LEARN.",
                        identity: .blue,
                        useLogoMark: true
                    ) {
                        HStack(spacing: 10) {
                            NotificationBellButton(unreadCount: vm.unreadNotifications) {
                                showNotifications = true
                            }
                            AvatarRingButton(
                                imageURL: vm.meAvatarUrl,
                                initials: vm.meInitials,
                                variant: .cyan,
                                ownerUserId: vm.meUserId
                            ) {
                                showProfile = true
                            }
                        }
                    }

                    FeedFilterRow(
                        selectedTab: $vm.selectedTab,
                        selectedStacks: $vm.selectedStacks,
                        stackOptions: vm.stackOptions
                    )
                    .padding(.horizontal, 16)
                }
                .padding(.bottom, 6)
                .background(Color.byteBackground)
            }
            .navigationBarHidden(true)
            .navigationDestination(item: $selectedPost) { post in
                PostDetailView(post: post) { updated in
                    if let i = vm.posts.firstIndex(where: { $0.id == updated.id }) {
                        vm.posts[i] = updated
                    }
                }
            }
            .navigationDestination(isPresented: $showProfile) { ProfileView(username: vm.meUsername) }
            .sheet(isPresented: $showNotifications) {
                NotificationsView()
                    .presentationDetents([.large])
                    .presentationDragIndicator(.visible)
            }
        }
        .task {
            await vm.load()
            await vm.refreshUnreadCount()
        }
        // Foreground transition → reconcile bell badge against the server.
        // Catches any APNs pushes the OS dropped while the app was suspended.
        .onChange(of: scenePhase) { _, newPhase in
            if newPhase == .active {
                Task { await vm.refreshUnreadCount() }
            }
        }
        .onChange(of: router.pendingPostId) { _, id in
            guard let id else { return }
            Task {
                if let post = try? await APIClient.shared.getPost(id: id) {
                    selectedPost = post
                }
                router.clearPendingPost()
            }
        }
    }

    @ViewBuilder
    private var content: some View {
        if vm.isLoading && vm.posts.isEmpty {
            VStack {
                Spacer()
                MonoStatusLine(text: "LOADING BYTES…", pulsing: true)
                Spacer()
            }
            .frame(maxWidth: .infinity)
        } else if vm.posts.isEmpty {
            VStack(spacing: 0) {
                Color.clear.frame(height: 24)
                EmptyStateView(
                    icon: "bolt.slash",
                    title: "No bytes found",
                    message: vm.selectedTab == .forYou
                        ? "Try a different tech stack or switch to TRENDING."
                        : "Nothing trending right now."
                )
                .padding(.horizontal, 16)
                Spacer()
            }
        } else {
            GeometryReader { geo in
                ScrollViewReader { proxy in
                    ScrollView(.vertical, showsIndicators: false) {
                        Color.clear.frame(height: 0).id("feed-top")

                        LazyVStack(spacing: 0) {
                            ForEach($vm.posts) { $post in
                                BytePageCard(post: $post, activeTab: vm.selectedTab, onViewFull: { selectedPost = post })
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
                                        if post.id == vm.posts.last?.id { Task { await vm.loadMore() } }
                                    }
                            }

                            if !vm.hasMore && vm.posts.count >= 5 {
                                MonoStatusLine(text: "— END —")
                                    .frame(height: 80)
                                    .frame(maxWidth: .infinity)
                            }
                        }
                        .scrollTargetLayout()
                    }
                    .scrollTargetBehavior(.paging)
                    .scrollIndicators(.hidden)
                    .refreshable { await vm.refresh() }
                    .onChange(of: scrollToTopTrigger) { _, _ in
                        withAnimation(.spring(response: 0.4, dampingFraction: 0.85)) {
                            proxy.scrollTo("feed-top", anchor: .top)
                        }
                    }
                }
            }
        }
    }
}

// MARK: - Filter row (tabs + tech-stack dropdown + trending indicator)

private struct FeedFilterRow: View {
    @Binding var selectedTab: FeedFilter
    @Binding var selectedStacks: [String]
    let stackOptions: [TechOption]

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(spacing: 8) {
                ForEach(FeedFilter.visibleTabs, id: \.self) { tab in
                    Button {
                        withAnimation(.easeInOut(duration: 0.15)) { selectedTab = tab }
                    } label: {
                        Text(tab.label)
                            .font(.byteMono(11, weight: selectedTab == tab ? .bold : .regular))
                            .tracking(0.7)
                            .foregroundColor(selectedTab == tab ? .byteAccent : .byteText1)
                            .padding(.horizontal, 14)
                            .padding(.vertical, 6)
                            .background(selectedTab == tab ? IdentityColor.blue.bgActive : IdentityColor.blue.bgFaint)
                            .overlay(
                                RoundedRectangle(cornerRadius: 8)
                                    .stroke(selectedTab == tab ? .byteAccent : IdentityColor.blue.borderFaint, lineWidth: 1)
                            )
                            .clipShape(RoundedRectangle(cornerRadius: 8))
                            .shadow(color: selectedTab == tab ? IdentityColor.blue.tint(0.20) : .clear, radius: 6)
                    }
                    .buttonStyle(.plain)
                    .frame(minHeight: 36)
                }
                Spacer(minLength: 0)
            }

            if selectedTab == .forYou {
                StackPicker(values: $selectedStacks, options: stackOptions)
            } else if selectedTab == .trending {
                HStack(spacing: 6) {
                    Text("🔥")
                    Text("MOST VIEWED IN LAST 24 HOURS")
                        .font(.byteMono(11))
                        .foregroundColor(.byteText1)
                        .tracking(0.6)
                }
            }
        }
        .padding(.horizontal, 4)
        .padding(.bottom, 6)
        .background(
            LinearGradient(
                colors: [Color.byteBackground.opacity(0.92), Color.byteBackground.opacity(0.65), .clear],
                startPoint: .top, endPoint: .bottom
            )
        )
    }
}

// MARK: - Inline Stack Picker
// Chip-input: selected stacks as dismissible pills + typeable filter field.
// Suggestions appear as a horizontal scroll row — no sheet.

struct StackPicker: View {
    /// Holds canonical tech-stack `value` strings (e.g. `aspnet-core`). The UI
    /// renders chips with the matching `label` looked up from `options`.
    @Binding var values: [String]
    let options: [TechOption]
    @State private var query = ""
    @FocusState private var focused: Bool

    private var suggestions: [TechOption] {
        let q = query.trimmingCharacters(in: .whitespaces).lowercased()
        guard !q.isEmpty else { return [] }
        return options.filter {
            !values.contains($0.value) &&
            ($0.label.lowercased().contains(q) || $0.value.lowercased().contains(q))
        }
    }

    private func label(for value: String) -> String {
        options.first(where: { $0.value == value })?.label ?? value
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            chipRow
            if !suggestions.isEmpty && focused {
                suggestionsRow
                    .transition(.opacity.combined(with: .move(edge: .top)))
            }
        }
        .animation(.easeInOut(duration: 0.15), value: suggestions.isEmpty || !focused)
    }

    // Selected chips + inline text field
    private var chipRow: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 6) {
                ForEach(values, id: \.self) { stackValue in
                    HStack(spacing: 4) {
                        Text(label(for: stackValue))
                            .font(.byteMono(11, weight: .semibold))
                            .foregroundColor(.byteAccent)
                        Button {
                            withAnimation(.easeInOut(duration: 0.12)) {
                                values.removeAll { $0 == stackValue }
                            }
                        } label: {
                            Image(systemName: "xmark")
                                .font(.system(size: 8, weight: .bold))
                                .foregroundColor(.byteAccent.opacity(0.7))
                        }
                        .buttonStyle(.plain)
                    }
                    .padding(.horizontal, 8).padding(.vertical, 4)
                    .background(IdentityColor.blue.bgActive)
                    .overlay(RoundedRectangle(cornerRadius: 6)
                        .stroke(IdentityColor.blue.solid, lineWidth: 1))
                    .clipShape(RoundedRectangle(cornerRadius: 6))
                }

                HStack(spacing: 5) {
                    Image(systemName: "magnifyingglass")
                        .font(.system(size: 10))
                        .foregroundColor(focused ? .byteAccent : .byteText3)
                    TextField(values.isEmpty ? "filter by stack…" : "add more…", text: $query)
                        .font(.byteMono(11))
                        .foregroundColor(.byteText1)
                        .tint(.byteAccent)
                        .autocorrectionDisabled()
                        .textInputAutocapitalization(.never)
                        .focused($focused)
                        .frame(minWidth: 90)
                        .submitLabel(.done)
                        .onSubmit {
                            if let first = suggestions.first { add(first) }
                        }
                    if !query.isEmpty {
                        Button { query = "" } label: {
                            Image(systemName: "xmark.circle.fill")
                                .font(.system(size: 12))
                                .foregroundColor(.byteText3)
                        }
                        .buttonStyle(.plain)
                    }
                }
                .padding(.horizontal, 9).padding(.vertical, 5)
                .background(focused ? IdentityColor.blue.bgFaint : IdentityColor.blue.bgFaint.opacity(0.6))
                .overlay(RoundedRectangle(cornerRadius: 7)
                    .stroke(focused ? IdentityColor.blue.solid.opacity(0.5) : IdentityColor.blue.borderFaint, lineWidth: 1))
                .clipShape(RoundedRectangle(cornerRadius: 7))

                if !values.isEmpty {
                    Button {
                        withAnimation(.easeInOut(duration: 0.12)) { values.removeAll() }
                        query = ""
                    } label: {
                        Text("CLEAR")
                            .font(.byteMono(9, weight: .bold))
                            .tracking(0.4)
                            .foregroundColor(.byteText3)
                            .padding(.horizontal, 7).padding(.vertical, 5)
                            .background(Color.byteCard)
                            .overlay(RoundedRectangle(cornerRadius: 6)
                                .stroke(Color.byteBorderHigh, lineWidth: 1))
                            .clipShape(RoundedRectangle(cornerRadius: 6))
                    }
                    .buttonStyle(.plain)
                }
            }
            .padding(.vertical, 2)
        }
    }

    // Suggestions strip — shown below while typing
    private var suggestionsRow: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 6) {
                ForEach(suggestions.prefix(10), id: \.value) { s in
                    Button { add(s) } label: {
                        HStack(spacing: 4) {
                            Image(systemName: "plus")
                                .font(.system(size: 8, weight: .bold))
                            Text(s.label)
                                .font(.byteMono(11))
                        }
                        .foregroundColor(.byteText1)
                        .padding(.horizontal, 9).padding(.vertical, 5)
                        .background(IdentityColor.blue.bgFaint)
                        .overlay(RoundedRectangle(cornerRadius: 7)
                            .stroke(IdentityColor.blue.borderFaint, lineWidth: 1))
                        .clipShape(RoundedRectangle(cornerRadius: 7))
                    }
                    .buttonStyle(.plain)
                }
            }
            .padding(.vertical, 2)
        }
    }

    private func add(_ option: TechOption) {
        guard !values.contains(option.value) else { return }
        withAnimation(.easeInOut(duration: 0.12)) { values.append(option.value) }
        query = ""
    }
}

// MARK: - Full-Screen Byte Card (TikTok-rail layout)

struct BytePageCard: View {
    @Binding var post: Post
    var activeTab: FeedFilter = .forYou
    let onViewFull: () -> Void
    @State private var showLikes = false
    @State private var likeScale: CGFloat = 1
    @State private var likeGlow = false
    @State private var miniProfileTarget: MiniProfileTarget? = nil

    var body: some View {
        ZStack(alignment: .bottom) {
            Color.byteBackground

            VStack(alignment: .leading, spacing: 0) {
                Color.clear.frame(height: 12) // chrome reserved by safeAreaInset on FeedView

                CardWithTopGradient {
                    VStack(alignment: .leading, spacing: 14) {
                        PostHeader(post: post, activeTab: activeTab) {
                            miniProfileTarget = MiniProfileTarget(
                                userId: post.author.id,
                                username: post.author.username,
                                displayName: post.author.displayName,
                                initials: post.author.initials,
                                avatarUrl: post.author.avatarUrl,
                                role: post.author.role,
                                company: post.author.company,
                                tags: post.tags
                            )
                        }

                        Text(post.title)
                            .font(.byteSans(22, weight: .bold))
                            .foregroundColor(.byteText1)
                            .lineLimit(3)
                            .fixedSize(horizontal: false, vertical: true)

                        Text(post.body)
                            .font(.byteSans(15))
                            .foregroundColor(.byteText2)
                            .lineSpacing(5)
                            .lineLimit(8)

                        if let code = post.code {
                            CodeBlockView(snippet: code)
                                .frame(maxHeight: 170)
                                .clipped()
                        }

                        if !post.tags.isEmpty {
                            ScrollView(.horizontal, showsIndicators: false) {
                                HStack(spacing: 6) {
                                    ForEach(post.tags, id: \.self) { TagView(label: $0) }
                                }
                            }
                        }

                        Divider().background(Color.byteBorderHigh)

                        actionRow
                    }
                    .padding(16)
                }
                .padding(.horizontal, 12)

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
        }
        .sheet(isPresented: $showLikes) {
            LikesSheet(postId: post.id)
        }
        .sheet(item: $miniProfileTarget) { target in
            UserMiniProfileSheet(target: target)
        }
    }

    // Compact inline action row — like / comment / save / share, with VIEW_FULL_BYTE on the right.
    private var actionRow: some View {
        HStack(spacing: 8) {
            Button {
                withAnimation(.spring(response: 0.22, dampingFraction: 0.38)) {
                    post.isLiked.toggle()
                    post.likes += post.isLiked ? 1 : -1
                    likeScale = 1.55
                    likeGlow = post.isLiked
                }
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.22) {
                    withAnimation(.spring(response: 0.28, dampingFraction: 0.62)) { likeScale = 1.0 }
                }
                if post.isLiked { Haptics.light() }
                Task { try? await APIClient.shared.toggleLike(postId: post.id) }
            } label: {
                actionPillLabel(
                    icon: post.isLiked ? "heart.fill" : "heart",
                    text: "\(post.likes)",
                    isActive: post.isLiked,
                    activeTint: .byteRed
                )
                .scaleEffect(likeScale)
                .shadow(color: likeGlow ? Color.byteRed.opacity(0.55) : .clear, radius: 8)
            }
            .buttonStyle(.plain)
            .simultaneousGesture(LongPressGesture(minimumDuration: 0.3).onEnded { _ in showLikes = true })

            Button(action: onViewFull) {
                actionPillLabel(icon: "bubble.left", text: "\(post.comments)", isActive: false)
            }
            .buttonStyle(.plain)

            Button {
                withAnimation(.spring(response: 0.28)) { post.isBookmarked.toggle() }
                if post.isBookmarked { Haptics.light() }
                Task { try? await APIClient.shared.toggleBookmark(postId: post.id) }
            } label: {
                actionPillLabel(
                    icon: post.isBookmarked ? "bookmark.fill" : "bookmark",
                    text: nil,
                    isActive: post.isBookmarked,
                    activeTint: .byteCyan
                )
            }
            .buttonStyle(.plain)

            ShareLink(item: ShareURL.post(id: post.id),
                      subject: Text(post.title),
                      message: Text(String(post.body.prefix(140)))) {
                actionPillLabel(icon: "square.and.arrow.up", text: nil, isActive: false)
            }

            Spacer(minLength: 8)

            CTAButton(label: "VIEW_FULL_BYTE", action: onViewFull)
        }
    }

    @ViewBuilder
    private func actionPillLabel(icon: String, text: String?, isActive: Bool, activeTint: Color = .byteAccent) -> some View {
        HStack(spacing: 6) {
            Image(systemName: icon).font(.system(size: 14))
            if let text { Text(text).font(.byteMono(11)).tracking(0.5) }
        }
        .foregroundColor(isActive ? activeTint : .byteText1)
        .padding(.horizontal, 12).padding(.vertical, 8)
        .background(isActive ? IdentityColor.blue.bgActive : IdentityColor.blue.bgFaint)
        .overlay(
            RoundedRectangle(cornerRadius: 8)
                .stroke(isActive ? activeTint : IdentityColor.blue.borderFaint, lineWidth: 1)
        )
        .clipShape(RoundedRectangle(cornerRadius: 8))
    }
}

// MARK: - Likes Sheet

struct LikesSheet: View {
    let postId: String
    @State private var likes: [LikeUser] = []
    @State private var isLoading = true
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            ZStack {
                Color.byteCard.ignoresSafeArea()
                if isLoading {
                    ByteSpinner()
                } else if likes.isEmpty {
                    EmptyStateView(icon: "heart", title: "No likes yet", message: "Be the first to like this byte.")
                } else {
                    List(likes) { like in
                        HStack(spacing: 12) {
                            AvatarView(like.initials, variant: AvatarVariant(rawValue: like.avatarVariant) ?? .cyan, size: .md)
                            VStack(alignment: .leading, spacing: 2) {
                                Text(like.displayName).font(.byteSans(14, weight: .semibold)).foregroundColor(.byteText1)
                                Text("@\(like.username)").font(.byteMonoTiny).foregroundColor(.byteText3)
                            }
                        }
                        .listRowBackground(Color.byteCard)
                    }
                    .listStyle(.plain)
                    .scrollContentBackground(.hidden)
                }
            }
            .navigationTitle("\(likes.count) Likes")
            .navigationBarTitleDisplayMode(.inline)
            .toolbarBackground(Color.byteCard, for: .navigationBar)
            .toolbarColorScheme(.dark, for: .navigationBar)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Done") { dismiss() }.foregroundColor(.byteAccent)
                }
            }
        }
        .task {
            isLoading = true
            likes = (try? await APIClient.shared.getLikes(postId: postId)) ?? []
            isLoading = false
        }
    }
}

// MARK: - ViewModel

/// One row in the tech-stack picker: the canonical lowercase `value` is what the
/// backend matches against (`bts.TechStack.Name.ToLower()`); the human `label`
/// is what we render in chips and suggestions. Web sends `stack.name`; iOS used
/// to send `stack.label`, which silently no-op'd the filter.
struct TechOption: Hashable {
    let value: String
    let label: String
}

@MainActor
final class FeedViewModel: ObservableObject {
    @Published var posts: [Post] = []
    @Published var isLoading = false
    @Published var isLoadingMore = false
    @Published var hasMore = true
    @Published var stackOptions: [TechOption] = [
        .init(value: "react",       label: "React"),
        .init(value: "typescript",  label: "TypeScript"),
        .init(value: "go",          label: "Go"),
        .init(value: "rust",        label: "Rust"),
        .init(value: "python",      label: "Python"),
        .init(value: "postgresql",  label: "PostgreSQL"),
        .init(value: "swift",       label: "Swift"),
        .init(value: "kubernetes",  label: "Kubernetes"),
    ]
    @Published var selectedTab: FeedFilter = .forYou {
        didSet { guard oldValue != selectedTab else { return }; Task { await load() } }
    }
    /// Multi-select holding the canonical `name` values (e.g. `aspnet-core`),
    /// CSV-joined into `?stack=` when calling `/api/feed`. Web parity: same
    /// canonical values via `feed-filters.tsx → onChange(stack.name)`.
    @Published var selectedStacks: [String] = [] {
        didSet { guard oldValue != selectedStacks else { return }; Task { await load() } }
    }
    @Published var unreadNotifications = 0

    /// True once the user has explicitly toggled the stack filter (or once we've
    /// auto-seeded from their profile). Prevents re-seeding from techStack on
    /// subsequent loads after they've chosen "no filter" themselves.
    private var hasSeededStacks = false

    private var page = 1

    init() {
        // APNs push arrived while app is foreground → bump the bell badge
        // immediately. Refresh from server next foreground transition reconciles
        // any drift from dropped pushes.
        NotificationCenter.default.addObserver(
            forName: .pushReceived, object: nil, queue: .main
        ) { [weak self] _ in
            Task { @MainActor in self?.unreadNotifications += 1 }
        }
        // Notifications sheet marked one or all as read → decrement the badge.
        NotificationCenter.default.addObserver(
            forName: .notificationsMarkedRead, object: nil, queue: .main
        ) { [weak self] note in
            let delta = (note.userInfo?["delta"] as? Int) ?? 0
            Task { @MainActor in
                guard let self else { return }
                self.unreadNotifications = max(0, self.unreadNotifications + delta)
            }
        }
    }

    /// Pulls the canonical unread count from the server. Called on app launch
    /// and on every foreground transition — the safety net for any APNs
    /// pushes the OS dropped while the app was backgrounded.
    func refreshUnreadCount() async {
        if let count = try? await APIClient.shared.getUnreadCount() {
            unreadNotifications = count
        }
    }

    var meUsername: String { AuthManager.shared.currentUser?.username ?? "" }
    var meInitials: String { AuthManager.shared.currentUser?.initials ?? "?" }
    var meAvatarUrl: String? { AuthManager.shared.currentUser?.avatarUrl }
    var meUserId: String? { AuthManager.shared.currentUser?.id }

    /// Trending tab ignores stack filter; FOR_YOU joins selections as CSV (backend accepts it).
    private var stackQueryValue: String? {
        guard selectedTab == .forYou, !selectedStacks.isEmpty else { return nil }
        return selectedStacks.joined(separator: ",")
    }

    func load() async {
        guard !isLoading else { return }
        // Auto-seed from current user's techStack on first load (web parity:
        // feed-screen.tsx seeds activeStackFilter from `me.techStack` when no
        // explicit `?stack=` was set). Triggers a re-load on change → load() runs again.
        if !hasSeededStacks,
           selectedStacks.isEmpty,
           let me = AuthManager.shared.currentUser,
           !me.techStack.isEmpty {
            hasSeededStacks = true
            selectedStacks = me.techStack
            return // didSet on selectedStacks will re-enter load()
        }

        isLoading = true
        defer { isLoading = false }
        page = 1
        hasMore = true
        do {
            posts = try await APIClient.shared.getFeed(
                filter: selectedTab.rawValue,
                stack: stackQueryValue
            )
        } catch {
            // Keep existing posts on refresh failure (or cancellation) — clearing them
            // makes a transient error look like an empty feed.
            print("[Feed] load failed: \(error)")
        }
        if let stacks = try? await APIClient.shared.getTechStacks() {
            let opts = stacks.map { TechOption(value: $0.name, label: $0.label) }
            if !opts.isEmpty { stackOptions = opts }
        }
    }

    func refresh() async { await load() }

    func loadMore() async {
        guard hasMore, !isLoadingMore else { return }
        isLoadingMore = true
        defer { isLoadingMore = false }
        page += 1
        do {
            let more = try await APIClient.shared.getFeed(
                filter: selectedTab.rawValue,
                stack: stackQueryValue,
                page: page
            )
            if more.isEmpty { hasMore = false }
            else { posts.append(contentsOf: more) }
        } catch {
            hasMore = false
        }
    }
}

#Preview {
    FeedView()
        .environmentObject(AuthManager.shared)
        .environmentObject(FeatureFlagsManager.shared)
        .environmentObject(ChatService.shared)
        .environmentObject(DeepLinkRouter.shared)
        .environmentObject(ToastCenter.shared)
}
