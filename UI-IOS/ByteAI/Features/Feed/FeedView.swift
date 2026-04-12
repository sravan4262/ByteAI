import SwiftUI

// MARK: - Scroll anchor for custom pull-to-refresh

private struct TopAnchorKey: PreferenceKey {
    static var defaultValue: CGFloat = 0
    static func reduce(value: inout CGFloat, nextValue: () -> CGFloat) { value = nextValue() }
}

// MARK: - Feed View

struct FeedView: View {
    @StateObject private var vm = FeedViewModel()
    @State private var selectedPost: Post?
    @State private var pullProgress: CGFloat = 0
    @State private var isRefreshing = false
    @State private var anchorBaseline: CGFloat? = nil
    private let refreshThreshold: CGFloat = 58

    var body: some View {
        NavigationStack {
            GeometryReader { geo in
                ZStack(alignment: .top) {
                    Color.byteBackground.ignoresSafeArea()

                    if vm.isLoading && vm.posts.isEmpty {
                        VStack { Spacer(); ByteSpinner(); Spacer() }.frame(maxWidth: .infinity)
                    } else if vm.posts.isEmpty {
                        VStack {
                            Spacer()
                            EmptyStateView(icon: "bolt.slash", title: "No bytes yet", message: "Follow engineers or change your filter.")
                            Spacer()
                        }
                    } else {
                        ScrollView(.vertical, showsIndicators: false) {
                            // Pull anchor — reads its global y to detect downward overscroll
                            Color.clear
                                .frame(height: 0)
                                .background(GeometryReader { proxy in
                                    Color.clear.preference(
                                        key: TopAnchorKey.self,
                                        value: proxy.frame(in: .global).minY
                                    )
                                })

                            LazyVStack(spacing: 0) {
                                ForEach(vm.posts) { post in
                                    BytePageCard(post: post, onViewFull: { selectedPost = post })
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
                                            if post.id == vm.posts.last?.id {
                                                Task { await vm.loadMore() }
                                            }
                                        }
                                }
                            }
                            .scrollTargetLayout()
                        }
                        .scrollTargetBehavior(.paging)
                        .scrollIndicators(.hidden)
                        .onPreferenceChange(TopAnchorKey.self) { value in
                            // Capture baseline once when view first renders at rest
                            if anchorBaseline == nil {
                                anchorBaseline = value
                                return
                            }
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
                                        await vm.refresh()
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
                        FeedRefreshIndicator(progress: pullProgress, isRefreshing: isRefreshing)
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
                    .frame(height: 92)
                    .allowsHitTesting(false)

                    FilterBar(
                        selectedFilter: $vm.selectedFilter,
                        selectedStack: $vm.selectedStack,
                        stackOptions: vm.stackOptions
                    )
                    .padding(.horizontal, 16)
                    .padding(.top, 8)
                }
            }
            .navigationTitle("")
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Text("⚡ ByteAI")
                        .font(.byteSans(18, weight: .bold))
                        .foregroundColor(.byteText1)
                }
            }
            .navigationDestination(item: $selectedPost) { post in PostDetailView(post: post) }
        }
        .task { await vm.load() }
    }
}

// MARK: - Pull-to-Refresh Indicator

private struct FeedRefreshIndicator: View {
    let progress: CGFloat
    let isRefreshing: Bool
    @State private var spinAngle: Double = 0

    var body: some View {
        HStack(spacing: 10) {
            ZStack {
                // Track
                Circle()
                    .stroke(Color.byteAccent.opacity(0.18), lineWidth: 2.5)
                    .frame(width: 22, height: 22)
                // Fill / spinner
                if isRefreshing {
                    Circle()
                        .trim(from: 0, to: 0.72)
                        .stroke(Color.byteAccent, style: StrokeStyle(lineWidth: 2.5, lineCap: .round))
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
                        .stroke(Color.byteAccent, style: StrokeStyle(lineWidth: 2.5, lineCap: .round))
                        .frame(width: 22, height: 22)
                        .rotationEffect(.degrees(-90))
                }
            }

            Text(isRefreshing ? "Refreshing…" : "Release to refresh")
                .font(.byteMono(11, weight: .medium))
                .foregroundColor(.byteText3)
                .contentTransition(.numericText())
        }
        .padding(.horizontal, 18)
        .padding(.vertical, 9)
        .background(.ultraThinMaterial, in: Capsule())
        .overlay(Capsule().stroke(Color.byteAccent.opacity(0.2), lineWidth: 0.5))
    }
}

// MARK: - Full-Screen Byte Card (TikTok-rail layout)

struct BytePageCard: View {
    @State var post: Post
    let onViewFull: () -> Void
    @State private var showLikes = false
    @State private var likeScale: CGFloat = 1
    @State private var likeGlow = false

    var body: some View {
        ZStack(alignment: .trailing) {
            Color.byteBackground

            // ── Content column (leaves right margin for the action rail) ──────
            VStack(alignment: .leading, spacing: 0) {
                Color.clear.frame(height: 70) // clears filter bar

                VStack(alignment: .leading, spacing: 14) {
                    PostHeader(post: post)

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
                }
                .padding(.leading, 20)
                .padding(.trailing, 76)   // right clearance for action rail

                Spacer()

                // Swipe-up hint row
                HStack {
                    Spacer()
                    Image(systemName: "chevron.compact.up")
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundColor(.byteText3)
                    Spacer()
                }
                .frame(height: 28)
            }

            // Bottom fade over content
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

            // ── Right-side action rail ─────────────────────────────────────────
            VStack(spacing: 26) {
                Spacer()

                // Like
                VStack(spacing: 5) {
                    Button {
                        withAnimation(.spring(response: 0.22, dampingFraction: 0.38)) {
                            post.isLiked.toggle()
                            post.likes += post.isLiked ? 1 : -1
                            likeScale = 1.55
                            likeGlow = post.isLiked
                        }
                        DispatchQueue.main.asyncAfter(deadline: .now() + 0.22) {
                            withAnimation(.spring(response: 0.28, dampingFraction: 0.62)) {
                                likeScale = 1.0
                            }
                        }
                        if post.isLiked {
                            UIImpactFeedbackGenerator(style: .light).impactOccurred()
                        }
                        Task { try? await APIClient.shared.toggleLike(postId: post.id) }
                    } label: {
                        Image(systemName: post.isLiked ? "heart.fill" : "heart")
                            .font(.system(size: 30))
                            .foregroundStyle(post.isLiked ? Color.byteRed : Color.byteText1)
                            .scaleEffect(likeScale)
                            .shadow(color: likeGlow ? Color.byteRed.opacity(0.7) : .clear, radius: 10)
                    }
                    .buttonStyle(.plain)

                    Button { showLikes = true } label: {
                        Text("\(post.likes)")
                            .font(.byteSans(13, weight: .semibold))
                            .foregroundColor(.byteText2)
                            .contentTransition(.numericText())
                    }
                    .buttonStyle(.plain)
                }

                // Comment
                VStack(spacing: 5) {
                    Button(action: onViewFull) {
                        Image(systemName: "bubble.left.fill")
                            .font(.system(size: 28))
                            .foregroundColor(.byteText1)
                    }
                    .buttonStyle(.plain)

                    Text("\(post.comments)")
                        .font(.byteSans(13, weight: .semibold))
                        .foregroundColor(.byteText2)
                }

                // Bookmark
                Button {
                    withAnimation(.spring(response: 0.28)) {
                        post.isBookmarked.toggle()
                    }
                    if post.isBookmarked {
                        UIImpactFeedbackGenerator(style: .light).impactOccurred()
                    }
                    Task { try? await APIClient.shared.toggleBookmark(postId: post.id) }
                } label: {
                    Image(systemName: post.isBookmarked ? "bookmark.fill" : "bookmark")
                        .font(.system(size: 28))
                        .foregroundStyle(post.isBookmarked ? Color.byteCyan : Color.byteText1)
                        .shadow(color: post.isBookmarked ? Color.byteCyan.opacity(0.55) : .clear, radius: 7)
                }
                .buttonStyle(.plain)

                // Share
                ShareLink(item: "Check out this byte on ByteAI: \(post.title)") {
                    Image(systemName: "square.and.arrow.up")
                        .font(.system(size: 26))
                        .foregroundColor(.byteText1)
                }

                // Full post button
                Button(action: onViewFull) {
                    VStack(spacing: 3) {
                        Image(systemName: "arrow.up.right.square")
                            .font(.system(size: 22))
                        Text("FULL")
                            .font(.byteMono(8, weight: .bold))
                    }
                    .foregroundColor(.byteAccent)
                }
                .buttonStyle(.plain)

                Spacer().frame(height: 24)
            }
            .frame(width: 62)
        }
        .sheet(isPresented: $showLikes) {
            LikesSheet(postId: post.id)
        }
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

// MARK: - Filter Bar

private struct FilterBar: View {
    @Binding var selectedFilter: FeedFilter
    @Binding var selectedStack: String
    let stackOptions: [String]

    var body: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 6) {
                ForEach(FeedFilter.allCases, id: \.self) { filter in
                    Button {
                        withAnimation(.easeInOut(duration: 0.15)) { selectedFilter = filter }
                    } label: {
                        Text(filter.label)
                            .font(.byteMono(10, weight: .semibold))
                            .foregroundColor(selectedFilter == filter ? .byteAccent : .byteText2)
                            .padding(.horizontal, 12).padding(.vertical, 6)
                            .background(
                                RoundedRectangle(cornerRadius: 6)
                                    .fill(selectedFilter == filter ? Color.byteAccentDim : Color.byteElement)
                                    .overlay(RoundedRectangle(cornerRadius: 6).stroke(
                                        selectedFilter == filter ? Color.byteAccent.opacity(0.5) : Color.byteBorderMedium,
                                        lineWidth: 1
                                    ))
                            )
                    }
                }

                Menu {
                    Button("All Stacks") { selectedStack = "" }
                    Divider()
                    ForEach(stackOptions, id: \.self) { stack in
                        Button(stack) { selectedStack = stack }
                    }
                } label: {
                    HStack(spacing: 4) {
                        Image(systemName: "line.3.horizontal.decrease").font(.system(size: 10))
                        Text(selectedStack.isEmpty ? "STACK" : selectedStack.uppercased()).font(.byteMono(10, weight: .semibold))
                        Image(systemName: "chevron.down").font(.system(size: 9))
                    }
                    .foregroundColor(.byteText2)
                    .padding(.horizontal, 12).padding(.vertical, 6)
                    .background(Color.byteElement).cornerRadius(6)
                    .overlay(RoundedRectangle(cornerRadius: 6).stroke(Color.byteBorderMedium, lineWidth: 1))
                }
            }
        }
    }
}

// MARK: - ViewModel

@MainActor
final class FeedViewModel: ObservableObject {
    @Published var posts: [Post] = []
    @Published var isLoading = false
    @Published var isLoadingMore = false
    @Published var stackOptions: [String] = ["React", "TypeScript", "Go", "Rust", "Python", "PostgreSQL", "Swift", "Kubernetes"]
    @Published var selectedFilter: FeedFilter = .bytes {
        didSet { guard oldValue != selectedFilter else { return }; Task { await load() } }
    }
    @Published var selectedStack = "" {
        didSet { guard oldValue != selectedStack else { return }; Task { await load() } }
    }

    private var page = 1
    private var hasMore = true

    func load() async {
        guard !isLoading else { return }
        isLoading = true
        defer { isLoading = false }
        page = 1; hasMore = true
        do {
            posts = try await APIClient.shared.getFeed(
                filter: selectedFilter.rawValue,
                stack: selectedStack.isEmpty ? nil : selectedStack
            )
        } catch is CancellationError {
            // Pull-to-refresh released early — keep existing posts
        } catch {
            posts = []
        }
        if let stacks = try? await APIClient.shared.getTechStacks() {
            let names = stacks.map { $0.name }
            if !names.isEmpty { stackOptions = names }
        }
    }

    func refresh() async { await load() }

    func loadMore() async {
        guard hasMore, !isLoadingMore else { return }
        isLoadingMore = true; defer { isLoadingMore = false }
        page += 1
        do {
            let more = try await APIClient.shared.getFeed(
                filter: selectedFilter.rawValue,
                stack: selectedStack.isEmpty ? nil : selectedStack,
                page: page
            )
            if more.isEmpty { hasMore = false } else { posts.append(contentsOf: more) }
        } catch { hasMore = false }
    }
}

#Preview { FeedView() }
