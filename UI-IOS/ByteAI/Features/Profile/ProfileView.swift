import SwiftUI

// MARK: - Profile View

enum ProfileTab: String, CaseIterable {
    case bytes = "BYTES"
    case interviews = "INTERVIEWS"
    case bookmarks = "BOOKMARKS"
}

struct ProfileView: View {
    let username: String
    @StateObject private var vm: ProfileViewModel
    @State private var selectedTab: ProfileTab = .bytes
    @State private var showEditProfile = false

    init(username: String = "") {
        self.username = username
        self._vm = StateObject(wrappedValue: ProfileViewModel(username: username))
    }

    var body: some View {
        NavigationStack {
            ZStack {
                Color.byteBackground.ignoresSafeArea()

                if vm.isLoading {
                    ByteSpinner(size: 32)
                } else if let user = vm.user {
                    ScrollView {
                        VStack(spacing: 0) {
                            ProfileHeader(user: user, vm: vm, onEditTap: { showEditProfile = true })
                            ProfileTabs(selected: $selectedTab)
                            ProfileTabContent(tab: selectedTab, vm: vm)
                        }
                    }
                } else {
                    EmptyStateView(icon: "person", title: "Profile not found", message: "")
                }
            }
            .navigationTitle("")
            .navigationBarTitleDisplayMode(.inline)
            .toolbarBackground(Color.byteBackground, for: .navigationBar)
            .toolbarColorScheme(.dark, for: .navigationBar)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    if vm.isOwnProfile {
                        Button { showEditProfile = true } label: {
                            Image(systemName: "pencil")
                                .font(.system(size: 15))
                                .foregroundColor(.byteText2)
                        }
                    }
                }
            }
            .sheet(isPresented: $showEditProfile) {
                if let user = vm.user {
                    EditProfileSheet(user: user) { updated in
                        vm.user = updated
                    }
                }
            }
        }
        .task { await vm.load() }
    }
}

// MARK: - Profile Header

private struct ProfileHeader: View {
    let user: User
    @ObservedObject var vm: ProfileViewModel
    let onEditTap: () -> Void

    var body: some View {
        VStack(spacing: 16) {
            ZStack(alignment: .bottomTrailing) {
                AvatarView(user: user, size: .xl)
                    .shadow(color: AvatarVariant(rawValue: user.avatarVariant)?.glowColor.opacity(0.5) ?? .clear, radius: 12)
                if user.isVerified {
                    Image(systemName: "checkmark.seal.fill")
                        .font(.system(size: 20))
                        .foregroundColor(.byteAccent)
                        .background(Circle().fill(Color.byteBackground).padding(-3))
                }
            }

            VStack(spacing: 4) {
                Text(user.displayName)
                    .font(.byteH2)
                    .foregroundColor(.byteText1)
                Text("@\(user.username)")
                    .font(.byteMonoSmall)
                    .foregroundColor(.byteText2)
                if !user.role.isEmpty || !user.company.isEmpty {
                    Text([user.role, user.company].filter { !$0.isEmpty }.joined(separator: " @ "))
                        .font(.byteMonoSmall)
                        .foregroundColor(.byteText3)
                }
            }

            XPBar(user: user)

            HStack(spacing: 0) {
                StatItem(label: "FOLLOWERS", value: user.followers)
                Divider().frame(height: 30).background(Color.byteBorderMedium)
                StatItem(label: "FOLLOWING", value: user.following)
                Divider().frame(height: 30).background(Color.byteBorderMedium)
                StatItem(label: "BYTES", value: user.bytes)
                Divider().frame(height: 30).background(Color.byteBorderMedium)
                StatItem(label: "REACTIONS", value: user.reactions)
            }
            .padding(.vertical, 12)
            .background(Color.byteCard)
            .cornerRadius(10)
            .overlay(RoundedRectangle(cornerRadius: 10).stroke(Color.byteBorderMedium, lineWidth: 1))

            if !user.bio.isEmpty {
                Text(user.bio)
                    .font(.byteBody)
                    .foregroundColor(.byteText2)
                    .multilineTextAlignment(.center)
            }

            if !user.techStack.isEmpty {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 6) {
                        ForEach(user.techStack, id: \.self) { TagView(label: $0, isSelected: true) }
                    }
                }
            }

            if !user.badges.isEmpty {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 10) {
                        ForEach(user.badges) { BadgePill(badge: $0) }
                    }
                }
            }

            if user.streak > 0 {
                HStack(spacing: 6) {
                    Text("🔥")
                    Text("\(user.streak)-day streak")
                        .font(.byteMonoSmall)
                        .foregroundColor(.byteOrange)
                }
            }

            if vm.isOwnProfile {
                ByteButton("Sign Out", icon: "rectangle.portrait.and.arrow.right", style: .outline) {
                    AuthManager.shared.signOut()
                }
            } else {
                ByteButton(
                    vm.isFollowing ? "Following" : "Follow",
                    icon: vm.isFollowing ? "checkmark" : "person.badge.plus",
                    style: vm.isFollowing ? .outline : .primary
                ) { Task { await vm.toggleFollow() } }
            }
        }
        .padding(16)
    }
}

// MARK: - XP Bar

private struct XPBar: View {
    let user: User
    var progress: Double {
        guard user.xpToNextLevel > 0 else { return 1 }
        return min(Double(user.xp) / Double(user.xpToNextLevel), 1)
    }
    var body: some View {
        VStack(spacing: 6) {
            HStack {
                Text("LVL \(user.level)")
                    .font(.byteMono(10, weight: .bold))
                    .foregroundColor(.byteAccent)
                Spacer()
                Text("\(user.xp) / \(user.xpToNextLevel) XP")
                    .font(.byteMonoTiny)
                    .foregroundColor(.byteText3)
            }
            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    RoundedRectangle(cornerRadius: 3).fill(Color.byteElement).frame(height: 6)
                    RoundedRectangle(cornerRadius: 3)
                        .fill(LinearGradient(colors: [.byteAccent, .byteCyan], startPoint: .leading, endPoint: .trailing))
                        .frame(width: geo.size.width * CGFloat(progress), height: 6)
                }
            }
            .frame(height: 6)
        }
    }
}

// MARK: - Stat Item

private struct StatItem: View {
    let label: String
    let value: Int
    var body: some View {
        VStack(spacing: 2) {
            Text(value >= 1000 ? String(format: "%.1fk", Double(value)/1000) : "\(value)")
                .font(.byteSans(16, weight: .bold)).foregroundColor(.byteText1)
            Text(label).font(.byteMonoTiny).foregroundColor(.byteText3).tracking(0.5)
        }
        .frame(maxWidth: .infinity)
    }
}

// MARK: - Badge Pill

private struct BadgePill: View {
    let badge: Badge
    var body: some View {
        HStack(spacing: 5) {
            Text(badge.icon).font(.system(size: 14))
            Text(badge.name).font(.byteMonoTiny).foregroundColor(badge.earned ? .byteText1 : .byteText3)
        }
        .padding(.horizontal, 10).padding(.vertical, 6)
        .background(
            RoundedRectangle(cornerRadius: 20)
                .fill(badge.earned ? Color.byteElement : Color.byteBackground)
                .overlay(RoundedRectangle(cornerRadius: 20).stroke(badge.earned ? Color.byteBorderHigh : Color.byteBorder, lineWidth: 1))
        )
        .opacity(badge.earned ? 1 : 0.5)
    }
}

// MARK: - Profile Tabs

private struct ProfileTabs: View {
    @Binding var selected: ProfileTab
    var body: some View {
        HStack(spacing: 0) {
            ForEach(ProfileTab.allCases, id: \.self) { tab in
                Button { withAnimation(.easeInOut(duration: 0.15)) { selected = tab } } label: {
                    VStack(spacing: 4) {
                        Text(tab.rawValue)
                            .font(.byteMono(10, weight: .semibold))
                            .foregroundColor(selected == tab ? .byteAccent : .byteText2)
                        Rectangle()
                            .fill(selected == tab ? Color.byteAccent : Color.clear)
                            .frame(height: 2)
                    }
                    .frame(maxWidth: .infinity).padding(.vertical, 10)
                }
            }
        }
        .background(Color.byteCard)
        .overlay(alignment: .bottom) { Rectangle().fill(Color.byteBorderMedium).frame(height: 1) }
    }
}

// MARK: - Profile Tab Content

private struct ProfileTabContent: View {
    let tab: ProfileTab
    @ObservedObject var vm: ProfileViewModel

    var body: some View {
        LazyVStack(spacing: 12) {
            switch tab {
            case .bytes:
                if vm.bytes.isEmpty {
                    EmptyStateView(icon: "bolt", title: "No bytes yet", message: "Start sharing your tech insights.")
                } else {
                    ForEach(vm.bytes) { post in
                        CollapsiblePostCard(post: post, isOwn: vm.isOwnProfile) {
                            vm.bytes.removeAll { $0.id == post.id }
                            Task { try? await APIClient.shared.deletePost(postId: post.id) }
                        }
                        .padding(.horizontal, 16)
                    }
                }
            case .interviews:
                if vm.interviews.isEmpty {
                    EmptyStateView(icon: "briefcase", title: "No interviews", message: "Share your interview experiences.")
                } else {
                    ForEach(vm.interviews) { iv in
                        InterviewPageCard(interview: iv).padding(.horizontal, 16)
                    }
                }
            case .bookmarks:
                if vm.bookmarks.isEmpty {
                    EmptyStateView(icon: "bookmark", title: "No bookmarks", message: "Save bytes to revisit them later.")
                } else {
                    ForEach(vm.bookmarks) { post in PostCardView(post: post).padding(.horizontal, 16) }
                }
            }
        }
        .padding(.vertical, 12)
    }
}

// MARK: - Collapsible Post Card (profile bytes)

private struct CollapsiblePostCard: View {
    let post: Post
    let isOwn: Bool
    let onDelete: () -> Void
    @State private var isExpanded = false

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            // Collapsed header — always visible
            Button { withAnimation(.spring(response: 0.35, dampingFraction: 0.85)) { isExpanded.toggle() } } label: {
                HStack(spacing: 12) {
                    VStack(alignment: .leading, spacing: 3) {
                        Text(post.title)
                            .font(.byteSans(14, weight: .semibold))
                            .foregroundColor(.byteText1)
                            .lineLimit(1)
                            .frame(maxWidth: .infinity, alignment: .leading)
                        Text(post.timestamp)
                            .font(.byteMonoTiny)
                            .foregroundColor(.byteText3)
                    }
                    HStack(spacing: 10) {
                        Label("\(post.likes)", systemImage: "heart").font(.byteMonoTiny).foregroundColor(.byteText3)
                        Label("\(post.comments)", systemImage: "bubble.left").font(.byteMonoTiny).foregroundColor(.byteText3)
                    }
                    Image(systemName: isExpanded ? "chevron.up" : "chevron.down")
                        .font(.system(size: 11))
                        .foregroundColor(.byteText3)
                }
                .padding(14)
            }
            .buttonStyle(.plain)

            if isExpanded {
                VStack(alignment: .leading, spacing: 12) {
                    Divider().background(Color.byteBorder)
                    Text(post.body)
                        .font(.byteBody).foregroundColor(.byteText2).lineSpacing(3)
                        .padding(.horizontal, 14)
                    if let code = post.code {
                        CodeBlockView(snippet: code).padding(.horizontal, 14)
                    }
                    if !post.tags.isEmpty {
                        ScrollView(.horizontal, showsIndicators: false) {
                            HStack(spacing: 6) { ForEach(post.tags, id: \.self) { TagView(label: $0) } }
                                .padding(.horizontal, 14)
                        }
                    }
                    if isOwn {
                        Divider().background(Color.byteBorder)
                        Button(role: .destructive) { onDelete() } label: {
                            HStack(spacing: 6) {
                                Image(systemName: "trash").font(.system(size: 13))
                                Text("Delete Byte").font(.byteMono(12, weight: .medium))
                            }
                            .foregroundColor(.byteRed)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 10)
                        }
                    }
                }
                .padding(.bottom, 14)
                .transition(.opacity.combined(with: .move(edge: .top)))
            }
        }
        .background(Color.byteCard)
        .cornerRadius(12)
        .overlay(RoundedRectangle(cornerRadius: 12).stroke(Color.byteBorderMedium, lineWidth: 1))
    }
}

// MARK: - Edit Profile Sheet

struct EditProfileSheet: View {
    @Environment(\.dismiss) private var dismiss
    @State private var displayName: String
    @State private var bio: String
    @State private var company: String
    @State private var roleTitle: String
    @State private var isLoading = false
    @State private var error: String?
    let onSave: (User) -> Void

    init(user: User, onSave: @escaping (User) -> Void) {
        self._displayName = State(initialValue: user.displayName)
        self._bio = State(initialValue: user.bio)
        self._company = State(initialValue: user.company)
        self._roleTitle = State(initialValue: user.role)
        self.onSave = onSave
    }

    var body: some View {
        NavigationStack {
            ZStack {
                Color.byteBackground.ignoresSafeArea()
                ScrollView {
                    VStack(spacing: 16) {
                        ByteTextField(placeholder: "Display name", text: $displayName, icon: "person")
                        ByteTextField(placeholder: "Company", text: $company, icon: "building.2")
                        ByteTextField(placeholder: "Role (e.g. Senior Engineer)", text: $roleTitle, icon: "briefcase")
                        VStack(alignment: .leading, spacing: 6) {
                            Text("BIO").font(.byteMono(10)).foregroundColor(.byteText3)
                            TextField("Tell the world about yourself...", text: $bio, axis: .vertical)
                                .font(.byteBody).foregroundColor(.byteText1)
                                .lineLimit(3...6)
                                .padding(12)
                                .background(Color.byteElement)
                                .cornerRadius(8)
                                .overlay(RoundedRectangle(cornerRadius: 8).stroke(Color.byteBorderMedium, lineWidth: 1))
                        }
                        if let error { Text(error).font(.byteSmall).foregroundColor(.byteRed) }
                        ByteButton("Save Changes", icon: "checkmark", isLoading: isLoading) {
                            Task {
                                isLoading = true
                                defer { isLoading = false }
                                do {
                                    let updated = try await APIClient.shared.updateProfile(
                                        displayName: displayName.isEmpty ? nil : displayName,
                                        bio: bio.isEmpty ? nil : bio,
                                        company: company.isEmpty ? nil : company,
                                        roleTitle: roleTitle.isEmpty ? nil : roleTitle,
                                        techStack: nil
                                    )
                                    onSave(updated)
                                    dismiss()
                                } catch {
                                    self.error = error.localizedDescription
                                }
                            }
                        }
                    }
                    .padding(20)
                }
            }
            .navigationTitle("Edit Profile")
            .navigationBarTitleDisplayMode(.inline)
            .toolbarBackground(Color.byteBackground, for: .navigationBar)
            .toolbarColorScheme(.dark, for: .navigationBar)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") { dismiss() }.foregroundColor(.byteText2)
                }
            }
        }
    }
}

// MARK: - ViewModel

@MainActor
final class ProfileViewModel: ObservableObject {
    let username: String
    @Published var user: User?
    @Published var bytes: [Post] = []
    @Published var interviews: [Interview] = []
    @Published var bookmarks: [Post] = []
    @Published var isLoading = false
    @Published var isFollowing = false

    var isOwnProfile: Bool {
        guard let me = AuthManager.shared.currentUser, let u = user else { return false }
        return me.id == u.id || me.username == u.username
    }

    init(username: String) { self.username = username }

    func load() async {
        isLoading = true
        defer { isLoading = false }

        // Determine if viewing own profile
        let targetUsername = username.isEmpty ? (AuthManager.shared.currentUser?.username ?? "") : username
        guard !targetUsername.isEmpty else { return }

        do {
            user = try await APIClient.shared.getProfile(username: targetUsername)
        } catch {
            user = try? await APIClient.shared.getMe()
        }

        if isOwnProfile {
            async let b = APIClient.shared.getMyBytes()
            async let iv = APIClient.shared.getMyInterviews()
            async let bk = APIClient.shared.getMyBookmarks()
            bytes     = (try? await b)  ?? []
            interviews = (try? await iv) ?? []
            bookmarks  = (try? await bk) ?? []
        } else if let uid = user?.id {
            bytes = (try? await APIClient.shared.getFeed()) ?? []
            interviews = (try? await APIClient.shared.getInterviews()) ?? []
            _ = uid
        }
    }

    func toggleFollow() async {
        isFollowing.toggle()
        if isFollowing {
            try? await APIClient.shared.followUser(userId: user?.id ?? "")
        } else {
            try? await APIClient.shared.unfollowUser(userId: user?.id ?? "")
        }
    }
}

#Preview {
    ProfileView()
}
