import SwiftUI

// MARK: - Post Detail View
// Mirrors UI/components/features/detail/detail-screen.tsx
// Card with accent gradient top line, faint-blue interaction buttons, share with toast.

struct PostDetailView: View {
    @State var post: Post
    var onPostChanged: ((Post) -> Void)? = nil
    // Dwell timer that only counts time the screen is actually visible.
    // visibleSince  = timestamp of the last "became visible" transition (nil while hidden)
    // accumulatedMs = total visible ms accrued in earlier visible spans.
    @State private var visibleSince: Date?
    @State private var accumulatedMs: Int = 0
    @Environment(\.scenePhase) private var scenePhase
    @State private var showComments = false
    @State private var showLikers = false
    @State private var showSimilar = false
    @State private var previewComments: [Comment] = []
    @State private var isLoadingPreview = true
    @State private var isSendingComment = false
    /// Drives the moderation rejection sheet via `.sheet(item:)` when the
    /// inline compose bar's comment is rejected by the backend.
    @State private var contentRejection: ContentRejection?
    @EnvironmentObject private var toasts: ToastCenter

    init(post: Post, onPostChanged: ((Post) -> Void)? = nil) {
        self._post = State(initialValue: post)
        self.onPostChanged = onPostChanged
    }

    var body: some View {
        ZStack {
            Color.byteBackground.ignoresSafeArea()
                .dismissKeyboardOnTap()

            VStack(spacing: 0) {
                ScrollView {
                    VStack(spacing: 16) {
                        CardWithTopGradient {
                            VStack(alignment: .leading, spacing: 18) {
                                PostHeader(post: post)

                                Text(post.title)
                                    .font(.byteSans(22, weight: .heavy))
                                    .foregroundColor(.byteText1)
                                    .fixedSize(horizontal: false, vertical: true)

                                Text(post.body)
                                    .font(.byteBodyMedium)
                                    .foregroundColor(.byteText2)
                                    .lineSpacing(5)

                                if let code = post.code {
                                    CodeBlockView(snippet: code)
                                }

                                if !post.tags.isEmpty {
                                    FlowLayout(spacing: 6) {
                                        ForEach(post.tags, id: \.self) { tag in
                                            Text(tag)
                                                .font(.byteTerminalSmall)
                                                .foregroundColor(.byteText1)
                                                .padding(.horizontal, 10).padding(.vertical, 4)
                                                .background(IdentityColor.blue.bgFaint)
                                                .overlay(RoundedRectangle(cornerRadius: 12)
                                                    .stroke(IdentityColor.blue.borderFaint, lineWidth: 1))
                                                .clipShape(RoundedRectangle(cornerRadius: 12))
                                        }
                                    }
                                }

                                Divider().background(Color.byteBorderHigh)

                                actionRow
                            }
                            .padding(18)
                        }
                        .padding(.horizontal, 12)

                        commentsPreview
                            .padding(.horizontal, 12)
                    }
                    .padding(.top, 12)
                    .padding(.bottom, 24)
                }
                .scrollDismissesKeyboard(.interactively)

                Divider().background(Color.byteBorderHigh)
                CommentComposeBar(isSending: isSendingComment) { text in
                    await submitComment(body: text)
                }
            }
        }
        .sheet(item: $contentRejection) { rejection in
            ContentRejectedModal(rejection: rejection) {
                contentRejection = nil
            }
            .presentationDetents([.medium, .large])
            .presentationDragIndicator(.visible)
            .presentationBackground(Color.byteCard)
            .presentationCornerRadius(20)
        }
        .navigationTitle("Byte")
        .navigationBarTitleDisplayMode(.inline)
        .toolbarBackground(Color.byteBackground, for: .navigationBar)
        .toolbarColorScheme(.dark, for: .navigationBar)
        .navigationDestination(isPresented: $showComments) {
            CommentsView(post: post)
        }
        .navigationDestination(isPresented: $showSimilar) {
            SimilarBytesView(byteId: post.id, sourceTitle: post.title)
        }
        .sheet(isPresented: $showLikers) { LikesSheet(postId: post.id) }
        .task {
            // Refresh likes/comments from the API so stale counts from bookmarks
            // or feed snapshots are corrected immediately on open.
            if let fresh = try? await APIClient.shared.getPost(id: post.id) {
                post.likes = fresh.likes
                post.comments = fresh.comments
                post.isLiked = fresh.isLiked
                post.isBookmarked = fresh.isBookmarked
            }
            await loadPreviewComments()
        }
        // Reflect comment add/remove from CommentsView (push) without refetching.
        // The header counter ("View all N") and the inline preview both update.
        .onReceive(NotificationCenter.default.publisher(for: .postCommentsChanged)) { note in
            guard let info = note.userInfo,
                  let id = info["postId"] as? String, id == post.id else { return }
            if let count = info["count"] as? Int {
                post.comments = count
            } else if let delta = info["delta"] as? Int {
                post.comments = max(0, post.comments + delta)
            }
            onPostChanged?(post)
            Task { await loadPreviewComments() }
        }
        .onAppear {
            accumulatedMs = 0
            visibleSince = scenePhase == .active ? Date() : nil
        }
        .onChange(of: scenePhase) { _, newPhase in
            if newPhase == .active {
                visibleSince = Date()
            } else if let started = visibleSince {
                accumulatedMs += Int(Date().timeIntervalSince(started) * 1000)
                visibleSince = nil
            }
        }
        .onDisappear {
            let tail = visibleSince.map { Int(Date().timeIntervalSince($0) * 1000) } ?? 0
            let dwell = accumulatedMs + tail
            if dwell > 2000 {
                Task { try? await APIClient.shared.recordView(postId: post.id, dwellMs: dwell) }
            }
        }
    }

    @ViewBuilder
    private var commentsPreview: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                AccentBarHeader(label: "COMMENTS", size: .compact)
                Spacer()
                if post.comments > 0 {
                    Button { showComments = true } label: {
                        HStack(spacing: 4) {
                            Text("View all \(post.comments)")
                                .font(.byteMono(11, weight: .bold))
                                .tracking(0.5)
                            Image(systemName: "arrow.right").font(.system(size: 11))
                        }
                        .foregroundColor(.byteAccent)
                    }
                    .buttonStyle(.plain)
                }
            }

            if isLoadingPreview {
                HStack(spacing: 8) {
                    ByteSpinner(size: 14)
                    Text("Loading comments…")
                        .font(.byteTerminalSmall).foregroundColor(.byteText2)
                }
                .padding(.vertical, 4)
            } else if previewComments.isEmpty {
                Text("Be the first to add a comment.")
                    .font(.byteBodySmall)
                    .foregroundColor(.byteText2)
                    .padding(.vertical, 6)
            } else {
                ForEach(previewComments) { c in
                    HStack(alignment: .top, spacing: 10) {
                        AvatarView(user: c.author, size: .sm)
                        VStack(alignment: .leading, spacing: 4) {
                            HStack(spacing: 6) {
                                Text("@\(c.author.username)")
                                    .font(.byteMono(11, weight: .bold))
                                    .foregroundColor(.byteText1)
                                if c.author.isVerified {
                                    Image(systemName: "checkmark.seal.fill")
                                        .font(.system(size: 10))
                                        .foregroundColor(.byteAccent)
                                }
                                Text(c.timestamp)
                                    .font(.byteMono(10))
                                    .foregroundColor(.byteText2)
                            }
                            Text(c.content)
                                .font(.byteBodySmall)
                                .foregroundColor(.byteText2)
                                .lineLimit(3)
                                .fixedSize(horizontal: false, vertical: true)
                        }
                        Spacer(minLength: 0)
                    }
                    .padding(.vertical, 6)
                }
            }
        }
        .padding(.horizontal, 4)
    }

    private func loadPreviewComments() async {
        isLoadingPreview = true
        defer { isLoadingPreview = false }
        let all = (try? await APIClient.shared.getComments(postId: post.id)) ?? []
        previewComments = Array(all.prefix(3))
    }

    private func submitComment(body: String) async -> Bool {
        let trimmed = body.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return false }
        isSendingComment = true
        defer { isSendingComment = false }
        do {
            try await APIClient.shared.addComment(postId: post.id, body: trimmed)
            Haptics.success()
            post.comments += 1
            onPostChanged?(post)
            await loadPreviewComments()
            NotificationCenter.default.post(
                name: .postCommentsChanged,
                object: nil,
                userInfo: ["postId": post.id, "delta": 1]
            )
            return true
        } catch {
            if let rejection = APIError.rejection(from: error) {
                contentRejection = rejection
                return false
            }
            toasts.show("Couldn't post comment", kind: .error)
            return false
        }
    }

    private var actionRow: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                interactionPill(icon: post.isLiked ? "heart.fill" : "heart",
                                count: post.likes, isActive: post.isLiked) {
                    Haptics.light()
                    withAnimation(.spring(response: 0.3)) {
                        post.isLiked.toggle()
                        post.likes += post.isLiked ? 1 : -1
                    }
                    onPostChanged?(post)
                    Task { try? await APIClient.shared.toggleLike(postId: post.id) }
                }
                .simultaneousGesture(LongPressGesture(minimumDuration: 0.3).onEnded { _ in showLikers = true })
                .accessibilityLabel("Like")
                .accessibilityValue(post.isLiked ? "liked" : "not liked")
                .accessibilityHint("Long-press to see who liked")

                interactionPill(icon: "bubble.left", count: post.comments, isActive: false) {
                    showComments = true
                }
                .accessibilityLabel("View comments")

                interactionPill(icon: post.isBookmarked ? "bookmark.fill" : "bookmark",
                                label: post.isBookmarked ? "SAVED" : "SAVE", isActive: post.isBookmarked) {
                    Haptics.light()
                    withAnimation { post.isBookmarked.toggle() }
                    onPostChanged?(post)
                    Task { try? await APIClient.shared.toggleBookmark(postId: post.id) }
                }
                .accessibilityLabel("Bookmark")
                .accessibilityValue(post.isBookmarked ? "bookmarked" : "not bookmarked")

                ShareLink(
                    item: ShareURL.post(id: post.id),
                    subject: Text(post.title),
                    message: Text(String(post.body.prefix(140)))
                ) {
                    pillContent(icon: "square.and.arrow.up", label: "SHARE", isActive: false)
                }
                .buttonStyle(.plain)
                .accessibilityLabel("Share")

                interactionPill(icon: "square.stack.3d.up", label: "SIMILAR", isActive: false) {
                    showSimilar = true
                }
                .accessibilityLabel("Show similar bytes")
            }
        }
    }

    /// Shared label content for pill-style action buttons — used by both Button and ShareLink wrappers
    /// so both get identical single-layer styling with no double-border.
    private func pillContent(icon: String, count: Int? = nil, label: String? = nil, isActive: Bool) -> some View {
        HStack(spacing: 6) {
            Image(systemName: icon).font(.system(size: 13))
            if let count { Text("\(count)").font(.byteTerminalSmall).tracking(0.5).lineLimit(1) }
            if let label { Text(label).font(.byteTerminalSmall).tracking(0.5).lineLimit(1) }
        }
        .fixedSize(horizontal: true, vertical: false)
        .foregroundColor(isActive ? .byteAccent : .byteText1)
        .padding(.horizontal, 12).padding(.vertical, 8)
        .background(isActive ? IdentityColor.blue.bgActive : IdentityColor.blue.bgFaint)
        .overlay(
            RoundedRectangle(cornerRadius: 8)
                .stroke(isActive ? .byteAccent : IdentityColor.blue.borderFaint, lineWidth: 1)
        )
        .clipShape(RoundedRectangle(cornerRadius: 8))
    }

    private func interactionPill(icon: String, count: Int? = nil, label: String? = nil,
                                 isActive: Bool, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            pillContent(icon: icon, count: count, label: label, isActive: isActive)
        }
        .buttonStyle(.plain)
        .frame(minHeight: 44)
    }
}

// MARK: - Flow Layout (tags) — kept here since other detail views also use it.

struct FlowLayout: Layout {
    var spacing: CGFloat = 8

    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        let rows = computeRows(proposal: proposal, subviews: subviews)
        let height = rows.reduce(0) { $0 + $1.maxHeight } + CGFloat(max(0, rows.count - 1)) * spacing
        return CGSize(width: proposal.width ?? 0, height: height)
    }

    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        let rows = computeRows(proposal: proposal, subviews: subviews)
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

// MARK: - Similar Bytes View
// Mirrors web's `?byteId=` flow inside search-screen.tsx — shows semantically similar
// bytes via /api/bytes/{id}/similar. Inlined here so no new project.pbxproj entry is needed.

struct SimilarBytesView: View {
    let byteId: String
    let sourceTitle: String
    @State private var results: [SimilarByte] = []
    @State private var isLoading = true
    @State private var error: String?

    var body: some View {
        ZStack {
            Color.byteBackground.ignoresSafeArea()

            ScrollView {
                VStack(alignment: .leading, spacing: 14) {
                    AccentBarHeader(label: isLoading ? "FINDING SIMILAR…" : "SIMILAR BYTES (\(results.count))")
                        .padding(.top, 4)

                    if isLoading {
                        VStack {
                            ByteSpinner()
                                .padding(.top, 40)
                                .frame(maxWidth: .infinity)
                        }
                    } else if error != nil {
                        VStack(spacing: 16) {
                            EmptyStateView(
                                icon: "exclamationmark.triangle",
                                title: "COULDN'T LOAD",
                                message: "Try again in a moment."
                            )
                            Button {
                                Task { await load() }
                            } label: {
                                Text("RETRY")
                                    .font(.byteMono(11, weight: .bold))
                                    .tracking(0.7)
                                    .foregroundColor(.byteAccent)
                                    .padding(.horizontal, 20).padding(.vertical, 8)
                                    .background(IdentityColor.blue.bgFaint)
                                    .overlay(RoundedRectangle(cornerRadius: 8).stroke(IdentityColor.blue.borderFaint, lineWidth: 1))
                                    .clipShape(RoundedRectangle(cornerRadius: 8))
                            }
                            .buttonStyle(.plain)
                        }
                        .frame(maxWidth: .infinity)
                        .padding(.top, 20)
                    } else if results.isEmpty {
                        EmptyStateView(
                            icon: "square.stack.3d.up.slash",
                            title: "NO SIMILAR BYTES",
                            message: "This byte doesn't have a semantic embedding yet."
                        )
                    } else {
                        ForEach(results) { row in
                            NavigationLink {
                                Color.byteBackground.ignoresSafeArea()
                                    .overlay(LoadingByteThenDetail(byteId: row.id))
                            } label: {
                                SimilarByteCard(byte: row)
                            }
                            .buttonStyle(.plain)
                        }
                    }
                }
                .padding(.horizontal, 16)
                .padding(.vertical, 14)
            }
        }
        .navigationTitle("Similar")
        .navigationBarTitleDisplayMode(.inline)
        .toolbarBackground(Color.byteBackground, for: .navigationBar)
        .toolbarColorScheme(.dark, for: .navigationBar)
        .task { await load() }
    }

    private func load() async {
        isLoading = true
        defer { isLoading = false }
        do {
            results = try await APIClient.shared.getSimilarBytes(byteId: byteId)
        } catch {
            self.error = "Try again in a moment."
        }
    }
}

private struct SimilarByteCard: View {
    let byte: SimilarByte

    private var authorInitial: String {
        String(byte.authorUsername.first.map { String($0).uppercased() } ?? "U")
    }

    private var authorRoleLine: String? {
        let role = byte.authorRoleTitle?.trimmingCharacters(in: .whitespaces) ?? ""
        let company = byte.authorCompany?.trimmingCharacters(in: .whitespaces) ?? ""
        switch (role.isEmpty, company.isEmpty) {
        case (true, true):   return nil
        case (false, true):  return role
        case (true, false):  return company
        case (false, false): return "\(role) @ \(company)"
        }
    }

    var body: some View {
        CardWithTopGradient {
            VStack(alignment: .leading, spacing: 8) {
                HStack(spacing: 10) {
                    AvatarView(authorInitial,
                               variant: .cyan,
                               size: .sm,
                               imageUrl: byte.authorAvatarUrl,
                               ownerUserId: byte.authorId)
                    VStack(alignment: .leading, spacing: 1) {
                        Text("@\(byte.authorUsername)")
                            .font(.byteMono(11, weight: .bold))
                            .foregroundColor(.byteText1)
                        if let line = authorRoleLine {
                            Text(line)
                                .font(.byteMono(10))
                                .foregroundColor(.byteText2)
                                .lineLimit(1)
                        }
                    }
                    Spacer()
                }

                Text(byte.title)
                    .font(.byteSans(15, weight: .bold))
                    .foregroundColor(.byteText1)
                    .lineLimit(2)
                    .multilineTextAlignment(.leading)

                Text(byte.body)
                    .font(.byteBodySmall)
                    .foregroundColor(.byteText2)
                    .lineLimit(2)
                    .multilineTextAlignment(.leading)

                if !byte.tags.isEmpty {
                    HStack(spacing: 6) {
                        ForEach(byte.tags.prefix(4), id: \.self) { tag in
                            Text(tag)
                                .font(.byteMono(10))
                                .foregroundColor(.byteText2)
                                .padding(.horizontal, 8).padding(.vertical, 2)
                                .background(IdentityColor.blue.bgFaint)
                                .overlay(RoundedRectangle(cornerRadius: 6).stroke(IdentityColor.blue.borderFaint, lineWidth: 1))
                                .clipShape(RoundedRectangle(cornerRadius: 6))
                        }
                    }
                }
            }
            .padding(14)
        }
    }
}

/// Tiny shim that fetches the full Post by id then renders PostDetailView once loaded.
/// Used by SimilarBytesView so taps navigate into the canonical detail view.
private struct LoadingByteThenDetail: View {
    let byteId: String
    @State private var post: Post?
    @State private var error: String?

    var body: some View {
        Group {
            if let post {
                PostDetailView(post: post)
            } else if let error {
                EmptyStateView(icon: "exclamationmark.triangle", title: "Couldn't load", message: error)
            } else {
                ByteSpinner()
            }
        }
        .task {
            do {
                post = try await APIClient.shared.getPost(id: byteId)
            } catch {
                self.error = "Try again in a moment."
            }
        }
    }
}
