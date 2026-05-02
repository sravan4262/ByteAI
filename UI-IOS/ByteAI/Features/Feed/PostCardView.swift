import SwiftUI

// MARK: - Post Card
// Mirrors UI/components/features/feed/post-card.tsx
// Full card with gradient top line, AI-curated badge, faint-blue interaction buttons,
// and the VIEW_FULL_BYTE CTA right-aligned in the action row.

struct PostCardView: View {
    @State var post: Post
    var onTap: (() -> Void)? = nil
    var onComment: (() -> Void)? = nil
    var activeTab: FeedFilter = .forYou
    var hideInteractions: Bool = false
    @State private var showLikers = false
    @State private var miniProfileUser: MiniProfileTarget? = nil

    var body: some View {
        CardWithTopGradient {
            VStack(alignment: .leading, spacing: 14) {
                // Tappable region: the inert, content portion of the card opens
                // the post detail when tapped. We can't make the WHOLE card a
                // tap gesture (that would swallow taps on the action row's like /
                // share / save buttons because gesture composition is order-
                // dependent and SwiftUI's Button gesture doesn't always win over
                // an ancestor `.onTapGesture` when the ancestor's hit area is
                // also a `Rectangle`). Putting the gesture on a sibling subtree
                // (header + title + body + code + tags) keeps the button row
                // taps intact while still giving users a large tap target.
                VStack(alignment: .leading, spacing: 14) {
                    PostHeader(post: post, activeTab: activeTab) {
                        miniProfileUser = MiniProfileTarget(
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
                        .font(.byteSans(18, weight: .heavy))
                        .foregroundColor(.byteText1)
                        .lineLimit(3)
                        .fixedSize(horizontal: false, vertical: true)

                    Text(post.body)
                        .font(.byteBodyMedium)
                        .foregroundColor(.byteText2)
                        .lineSpacing(4)
                        .lineLimit(3)

                    if let code = post.code {
                        CodeBlockView(snippet: code)
                            .frame(maxHeight: 140)
                            .clipped()
                    }

                    if !post.tags.isEmpty {
                        FlowTagRow(tags: post.tags)
                    }
                }
                .contentShape(Rectangle())
                .onTapGesture { (onTap ?? {})() }

                if !hideInteractions {
                    Divider().background(Color.byteBorderHigh).padding(.vertical, 2)
                    actionRow
                }
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 18)
        }
        .sheet(isPresented: $showLikers) { LikesSheet(postId: post.id) }
        .sheet(item: $miniProfileUser) { target in
            UserMiniProfileSheet(target: target)
        }
        .onReceive(NotificationCenter.default.publisher(for: .postCommentsChanged)) { note in
            guard let info = note.userInfo,
                  let id = info["postId"] as? String, id == post.id else { return }
            if let count = info["count"] as? Int {
                post.comments = count
            } else if let delta = info["delta"] as? Int {
                post.comments = max(0, post.comments + delta)
            }
        }
    }

    private var actionRow: some View {
        HStack(spacing: 8) {
            // Like — split button (icon | count)
            HStack(spacing: 0) {
                interactionButton(icon: "heart", isActive: post.isLiked, isLeft: true) {
                    withAnimation(.spring(response: 0.3, dampingFraction: 0.6)) {
                        post.isLiked.toggle()
                        post.likes += post.isLiked ? 1 : -1
                    }
                    if post.isLiked { Haptics.light() }
                    Task { try? await APIClient.shared.toggleLike(postId: post.id) }
                }
                Button {
                    // Web parity: tapping the count opens the likers sheet.
                    if post.likes > 0 { showLikers = true }
                } label: {
                    Text("\(post.likes)")
                        .font(.byteTerminalSmall)
                        .tracking(0.5)
                        .foregroundColor(post.isLiked ? .byteAccent : .byteText1)
                        .padding(.horizontal, 9)
                        .padding(.vertical, 8)
                        .background(post.isLiked ? IdentityColor.blue.bgActive : IdentityColor.blue.bgFaint)
                        .overlay(
                            UnevenRoundedRectangle(topLeadingRadius: 0, bottomLeadingRadius: 0,
                                                   bottomTrailingRadius: 8, topTrailingRadius: 8)
                                .stroke(post.isLiked ? .byteAccent : IdentityColor.blue.borderFaint, lineWidth: 1)
                        )
                        .clipShape(
                            UnevenRoundedRectangle(topLeadingRadius: 0, bottomLeadingRadius: 0,
                                                   bottomTrailingRadius: 8, topTrailingRadius: 8)
                        )
                }
                .buttonStyle(.plain)
            }

            interactionPill(icon: "bubble.left", count: post.comments, isActive: false) {
                onComment?() ?? onTap?()
            }

            interactionPill(icon: post.isBookmarked ? "bookmark.fill" : "bookmark",
                            label: post.isBookmarked ? "SAVED" : "SAVE", isActive: post.isBookmarked) {
                withAnimation { post.isBookmarked.toggle() }
                if post.isBookmarked { Haptics.light() }
                Task { try? await APIClient.shared.toggleBookmark(postId: post.id) }
            }

            ShareLink(item: ShareURL.post(id: post.id),
                      subject: Text(post.title),
                      message: Text(String(post.body.prefix(140)))) {
                HStack(spacing: 6) {
                    Image(systemName: "square.and.arrow.up").font(.system(size: 13))
                    Text("SHARE").font(.byteTerminalSmall).tracking(0.5)
                }
                .foregroundColor(.byteText1)
                .padding(.horizontal, 12).padding(.vertical, 8)
                .background(IdentityColor.blue.bgFaint)
                .overlay(RoundedRectangle(cornerRadius: 8).stroke(IdentityColor.blue.borderFaint, lineWidth: 1))
                .clipShape(RoundedRectangle(cornerRadius: 8))
            }

            Spacer()

            CTAButton(label: "VIEW_FULL_BYTE") { onTap?() }
        }
    }

    private func interactionButton(icon: String, isActive: Bool, isLeft: Bool, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Image(systemName: isActive ? "\(icon).fill" : icon)
                .font(.system(size: 13))
                .foregroundColor(isActive ? .byteAccent : .byteText1)
                .padding(.horizontal, 11).padding(.vertical, 8)
                .background(isActive ? IdentityColor.blue.bgActive : IdentityColor.blue.bgFaint)
                .overlay(
                    UnevenRoundedRectangle(topLeadingRadius: 8, bottomLeadingRadius: 8,
                                           bottomTrailingRadius: 0, topTrailingRadius: 0)
                        .stroke(isActive ? .byteAccent : IdentityColor.blue.borderFaint, lineWidth: 1)
                )
                .clipShape(
                    UnevenRoundedRectangle(topLeadingRadius: 8, bottomLeadingRadius: 8,
                                           bottomTrailingRadius: 0, topTrailingRadius: 0)
                )
        }
        .buttonStyle(.plain)
    }

    @ViewBuilder
    private func interactionPill(icon: String, count: Int? = nil, label: String? = nil,
                                 isActive: Bool, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            HStack(spacing: 6) {
                Image(systemName: icon).font(.system(size: 13))
                if let count, count > 0 { Text("\(count)").font(.byteTerminalSmall).tracking(0.5) }
                if let label { Text(label).font(.byteTerminalSmall).tracking(0.5) }
            }
            .foregroundColor(isActive ? .byteAccent : .byteText1)
            .padding(.horizontal, 12).padding(.vertical, 8)
            .background(isActive ? IdentityColor.blue.bgActive : IdentityColor.blue.bgFaint)
            .overlay(
                RoundedRectangle(cornerRadius: 8)
                    .stroke(isActive ? .byteAccent : IdentityColor.blue.borderFaint, lineWidth: 1)
            )
            .clipShape(RoundedRectangle(cornerRadius: 8))
        }
        .buttonStyle(.plain)
    }
}

// MARK: - Post header (avatar + name + AI-curated badge + timestamp)

struct PostHeader: View {
    let post: Post
    var activeTab: FeedFilter = .forYou
    var onAvatarTap: (() -> Void)? = nil

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            Group {
                if let onAvatarTap {
                    Button(action: onAvatarTap) { AvatarView(user: post.author, size: .md) }
                        .buttonStyle(.plain)
                } else {
                    AvatarView(user: post.author, size: .md)
                }
            }

            VStack(alignment: .leading, spacing: 2) {
                HStack(spacing: 6) {
                    Text("@\(post.author.username)")
                        .font(.byteMono(13, weight: .bold))
                        .foregroundColor(.byteText1)
                    if post.author.isVerified {
                        Image(systemName: "checkmark.seal.fill")
                            .font(.system(size: 11))
                            .foregroundColor(.byteAccent)
                    }
                    if post.author.isSystem {
                        Text("AI CURATED")
                            .font(.byteMono(10, weight: .bold))
                            .foregroundColor(.byteAccent)
                            .tracking(0.7)
                            .padding(.horizontal, 6).padding(.vertical, 2)
                            .background(IdentityColor.blue.tint(0.08))
                            .overlay(RoundedRectangle(cornerRadius: 4).stroke(Color.byteAccent, lineWidth: 1))
                            .clipShape(RoundedRectangle(cornerRadius: 4))
                    }
                }
                if !post.author.role.isEmpty || !post.author.company.isEmpty {
                    Text("\(post.author.role)\(post.author.role.isEmpty || post.author.company.isEmpty ? "" : " @ ")\(post.author.company)")
                        .font(.byteCodeSmall)
                        .foregroundColor(.byteText2)
                        .tracking(0.4)
                        .lineLimit(1)
                }
            }

            Spacer(minLength: 0)

            VStack(alignment: .trailing, spacing: 2) {
                Text(post.timestamp)
                    .font(.byteMono(10))
                    .foregroundColor(.byteText2)
                if activeTab == .trending, let views = post.views, views > 0 {
                    Text("\(formatCount(views)) views")
                        .font(.byteMono(10))
                        .foregroundColor(.byteOrange)
                }
            }
        }
    }

    private func formatCount(_ n: Int) -> String {
        n >= 1000 ? String(format: "%.1fk", Double(n) / 1000) : "\(n)"
    }
}

// MARK: - Tag flow row (web parity: hover-tinted on tap)

private struct FlowTagRow: View {
    let tags: [String]

    var body: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                ForEach(tags, id: \.self) { tag in
                    Text(tag)
                        .font(.byteTerminalSmall)
                        .foregroundColor(.byteText1)
                        .padding(.horizontal, 10).padding(.vertical, 4)
                        .background(IdentityColor.blue.bgFaint)
                        .overlay(RoundedRectangle(cornerRadius: 12).stroke(IdentityColor.blue.borderFaint, lineWidth: 1))
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                }
            }
        }
    }
}

// MARK: - User Mini Profile Sheet
// Mirrors UI/components/features/profile/user-mini-profile.tsx — opened from avatar taps
// on post cards / interview cards. Lazy-loads the full profile on appear; supports
// FOLLOW / UNFOLLOW with rm-pattern hover->red and a deep-link to the full profile.
//
// Inlined here (target-included file) so no project.pbxproj entry is needed.

struct MiniProfileTarget: Identifiable, Equatable {
    let id = UUID()
    let userId: String
    let username: String
    let displayName: String
    let initials: String
    let avatarUrl: String?
    let role: String
    let company: String
    let tags: [String]
}

struct UserMiniProfileSheet: View {
    let target: MiniProfileTarget
    @State private var profile: User?
    @State private var isFollowing = false
    @State private var followLoading = false
    @State private var pushFullProfile = false
    @Environment(\.dismiss) private var dismiss

    private var resolvedUsername: String { profile?.username ?? target.username }
    private var resolvedDisplayName: String { profile?.displayName ?? target.displayName }
    private var resolvedAvatar: String? { profile?.avatarUrl ?? target.avatarUrl }
    private var resolvedRole: String { profile?.role ?? target.role }
    private var resolvedCompany: String { profile?.company ?? target.company }
    // Counts come from the full profile fetch; while it's loading we render an
    // em-dash placeholder so the user doesn't see an authoritative-looking 0.
    private var resolvedBytes: String { profile.map { "\($0.bytes)" } ?? "—" }
    private var resolvedFollowers: String { profile.map { "\($0.followers)" } ?? "—" }
    private var resolvedLevel: String { profile.map { "\($0.level)" } ?? "—" }
    private var isOwnProfile: Bool { AuthManager.shared.currentUser?.id == target.userId }
    private var isSystemAccount: Bool { profile?.isSystem == true || target.username.lowercased() == "byteai" }

    var body: some View {
        NavigationStack {
            ZStack {
                Color.byteCard.ignoresSafeArea()
                ScrollView {
                    // Tight stack — no gradient banner, no negative-padding avatar overlap.
                    // Top-aligned content reads cleanly inside a medium detent.
                    VStack(alignment: .leading, spacing: 16) {
                        HStack(alignment: .top, spacing: 14) {
                            AvatarView(target.initials,
                                       variant: .cyan,
                                       size: .xl,
                                       imageUrl: resolvedAvatar,
                                       ownerUserId: target.userId)
                                .overlay(
                                    Circle().stroke(Color.byteAccent, lineWidth: 2)
                                        .padding(-2)
                                )
                            statRow
                        }

                        identitySection

                        if !target.tags.isEmpty {
                            tagsRow
                        }

                        actionsRow
                    }
                    .padding(.horizontal, 18)
                    .padding(.top, 16)
                    .padding(.bottom, 20)
                }
            }
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button { dismiss() } label: {
                        Image(systemName: "xmark.circle.fill")
                            .foregroundColor(.byteText3)
                    }
                }
            }
            .toolbarBackground(Color.byteCard, for: .navigationBar)
            .toolbarColorScheme(.dark, for: .navigationBar)
            .navigationDestination(isPresented: $pushFullProfile) {
                ProfileView(username: resolvedUsername)
            }
        }
        // Compact medium-only detent so the sheet hugs its content. Tall enough
        // for the iPhone 16 Pro Max layout, low enough that it feels "mini".
        .presentationDetents([.height(360), .large])
        .presentationDragIndicator(.visible)
        .task {
            do {
                let p = try await APIClient.shared.getProfileById(userId: target.userId)
                profile = p
                // Server-derived; nil → unknown (treat as not-following so the
                // CTA encourages action rather than silently mis-claiming follow).
                isFollowing = p.isFollowedByMe ?? false
            } catch {
                // Keep target fallbacks
            }
        }
    }

    // MARK: - Subviews

    private var statRow: some View {
        // Web parity: 3 stats (BYTES · FOLLOWERS · LEVEL). The mini profile
        // is a glanceable summary, not a full follow graph view; the FOLLOWING
        // count was iOS-only and dropped to match.
        HStack(spacing: 6) {
            stat("BYTES", resolvedBytes)
            stat("FOLLOWERS", resolvedFollowers)
            stat("LEVEL", resolvedLevel)
        }
    }

    private func stat(_ label: String, _ value: String) -> some View {
        VStack(spacing: 2) {
            Text(value)
                .font(.byteMono(13, weight: .bold))
                .foregroundColor(.byteText1)
            Text(label)
                .font(.byteMono(9, weight: .semibold))
                .tracking(0.6)
                .foregroundColor(.byteText2)
        }
        .frame(maxWidth: .infinity)
    }

    private var identitySection: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack(spacing: 6) {
                Text(resolvedDisplayName)
                    .font(.byteSans(15, weight: .bold))
                    .foregroundColor(.byteText1)
                if profile?.isVerified == true {
                    Image(systemName: "checkmark.seal.fill")
                        .font(.system(size: 12))
                        .foregroundColor(.byteAccent)
                }
            }
            Button { pushFullProfile = true } label: {
                Text("@\(resolvedUsername)")
                    .font(.byteTerminalSmall)
                    .foregroundColor(.byteAccent)
            }
            .buttonStyle(.plain)

            if !resolvedRole.isEmpty || !resolvedCompany.isEmpty {
                HStack(spacing: 6) {
                    Image(systemName: "briefcase").font(.system(size: 10)).foregroundColor(.byteText2)
                    let separator = (resolvedRole.isEmpty || resolvedCompany.isEmpty) ? "" : " @ "
                    Text("\(resolvedRole)\(separator)\(resolvedCompany)")
                        .font(.byteMono(10))
                        .foregroundColor(.byteText2)
                }
            }

            if let bio = profile?.bio, !bio.isEmpty {
                Text(bio)
                    .font(.byteSans(12))
                    .foregroundColor(.byteText2)
                    .lineLimit(3)
                    .padding(.leading, 10)
                    .overlay(
                        Rectangle().fill(Color.byteAccent).frame(width: 2),
                        alignment: .leading
                    )
            }
        }
    }

    private var tagsRow: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 6) {
                ForEach(target.tags.prefix(6), id: \.self) { tag in
                    Text("#\(tag)")
                        .font(.byteMono(10))
                        .foregroundColor(.byteText2)
                        .padding(.horizontal, 8).padding(.vertical, 3)
                        .background(IdentityColor.blue.bgFaint)
                        .overlay(Capsule().stroke(IdentityColor.blue.borderFaint, lineWidth: 1))
                        .clipShape(Capsule())
                }
            }
        }
    }

    private var actionsRow: some View {
        HStack(spacing: 10) {
            if isSystemAccount {
                Text("✦ OFFICIAL BYTEAI ACCOUNT")
                    .font(.byteMono(10, weight: .bold))
                    .tracking(0.6)
                    .foregroundColor(.bytePurple)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 12)
                    .background(IdentityColor.purple.bgFaint)
                    .overlay(RoundedRectangle(cornerRadius: 14).stroke(IdentityColor.purple.borderFaint, lineWidth: 1))
                    .clipShape(RoundedRectangle(cornerRadius: 14))
            } else {
                Button { Task { await toggleFollow() } } label: {
                    HStack(spacing: 6) {
                        if followLoading {
                            ProgressView().tint(.white).scaleEffect(0.7)
                        } else if isFollowing {
                            Image(systemName: "checkmark")
                            Text("FOLLOWING")
                        } else {
                            Image(systemName: "plus")
                            Text("FOLLOW")
                        }
                    }
                    .font(.byteMono(11, weight: .bold))
                    .tracking(0.6)
                    .foregroundColor(isFollowing ? .byteText1 : .white)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 12)
                    .background(
                        Group {
                            if isFollowing {
                                Color.byteElement
                            } else {
                                LinearGradient(colors: [.byteAccent, Color(hex: "#2563eb")],
                                               startPoint: .topLeading, endPoint: .bottomTrailing)
                            }
                        }
                    )
                    .overlay(
                        RoundedRectangle(cornerRadius: 14)
                            .stroke(isFollowing ? Color.byteBorderHigh : .clear, lineWidth: 1)
                    )
                    .clipShape(RoundedRectangle(cornerRadius: 14))
                }
                .buttonStyle(.plain)
                .disabled(followLoading || isOwnProfile)
                .opacity(isOwnProfile ? 0.4 : 1)
            }

            Button { pushFullProfile = true } label: {
                HStack(spacing: 6) {
                    Text("PROFILE")
                    Image(systemName: "arrow.up.right")
                }
                .font(.byteMono(11, weight: .bold))
                .tracking(0.6)
                .foregroundColor(.byteText1)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 12)
                .background(IdentityColor.blue.bgFaint)
                .overlay(RoundedRectangle(cornerRadius: 14).stroke(IdentityColor.blue.borderFaint, lineWidth: 1))
                .clipShape(RoundedRectangle(cornerRadius: 14))
            }
            .buttonStyle(.plain)
        }
    }

    private func toggleFollow() async {
        followLoading = true
        defer { followLoading = false }
        do {
            if isFollowing {
                try await APIClient.shared.unfollowUser(userId: target.userId)
                isFollowing = false
                ToastCenter.shared.show("Unfollowed @\(resolvedUsername)", kind: .success)
            } else {
                try await APIClient.shared.followUser(userId: target.userId)
                isFollowing = true
                ToastCenter.shared.show("Following @\(resolvedUsername)", kind: .success)
            }
        } catch {
            ToastCenter.shared.show("Action failed — try again", kind: .error)
        }
    }
}
