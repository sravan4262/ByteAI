import SwiftUI
import PhotosUI

// MARK: - Profile View

enum ProfileTab: String, CaseIterable {
    case profile    = "PROFILE"
    case bytes      = "BYTES"
    case interviews = "INTERVIEWS"
    case prefs      = "PREFS"
    case alerts     = "ALERTS"
}

enum BytesSubTab: String, CaseIterable {
    case posted = "POSTED"
    case saved  = "SAVED"
    case drafts = "DRAFTS"
}

enum InterviewsSubTab: String, CaseIterable {
    case posted = "POSTED"
    case saved  = "SAVED"
}

struct ProfileView: View {
    let username: String
    @StateObject private var vm: ProfileViewModel
    @State private var selectedTab: ProfileTab = .profile
    @State private var showSupportFloat = false
    @State private var showChatFloat = false
    @State private var showEditProfile = false
    @State private var chatTerminalConversation: ConversationDto?
    @EnvironmentObject private var flags: FeatureFlagsManager
    @EnvironmentObject private var chat: ChatService

    init(username: String = "") {
        self.username = username
        self._vm = StateObject(wrappedValue: ProfileViewModel(username: username))
    }

    private var visibleTabs: [ProfileTab] {
        vm.isOwnProfile ? ProfileTab.allCases : [.bytes, .interviews]
    }

    var body: some View {
        NavigationStack {
            ZStack {
                Color.byteBackground.ignoresSafeArea()

                if vm.isLoading {
                    ScrollView {
                        VStack(spacing: 16) {
                            VStack(spacing: 12) {
                                Circle().fill(Color.byteElement).frame(width: 80, height: 80)
                                SkeletonView().frame(width: 160, height: 18)
                                SkeletonView().frame(width: 100, height: 12)
                            }
                            .padding(.top, 24)
                            ForEach(0..<3, id: \.self) { _ in
                                PostCardSkeleton().padding(.horizontal, 16)
                            }
                        }
                        .padding(.vertical, 12)
                    }
                    .redacted(reason: .placeholder)
                    .accessibilityHidden(true)
                } else if let user = vm.user {
                    VStack(spacing: 0) {
                        ProfileTabs(selected: $selectedTab, tabs: visibleTabs)
                        ScrollView {
                            ProfileTabContent(tab: selectedTab, user: user, vm: vm)
                                .padding(.vertical, 12)
                        }
                        .refreshable { await vm.load() }
                        .scrollDismissesKeyboard(.interactively)
                    }
                    .onAppear {
                        if !vm.isOwnProfile && (selectedTab == .prefs || selectedTab == .alerts) {
                            selectedTab = .bytes
                        }
                    }
                } else {
                    EmptyStateView(icon: "person", title: "Profile not found", message: "")
                }

                // Floating action buttons — own profile only
                if vm.isOwnProfile {
                    VStack(spacing: 10) {
                        ProfileFAB(icon: "terminal", badge: 0) { showSupportFloat = true }
                        if flags.isEnabled("chat") {
                            ProfileFAB(icon: "bubble.left.and.bubble.right", badge: chat.unreadCount) { showChatFloat = true }
                        }
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .bottomTrailing)
                    .padding(.trailing, 16)
                    .padding(.bottom, 20)
                    .allowsHitTesting(true)
                }
            }
            .navigationTitle(vm.user.map { "\($0.displayName)" } ?? "Profile")
            .navigationBarTitleDisplayMode(.inline)
            .toolbarBackground(Color.byteBackground, for: .navigationBar)
            .toolbarColorScheme(.dark, for: .navigationBar)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    if vm.isOwnProfile {
                        HStack(spacing: 14) {
                            Button {
                                showEditProfile = true
                            } label: {
                                Image(systemName: "pencil")
                                    .font(.system(size: 15, weight: .semibold))
                                    .foregroundColor(.byteAccent)
                            }
                            .accessibilityLabel("Edit profile")

                            Button {
                                Task { await AuthManager.shared.signOut() }
                            } label: {
                                Image(systemName: "rectangle.portrait.and.arrow.right")
                                    .font(.system(size: 15))
                                    .foregroundColor(.byteText2)
                            }
                            .accessibilityLabel("Sign out")
                        }
                    }
                }
            }
            .sheet(isPresented: $showEditProfile) {
                if let user = vm.user {
                    EditProfileSheet(user: user) { updated in vm.user = updated }
                }
            }
            .sheet(isPresented: $showSupportFloat) {
                SupportTerminalView()
                    .presentationDetents([.large])
                    .presentationDragIndicator(.visible)
            }
            .sheet(isPresented: $showChatFloat) {
                ChatTerminalSheet { convo in
                    showChatFloat = false
                    chatTerminalConversation = convo
                }
                .environmentObject(chat)
                .presentationDetents([.large])
                .presentationDragIndicator(.visible)
            }
            .navigationDestination(item: $chatTerminalConversation) { convo in
                ChatThreadView(conversation: convo)
            }
            .sheet(item: $vm.followersListMode) { mode in
                if let userId = vm.user?.id {
                    FollowersListSheet(userId: userId, mode: mode)
                        .presentationDetents([.large])
                }
            }
        }
        .task { await vm.load() }
    }
}

private struct ChatToolbarButton: View {
    let unreadCount: Int
    @State private var showConversations = false

    var body: some View {
        Button { showConversations = true } label: {
            ZStack(alignment: .topTrailing) {
                Image(systemName: "bubble.left.and.bubble.right")
                    .font(.system(size: 16))
                    .foregroundColor(.byteText2)
                if unreadCount > 0 {
                    Circle()
                        .fill(Color.byteRed)
                        .frame(width: 8, height: 8)
                        .offset(x: 4, y: -2)
                }
            }
        }
        .accessibilityLabel("Messages")
        .sheet(isPresented: $showConversations) { ConversationsView() }
    }
}

// MARK: - Profile Floating Action Button
// Matches web app-shell fixed bottom-right circular buttons (chat + terminal/support).

private struct ProfileFAB: View {
    let icon: String
    let badge: Int
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            ZStack(alignment: .topTrailing) {
                Image(systemName: icon)
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundColor(.byteText2)
                    .frame(width: 40, height: 40)
                    .background(Circle().fill(Color.byteCard))
                    .overlay(Circle().stroke(Color.byteGreen.opacity(0.25), lineWidth: 1))
                    .shadow(color: Color.byteGreen.opacity(0.15), radius: 6)

                if badge > 0 {
                    Circle()
                        .fill(Color.byteGreen)
                        .frame(width: 8, height: 8)
                        .shadow(color: Color.byteGreen.opacity(0.8), radius: 4)
                        .offset(x: 2, y: -2)
                }
            }
        }
        .buttonStyle(.plain)
    }
}

// MARK: - Profile Info Tab (PROFILE tab content for own and public profiles)

private struct ProfileInfoTab: View {
    let user: User
    @ObservedObject var vm: ProfileViewModel
    @State private var pickedItem: PhotosPickerItem?
    @State private var isUploadingAvatar = false

    var body: some View {
        VStack(spacing: 16) {
            ZStack(alignment: .bottomTrailing) {
                if vm.isOwnProfile {
                    PhotosPicker(selection: $pickedItem, matching: .images, photoLibrary: .shared()) {
                        avatarStack
                    }
                    .accessibilityLabel("Change profile picture")
                } else {
                    avatarStack
                }
                if user.isVerified {
                    Image(systemName: "checkmark.seal.fill")
                        .font(.system(size: 20))
                        .foregroundColor(.byteAccent)
                        .background(Circle().fill(Color.byteBackground).padding(-3))
                }
            }
            .onChange(of: pickedItem) { _, item in
                Task { await uploadAvatar(item) }
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
                        .foregroundColor(.byteText2)
                }
            }

            if !user.bio.isEmpty {
                VStack(alignment: .leading, spacing: 2) {
                    Text("/*").font(.byteMono(10)).foregroundColor(.byteText3)
                    Text(user.bio)
                        .font(.byteBody)
                        .foregroundColor(.byteText2)
                        .fixedSize(horizontal: false, vertical: true)
                    Text("*/").font(.byteMono(10)).foregroundColor(.byteText3)
                }
                .padding(10)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(Color.byteCard)
                .overlay(RoundedRectangle(cornerRadius: 10).stroke(Color.byteBorderHigh, lineWidth: 1))
                .clipShape(RoundedRectangle(cornerRadius: 10))
            }

            XPBar(user: user)

            HStack(spacing: 0) {
                StatItem(label: "FOLLOWING", value: user.following) { vm.followersListMode = .following }
                Divider().frame(height: 30).background(Color.byteBorderMedium)
                StatItem(label: "FOLLOWERS", value: user.followers) { vm.followersListMode = .followers }
                Divider().frame(height: 30).background(Color.byteBorderMedium)
                StreakStatItem(streak: user.streak)
            }
            .padding(.vertical, 12)
            .background(Color.byteCard)
            .cornerRadius(10)
            .overlay(RoundedRectangle(cornerRadius: 10).stroke(Color.byteBorderMedium, lineWidth: 1))

            if !user.techStack.isEmpty {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 6) {
                        ForEach(user.techStack, id: \.self) { TagView(label: $0, isSelected: true) }
                    }
                }
            }

            BadgesSection(
                earnedNames: Set(user.badges.map { $0.name.lowercased() }),
                catalog: vm.badgeCatalog
            )

            if !user.links.isEmpty {
                SocialLinksRow(links: user.links)
            }

            if !vm.isOwnProfile {
                ByteButton(
                    vm.isFollowing ? "Following" : "Follow",
                    icon: vm.isFollowing ? "checkmark" : "person.badge.plus",
                    style: vm.isFollowing ? .outline : .primary
                ) { Task { await vm.toggleFollow() } }
            }
        }
        .padding(16)
    }

    private var avatarStack: some View {
        ZStack {
            AvatarView(user: user, size: .xl)
                .shadow(color: AvatarVariant(rawValue: user.avatarVariant)?.glowColor.opacity(0.5) ?? .clear, radius: 12)
                .opacity(isUploadingAvatar ? 0.5 : 1)
            if isUploadingAvatar {
                ByteSpinner(size: 28)
            }
            if vm.isOwnProfile && !isUploadingAvatar {
                Image(systemName: "camera.fill")
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundColor(.white)
                    .padding(8)
                    .background(Circle().fill(Color.byteAccent))
                    .offset(x: 26, y: 26)
            }
        }
    }

    private func uploadAvatar(_ item: PhotosPickerItem?) async {
        guard let item, let data = try? await item.loadTransferable(type: Data.self) else { return }
        isUploadingAvatar = true
        defer { isUploadingAvatar = false }
        do {
            let url = try await APIClient.shared.uploadAvatar(data)
            if var updated = vm.user {
                updated.avatarUrl = url
                vm.user = updated
            }
            ToastCenter.shared.show("Avatar updated", kind: .success)
        } catch {
            ToastCenter.shared.show("Couldn't upload avatar", kind: .error)
        }
    }
}

// MARK: - Profile Prefs Tab (PREFS tab — tech stack, theme, danger zone)

private struct ProfilePrefsTab: View {
    @ObservedObject var vm: ProfileViewModel
    @StateObject private var prefsVm = PreferencesViewModel()
    @ObservedObject private var themeManager = ThemeManager.shared
    @State private var showDeleteAccount = false
    @State private var availableTechStacks: [TechStack] = []

    var body: some View {
        Group {
            if prefsVm.isLoading {
                ByteSpinner().padding(.top, 40)
            } else {
                VStack(alignment: .leading, spacing: 22) {
                    techStackSection
                    themeSection
                    dangerZoneSection
                }
                .padding(.horizontal, 16)
            }
        }
        .task {
            await prefsVm.load()
            if availableTechStacks.isEmpty {
                availableTechStacks = (try? await APIClient.shared.getTechStacks()) ?? []
            }
        }
        .sheet(isPresented: $showDeleteAccount) { DeleteAccountSheet() }
    }

    // MARK: Tech Stack Section

    private var techStackSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            AccentBarHeader(label: "TECH_STACK", size: .compact)
            StackPicker(
                values: Binding(
                    get: { vm.user?.techStack ?? [] },
                    set: { newStack in
                        vm.user?.techStack = newStack
                        Task { _ = try? await APIClient.shared.updateProfile(techStack: newStack) }
                    }
                ),
                options: availableTechStacks.map { $0.label }
            )
        }
    }

    // MARK: Theme Section

    private var themeSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            AccentBarHeader(label: "THEME", size: .compact)
            HStack(spacing: 8) {
                ForEach(AppTheme.allCases, id: \.rawValue) { theme in
                    let isActive = themeManager.current == theme
                    Button { Task { await selectTheme(theme) } } label: {
                        VStack(spacing: 5) {
                            RoundedRectangle(cornerRadius: 6)
                                .fill(Color(hex: theme.swatchHex))
                                .frame(width: 32, height: 24)
                                .overlay(RoundedRectangle(cornerRadius: 6).stroke(Color.byteBorderHigh, lineWidth: 1))
                            Text(theme.displayName)
                                .font(.byteMono(10, weight: isActive ? .bold : .regular))
                                .foregroundColor(isActive ? .byteAccent : .byteText2)
                        }
                        .padding(10)
                        .background(Color.byteCard)
                        .overlay(RoundedRectangle(cornerRadius: 12).stroke(
                            isActive ? Color.byteAccent : Color.byteBorderMedium,
                            lineWidth: isActive ? 1.5 : 1
                        ))
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                    }
                    .buttonStyle(.plain)
                }
                Spacer()
            }
        }
    }

    // MARK: Danger Zone Section

    private var dangerZoneSection: some View {
        VStack(spacing: 0) {
            HStack(spacing: 8) {
                Image(systemName: "trash").font(.system(size: 11, weight: .semibold)).foregroundColor(.byteRed)
                Text("DANGER_ZONE")
                    .font(.byteMono(11, weight: .bold))
                    .foregroundColor(.byteRed)
                    .tracking(0.8)
            }
            .padding(.horizontal, 16).padding(.vertical, 12)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Color.byteRed.opacity(0.05))
            .overlay(alignment: .bottom) {
                Rectangle().fill(Color.byteRed.opacity(0.15)).frame(height: 1)
            }

            VStack(alignment: .leading, spacing: 12) {
                Text("Permanently delete your account, all bytes, interviews, comments, follows, and chat history. This cannot be undone.")
                    .font(.byteMono(11))
                    .foregroundColor(.byteText2)
                    .fixedSize(horizontal: false, vertical: true)

                Button { showDeleteAccount = true } label: {
                    HStack(spacing: 6) {
                        Image(systemName: "trash").font(.system(size: 11))
                        Text("DELETE ACCOUNT").font(.byteMono(11, weight: .bold)).tracking(0.5)
                    }
                    .foregroundColor(.byteRed)
                    .padding(.horizontal, 12).padding(.vertical, 8)
                    .background(Color.byteRed.opacity(0.07))
                    .overlay(RoundedRectangle(cornerRadius: 8).stroke(Color.byteRed.opacity(0.4), lineWidth: 1))
                    .clipShape(RoundedRectangle(cornerRadius: 8))
                }
                .buttonStyle(.plain)
            }
            .padding(16)
        }
        .background(Color.byteCard)
        .overlay(RoundedRectangle(cornerRadius: 12).stroke(Color.byteRed.opacity(0.25), lineWidth: 1))
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }

    private func selectTheme(_ theme: AppTheme) async {
        ThemeManager.shared.set(theme)
        prefsVm.prefs.theme = theme.rawValue
        _ = await prefsVm.save()
    }
}

// MARK: - Tech Stack Picker Sheet

private struct TechPickerSheet: View {
    let selected: [String]
    let options: [TechStack]
    let onSelect: (String) -> Void
    @Environment(\.dismiss) private var dismiss
    @State private var query = ""

    private var filtered: [TechStack] {
        let q = query.lowercased()
        let available = options.filter { !selected.contains($0.name) }
        return q.isEmpty ? available : available.filter {
            $0.name.lowercased().contains(q) || $0.label.lowercased().contains(q)
        }
    }

    var body: some View {
        NavigationStack {
            ZStack {
                Color.byteBackground.ignoresSafeArea()
                VStack(spacing: 0) {
                    ByteTextField(placeholder: "SEARCH TECH STACK", text: $query, icon: "magnifyingglass")
                        .padding(16)
                    if filtered.isEmpty {
                        Spacer()
                        Text(query.isEmpty ? "All tech stacks already added" : "No results")
                            .font(.byteMono(12))
                            .foregroundColor(.byteText3)
                        Spacer()
                    } else {
                        List(filtered) { stack in
                            Button {
                                onSelect(stack.name)
                                dismiss()
                            } label: {
                                HStack {
                                    Text(stack.label)
                                        .font(.byteSans(14))
                                        .foregroundColor(.byteText1)
                                    Spacer()
                                    Text(stack.name)
                                        .font(.byteMono(11))
                                        .foregroundColor(.byteText3)
                                }
                                .contentShape(Rectangle())
                            }
                            .buttonStyle(.plain)
                            .listRowBackground(Color.byteCard)
                            .listRowSeparatorTint(Color.byteBorder)
                        }
                        .listStyle(.plain)
                        .scrollContentBackground(.hidden)
                    }
                }
            }
            .navigationTitle("Add Tech Stack")
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

// MARK: - Profile Alerts Tab (ALERTS tab — notification preference toggles)

private struct ProfileAlertsTab: View {
    @StateObject private var prefsVm = PreferencesViewModel()

    private struct AlertItem {
        let icon: String
        let label: String
        let subtitle: String
        let keyPath: WritableKeyPath<UserPreferences, Bool>
    }

    private let items: [AlertItem] = [
        AlertItem(icon: "💡", label: "Reactions",    subtitle: "When someone reacts to your bytes",  keyPath: \.notifReactions),
        AlertItem(icon: "💬", label: "Comments",     subtitle: "When someone replies to your byte",  keyPath: \.notifComments),
        AlertItem(icon: "👤", label: "New Followers", subtitle: "When someone follows you",           keyPath: \.notifFollowers),
        AlertItem(icon: "👻", label: "Unfollows",    subtitle: "When someone unfollows you",         keyPath: \.notifUnfollows),
    ]

    var body: some View {
        Group {
            if prefsVm.isLoading {
                ByteSpinner().padding(.top, 40)
            } else {
                VStack(alignment: .leading, spacing: 12) {
                    AccentBarHeader(label: "NOTIFICATIONS", size: .compact)
                    VStack(spacing: 0) {
                        ForEach(Array(items.enumerated()), id: \.offset) { idx, item in
                            HStack(spacing: 12) {
                                Text(item.icon)
                                    .font(.system(size: 18))
                                    .frame(width: 24, alignment: .center)
                                VStack(alignment: .leading, spacing: 2) {
                                    Text(item.label)
                                        .font(.byteMono(12))
                                        .foregroundColor(.byteText1)
                                    Text(item.subtitle)
                                        .font(.byteMono(10))
                                        .foregroundColor(.byteText2)
                                }
                                Spacer()
                                Toggle("", isOn: Binding(
                                    get: { prefsVm.prefs[keyPath: item.keyPath] },
                                    set: { newVal in
                                        prefsVm.prefs[keyPath: item.keyPath] = newVal
                                        Task { _ = await prefsVm.save() }
                                    }
                                ))
                                .labelsHidden()
                                .tint(.byteAccent)
                            }
                            .padding(.horizontal, 16)
                            .padding(.vertical, 14)
                            if idx < items.count - 1 {
                                Divider()
                                    .background(Color.byteBorderHigh.opacity(0.5))
                            }
                        }
                    }
                    .background(Color.byteCard)
                    .overlay(RoundedRectangle(cornerRadius: 12).stroke(Color.byteBorderHigh, lineWidth: 1))
                    .clipShape(RoundedRectangle(cornerRadius: 12))
                }
                .padding(.horizontal, 16)
            }
        }
        .task { await prefsVm.load() }
    }
}

// MARK: - XP Bar
// Mirrors the level-meta XP card in UI/components/features/profile/profile-screen.tsx.
// Shows tier icon + name, "NEXT UP" preview, and a cyan-shimmer progress bar.

private struct LevelMeta {
    let level: Int
    let name: String
    let icon: String
    let xpRequired: Int

    static let all: [LevelMeta] = [
        .init(level: 1,  name: "NEWCOMER",    icon: "🌱", xpRequired: 0),
        .init(level: 2,  name: "EXPLORER",    icon: "🔭", xpRequired: 500),
        .init(level: 3,  name: "CONTRIBUTOR", icon: "⚙️",  xpRequired: 1500),
        .init(level: 4,  name: "BUILDER",     icon: "🔨", xpRequired: 3000),
        .init(level: 5,  name: "CRAFTSMAN",   icon: "🛠️",  xpRequired: 5000),
        .init(level: 6,  name: "SPECIALIST",  icon: "🎯", xpRequired: 8000),
        .init(level: 7,  name: "EXPERT",      icon: "🧠", xpRequired: 12000),
        .init(level: 8,  name: "MENTOR",      icon: "📚", xpRequired: 18000),
        .init(level: 9,  name: "AUTHORITY",   icon: "🏆", xpRequired: 25000),
        .init(level: 10, name: "LEGEND",      icon: "⭐", xpRequired: 35000),
        .init(level: 11, name: "GRANDMASTER", icon: "👑", xpRequired: 50000),
        .init(level: 12, name: "PIONEER",     icon: "🚀", xpRequired: 75000),
    ]

    static func current(for level: Int) -> LevelMeta {
        all.first(where: { $0.level == level }) ?? all[0]
    }

    static func next(after level: Int) -> LevelMeta? {
        all.first(where: { $0.level == level + 1 })
    }
}

private struct XPBar: View {
    let user: User
    @State private var glowPulse = false
    @State private var barPulse = false

    private var current: LevelMeta { LevelMeta.current(for: user.level) }
    private var next: LevelMeta? { LevelMeta.next(after: user.level) }

    private var pct: Double {
        guard let nxt = next else { return 1 }
        let inLvl = max(0, user.xp - current.xpRequired)
        let needed = max(1, nxt.xpRequired - current.xpRequired)
        return min(1.0, Double(inLvl) / Double(needed))
    }

    private var xpToGo: Int {
        guard let nxt = next else { return 0 }
        return max(0, nxt.xpRequired - user.xp)
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(alignment: .top, spacing: 10) {
                Text(current.icon)
                    .font(.system(size: 22))
                    .frame(width: 36, height: 36)
                    .background(Color.byteCyan.opacity(0.12))
                    .overlay(RoundedRectangle(cornerRadius: 8).stroke(Color.byteCyan.opacity(glowPulse ? 0.55 : 0.25), lineWidth: 1))
                    .clipShape(RoundedRectangle(cornerRadius: 8))
                    .shadow(color: Color.byteCyan.opacity(glowPulse ? 0.55 : 0.20), radius: glowPulse ? 14 : 8)

                VStack(alignment: .leading, spacing: 3) {
                    Text("LVL \(user.level) · \(current.name)")
                        .font(.byteMono(11, weight: .bold))
                        .tracking(1.0)
                        .foregroundColor(.byteCyan)
                    Text("\(numberFormatted(user.xp)) XP earned")
                        .font(.byteMono(10))
                        .foregroundColor(.byteText2)
                }

                Spacer(minLength: 8)

                if let nxt = next {
                    VStack(alignment: .trailing, spacing: 2) {
                        Text("NEXT UP")
                            .font(.byteMono(9))
                            .tracking(0.5)
                            .foregroundColor(.byteText2)
                        HStack(spacing: 4) {
                            Text(nxt.icon).font(.system(size: 13))
                            Text(nxt.name)
                                .font(.byteMono(10, weight: .bold))
                                .tracking(0.5)
                                .foregroundColor(.byteText1)
                        }
                    }
                }
            }

            ZStack(alignment: .leading) {
                Capsule()
                    .fill(Color.byteBorderMedium.opacity(0.4))
                    .frame(height: 8)
                    .overlay(Capsule().stroke(Color.byteBorderHigh, lineWidth: 1))
                GeometryReader { geo in
                    Capsule()
                        .fill(LinearGradient(
                            colors: [Color.byteAccent, Color.byteCyan, Color.byteAccent],
                            startPoint: .leading, endPoint: .trailing
                        ))
                        .frame(width: geo.size.width * CGFloat(pct), height: 8)
                        .shadow(color: Color.byteCyan.opacity(barPulse ? 0.85 : 0.45), radius: barPulse ? 12 : 6)
                }
                .frame(height: 8)
            }
            .frame(height: 8)

            HStack {
                Text("\(Int(round(pct * 100)))%")
                    .font(.byteMono(11, weight: .bold))
                    .foregroundColor(.byteCyan)
                Spacer()
                if next != nil {
                    Text("\(numberFormatted(xpToGo)) XP to go")
                        .font(.byteMono(10))
                        .foregroundColor(.byteText2)
                } else {
                    Text("MAX LEVEL ✦")
                        .font(.byteMono(10, weight: .bold))
                        .foregroundColor(.byteCyan)
                }
            }
        }
        .padding(14)
        .background(Color.byteCard)
        .overlay(RoundedRectangle(cornerRadius: 12).stroke(Color.byteCyan.opacity(glowPulse ? 0.45 : 0.12), lineWidth: 1))
        .shadow(color: Color.byteCyan.opacity(glowPulse ? 0.25 : 0.08), radius: glowPulse ? 18 : 8)
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .onAppear {
            withAnimation(.easeInOut(duration: 2.2).repeatForever(autoreverses: true)) { glowPulse = true }
            withAnimation(.easeInOut(duration: 1.6).repeatForever(autoreverses: true).delay(0.3)) { barPulse = true }
        }
    }

    private func numberFormatted(_ n: Int) -> String {
        let f = NumberFormatter()
        f.groupingSeparator = ","
        f.numberStyle = .decimal
        return f.string(from: NSNumber(value: n)) ?? "\(n)"
    }
}

// MARK: - Stat Item

private struct StatItem: View {
    let label: String
    let value: Int
    var onTap: (() -> Void)? = nil

    var body: some View {
        Group {
            if let onTap {
                Button(action: onTap) { content }
                    .buttonStyle(.plain)
            } else {
                content
            }
        }
        .frame(maxWidth: .infinity)
    }

    private var content: some View {
        VStack(spacing: 2) {
            Text(value >= 1000 ? String(format: "%.1fk", Double(value)/1000) : "\(value)")
                .font(.byteSans(16, weight: .bold)).foregroundColor(.byteText1)
            Text(label).font(.byteMonoTiny).foregroundColor(.byteText2).tracking(0.5)
        }
        .contentShape(Rectangle())
    }
}

// MARK: - Streak Stat Item

private struct StreakStatItem: View {
    let streak: Int

    var body: some View {
        VStack(spacing: 2) {
            HStack(spacing: 3) {
                Text("🔥").font(.system(size: 14))
                Text("\(streak)")
                    .font(.byteSans(16, weight: .bold))
                    .foregroundColor(.byteGreen)
            }
            Text("STREAK").font(.byteMonoTiny).foregroundColor(.byteText2).tracking(0.5)
        }
        .frame(maxWidth: .infinity)
        .background(
            LinearGradient(
                colors: [Color.byteGreen.opacity(0.06), .clear],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
        )
    }
}

// MARK: - Badges Section (earned + locked-readable)

private struct BadgesSection: View {
    let earnedNames: Set<String>
    let catalog: [BadgeType]
    @State private var selected: BadgeDetail?

    private var earnedCount: Int { catalog.filter { earnedNames.contains($0.name.lowercased()) }.count }
    private var firstLockedIdx: Int? { catalog.firstIndex(where: { !earnedNames.contains($0.name.lowercased()) }) }

    var body: some View {
        if catalog.isEmpty && earnedNames.isEmpty {
            EmptyView()
        } else {
            VStack(alignment: .leading, spacing: 10) {
                HStack {
                    HStack(spacing: 6) {
                        Capsule().fill(IdentityColor.blue.solid).frame(width: 3, height: 14)
                        Text("BADGES")
                            .font(.byteMono(11, weight: .bold))
                            .foregroundColor(.byteText1)
                            .tracking(0.8)
                    }
                    Spacer()
                    Text("\(earnedCount)/\(catalog.count) UNLOCKED")
                        .font(.byteMono(10))
                        .foregroundColor(.byteText2)
                }
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 10) {
                        ForEach(Array(catalog.enumerated()), id: \.element.id) { idx, type in
                            let earned = earnedNames.contains(type.name.lowercased())
                            let isNext = firstLockedIdx == idx
                            BadgeCard(
                                type: type,
                                earned: earned,
                                isNext: isNext,
                                index: idx
                            ) {
                                selected = BadgeDetail(type: type, earned: earned)
                            }
                        }
                    }
                    .padding(.vertical, 4)
                }
            }
            .sheet(item: $selected) { detail in
                BadgeDetailSheet(detail: detail)
                    .presentationDetents([.fraction(0.4), .medium])
            }
        }
    }

    struct BadgeDetail: Identifiable {
        let type: BadgeType
        let earned: Bool
        var id: String { type.id }
    }
}

// MARK: - Badge Card (mirrors web BadgeCard with spring-in, float, shine animations)

private struct BadgeCard: View {
    let type: BadgeType
    let earned: Bool
    let isNext: Bool
    let index: Int
    let onTap: () -> Void

    @State private var appeared = false
    @State private var floatY: CGFloat = 0
    @State private var shineX: CGFloat = -80
    @State private var glowPulse = false

    private static let gold = Color(red: 251/255, green: 191/255, blue: 36/255)

    var body: some View {
        Button(action: onTap) {
            ZStack(alignment: .leading) {
                VStack(spacing: 6) {
                    // Icon
                    ZStack {
                        if earned {
                            Text(type.icon).font(.system(size: 26)).frame(height: 30)
                        } else {
                            ZStack {
                                Text(type.icon)
                                    .font(.system(size: 26))
                                    .opacity(0.20)
                                    .blur(radius: 1)
                                Circle()
                                    .fill(Color.byteElement)
                                    .overlay(Circle().stroke(Color.byteBorderMedium, lineWidth: 1))
                                    .frame(width: 20, height: 20)
                                    .overlay(
                                        Image(systemName: "lock.fill")
                                            .font(.system(size: 9))
                                            .foregroundColor(.byteText3)
                                    )
                            }
                            .frame(height: 30)
                        }
                    }

                    Text(earned ? type.name : isNext ? type.label : "???")
                        .font(.byteMono(10, weight: .semibold))
                        .foregroundColor(earned ? Self.gold.opacity(0.85) : isNext ? .byteCyan : .byteText2)
                        .multilineTextAlignment(.center)
                        .lineLimit(2)
                        .frame(minWidth: 60)

                    Text(earned ? "✓ EARNED" : isNext ? "▶ NEXT" : "LOCKED")
                        .font(.byteMono(9))
                        .foregroundColor(earned ? Self.gold.opacity(0.55) : isNext ? .byteCyan : .byteText3)
                        .tracking(0.5)
                }
                .padding(.horizontal, 10)
                .padding(.vertical, 12)

                // Diagonal shine sweep (earned only)
                if earned {
                    LinearGradient(
                        colors: [.clear, Color.white.opacity(0.15), .clear],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                    .frame(width: 40)
                    .rotationEffect(.degrees(20))
                    .offset(x: shineX)
                    .allowsHitTesting(false)
                }
            }
            .clipShape(RoundedRectangle(cornerRadius: 12))
        }
        .buttonStyle(.plain)
        .background(
            earned ? Self.gold.opacity(0.07) :
            isNext ? Color.byteCyan.opacity(0.04) :
            Color.white.opacity(0.015)
        )
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(
                    earned ? Self.gold.opacity(0.35) :
                    isNext ? Color.byteCyan.opacity(0.30) :
                    Color.byteBorderMedium,
                    lineWidth: 1
                )
        )
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .shadow(
            color: earned ? Self.gold.opacity(glowPulse ? 0.50 : 0.22) :
                   isNext ? Color.byteCyan.opacity(glowPulse ? 0.25 : 0.10) : .clear,
            radius: earned ? (glowPulse ? 20 : 10) : (glowPulse ? 10 : 5)
        )
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(
                    earned ? Self.gold.opacity(glowPulse ? 0.65 : 0.35) :
                    isNext ? Color.byteCyan.opacity(glowPulse ? 0.55 : 0.30) :
                    Color.clear,
                    lineWidth: 1
                )
        )
        .offset(y: floatY)
        .scaleEffect(appeared ? 1 : 0.75)
        .opacity(appeared ? 1 : 0)
        .onAppear {
            withAnimation(.spring(response: 0.4, dampingFraction: 0.6).delay(Double(index) * 0.06)) {
                appeared = true
            }
            if earned {
                withAnimation(
                    .easeInOut(duration: 2.5 + Double(index) * 0.1)
                    .repeatForever(autoreverses: true)
                    .delay(Double(index) * 0.45)
                ) {
                    floatY = -3
                }
                withAnimation(
                    .easeInOut(duration: 1.8 + Double(index) * 0.12)
                    .repeatForever(autoreverses: true)
                    .delay(Double(index) * 0.3 + 0.4)
                ) {
                    glowPulse = true
                }
                DispatchQueue.main.asyncAfter(deadline: .now() + Double(index) * 0.06 + 0.6) {
                    withAnimation(.easeInOut(duration: 1.4)) {
                        shineX = 120
                    }
                }
            } else if isNext {
                withAnimation(
                    .easeInOut(duration: 2.0)
                    .repeatForever(autoreverses: true)
                    .delay(Double(index) * 0.2)
                ) {
                    glowPulse = true
                }
            }
        }
    }
}

// MARK: - Badge Detail Sheet

private struct BadgeDetailSheet: View {
    let detail: BadgesSection.BadgeDetail
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        VStack(spacing: 16) {
            Capsule().fill(Color.byteBorderMedium).frame(width: 36, height: 4).padding(.top, 8)

            Text(detail.type.icon)
                .font(.system(size: 56))
                .opacity(detail.earned ? 1 : 0.45)
                .padding(.top, 6)

            Text(detail.type.label)
                .font(.byteSans(20, weight: .bold))
                .foregroundColor(.byteText1)

            Text(detail.earned ? "EARNED" : "LOCKED")
                .font(.byteMono(11, weight: .bold))
                .tracking(0.8)
                .foregroundColor(detail.earned ? .byteAccent : .byteText2)
                .padding(.horizontal, 10).padding(.vertical, 4)
                .background(detail.earned ? IdentityColor.blue.bgActive : IdentityColor.blue.bgFaint)
                .overlay(RoundedRectangle(cornerRadius: 6)
                    .stroke(detail.earned ? Color.byteAccent : IdentityColor.blue.borderFaint, lineWidth: 1))
                .clipShape(RoundedRectangle(cornerRadius: 6))

            if let desc = detail.type.description, !desc.isEmpty {
                Text(desc)
                    .font(.byteSans(14))
                    .foregroundColor(.byteText2)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 24)
            }

            Spacer()

            Button { dismiss() } label: {
                Text("CLOSE")
                    .font(.byteMono(11, weight: .bold))
                    .tracking(0.8)
                    .foregroundColor(.byteAccent)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 12)
                    .background(IdentityColor.blue.bgActive)
                    .overlay(RoundedRectangle(cornerRadius: 10)
                        .stroke(Color.byteAccent, lineWidth: 1))
                    .clipShape(RoundedRectangle(cornerRadius: 10))
            }
            .buttonStyle(.plain)
            .padding(.horizontal, 20).padding(.bottom, 20)
        }
        .frame(maxWidth: .infinity)
        .background(Color.byteBackground.ignoresSafeArea())
    }
}

// MARK: - Social Links Row

private struct SocialLinksRow: View {
    let links: [SocialLink]

    var body: some View {
        HStack(spacing: 10) {
            ForEach(links, id: \.url) { link in
                if let url = URL(string: link.url) {
                    Link(destination: url) {
                        HStack(spacing: 6) {
                            Image(systemName: iconName(for: link.platform))
                                .font(.system(size: 12))
                            Text(link.label ?? link.platform.capitalized)
                                .font(.byteMono(11, weight: .bold))
                                .tracking(0.4)
                        }
                        .foregroundColor(.byteText1)
                        .padding(.horizontal, 12).padding(.vertical, 6)
                        .background(IdentityColor.blue.bgFaint)
                        .overlay(RoundedRectangle(cornerRadius: 8)
                            .stroke(IdentityColor.blue.borderFaint, lineWidth: 1))
                        .clipShape(RoundedRectangle(cornerRadius: 8))
                    }
                }
            }
        }
    }

    private func iconName(for platform: String) -> String {
        switch platform.lowercased() {
        case "github":   return "chevron.left.forwardslash.chevron.right"
        case "twitter", "x": return "xmark"
        case "linkedin": return "person.2.fill"
        case "website":  return "globe"
        default:         return "link"
        }
    }
}

// MARK: - Profile Tabs

private struct ProfileTabs: View {
    @Binding var selected: ProfileTab
    let tabs: [ProfileTab]

    var body: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                ForEach(tabs, id: \.self) { tab in
                    Button {
                        withAnimation(.easeInOut(duration: 0.15)) { selected = tab }
                    } label: {
                        Text(tab.rawValue)
                            .font(.byteMono(11, weight: selected == tab ? .bold : .regular))
                            .tracking(0.7)
                            .foregroundColor(selected == tab ? .byteAccent : .byteText1)
                            .padding(.horizontal, 14)
                            .padding(.vertical, 7)
                            .background(selected == tab ? IdentityColor.blue.bgActive : IdentityColor.blue.bgFaint)
                            .overlay(
                                RoundedRectangle(cornerRadius: 8)
                                    .stroke(selected == tab ? .byteAccent : IdentityColor.blue.borderFaint, lineWidth: 1)
                            )
                            .clipShape(RoundedRectangle(cornerRadius: 8))
                            .shadow(color: selected == tab ? IdentityColor.blue.tint(0.20) : .clear, radius: 6)
                    }
                    .buttonStyle(.plain)
                    .frame(minHeight: 36)
                }
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 10)
        }
    }
}

// MARK: - Profile Tab Content

private struct ProfileTabContent: View {
    let tab: ProfileTab
    let user: User
    @ObservedObject var vm: ProfileViewModel
    @State private var bytesSubTab: BytesSubTab = .posted
    @State private var interviewsSubTab: InterviewsSubTab = .posted
    @State private var showCompose = false

    var body: some View {
        switch tab {
        case .profile:
            ProfileInfoTab(user: user, vm: vm)

        case .bytes:
            LazyVStack(spacing: 0) {
                BytesSubTabBar(selected: $bytesSubTab)
                    .padding(.horizontal, 12)
                    .padding(.vertical, 10)

                switch bytesSubTab {
                case .posted:
                    if vm.bytes.isEmpty {
                        bytesEmptyState
                    } else {
                        LazyVStack(spacing: 12) {
                            ForEach(vm.bytes) { post in
                                NavigationLink(destination: PostDetailView(post: post)) {
                                    CollapsiblePostCard(post: post, isOwn: vm.isOwnProfile) {
                                        vm.bytes.removeAll { $0.id == post.id }
                                        Task { try? await APIClient.shared.deletePost(postId: post.id) }
                                    }
                                }
                                .buttonStyle(.plain)
                                .padding(.horizontal, 16)
                            }
                        }
                        .padding(.top, 4)
                    }

                case .saved:
                    if vm.bookmarks.isEmpty {
                        EmptyStateView(
                            icon: "bookmark",
                            title: "No saved bytes",
                            message: "Save bytes to revisit them later."
                        )
                        .padding(.top, 40)
                    } else {
                        LazyVStack(spacing: 12) {
                            ForEach(vm.bookmarks) { post in
                                NavigationLink(destination: PostDetailView(post: post)) {
                                    CollapsiblePostCard(post: post, isOwn: false) {}
                                }
                                .buttonStyle(.plain)
                                .padding(.horizontal, 16)
                            }
                        }
                        .padding(.top, 4)
                    }

                case .drafts:
                    InlineDraftsTab()
                }
            }
            .sheet(isPresented: $showCompose) { ComposeView() }

        case .interviews:
            LazyVStack(spacing: 0) {
                InterviewsSubTabBar(selected: $interviewsSubTab)
                    .padding(.horizontal, 12)
                    .padding(.vertical, 10)

                switch interviewsSubTab {
                case .posted:
                    if vm.interviews.isEmpty {
                        interviewsEmptyState
                    } else {
                        LazyVStack(spacing: 12) {
                            ForEach(vm.interviews) { iv in
                                NavigationLink(destination: InterviewDetailView(interviewId: iv.id)) {
                                    InterviewSummaryRow(interview: iv)
                                }
                                .buttonStyle(.plain)
                                .padding(.horizontal, 16)
                            }
                        }
                        .padding(.top, 4)
                    }

                case .saved:
                    VStack(spacing: 14) {
                        Image(systemName: "bookmark")
                            .font(.system(size: 44, weight: .thin))
                            .foregroundColor(.byteText3)
                        Text("NO SAVED INTERVIEWS")
                            .font(.byteMono(13, weight: .bold))
                            .tracking(1.0)
                            .foregroundColor(.byteText1)
                        Text("Save interviews to revisit them later.")
                            .font(.byteBody)
                            .foregroundColor(.byteText2)
                            .multilineTextAlignment(.center)
                    }
                    .padding(.top, 60)
                    .padding(.horizontal, 24)
                }
            }
            .sheet(isPresented: $showCompose) { ComposeView(initialType: .interview) }

        case .prefs:
            ProfilePrefsTab(vm: vm)

        case .alerts:
            ProfileAlertsTab()
        }
    }

    private var bytesEmptyState: some View {
        VStack(spacing: 14) {
            Image(systemName: "hexagon")
                .font(.system(size: 44, weight: .thin))
                .foregroundColor(.byteText3)
            Text("NO BYTES YET")
                .font(.byteMono(13, weight: .bold))
                .tracking(1.0)
                .foregroundColor(.byteText1)
            Text("Share a technique, pattern, or lesson")
                .font(.byteBody)
                .foregroundColor(.byteText2)
                .multilineTextAlignment(.center)
            Button { showCompose = true } label: {
                Text("→ POST A BYTE")
                    .font(.byteMono(11, weight: .bold))
                    .tracking(0.5)
                    .foregroundColor(.byteAccent)
                    .padding(.horizontal, 20)
                    .padding(.vertical, 10)
                    .background(IdentityColor.blue.bgActive)
                    .overlay(Capsule().stroke(Color.byteAccent, lineWidth: 1))
                    .clipShape(Capsule())
            }
            .buttonStyle(.plain)
        }
        .padding(.top, 60)
        .padding(.horizontal, 24)
    }

    private var interviewsEmptyState: some View {
        VStack(spacing: 14) {
            Image(systemName: "diamond")
                .font(.system(size: 44, weight: .thin))
                .foregroundColor(.byteText3)
            Text("NO INTERVIEWS YET")
                .font(.byteMono(13, weight: .bold))
                .tracking(1.0)
                .foregroundColor(.byteText1)
            Text("Document your interview experience")
                .font(.byteBody)
                .foregroundColor(.byteText2)
                .multilineTextAlignment(.center)
            Button { showCompose = true } label: {
                Text("→ SHARE ONE")
                    .font(.byteMono(11, weight: .bold))
                    .tracking(0.5)
                    .foregroundColor(.bytePurple)
                    .padding(.horizontal, 20)
                    .padding(.vertical, 10)
                    .background(IdentityColor.purple.bgActive)
                    .overlay(Capsule().stroke(Color.bytePurple, lineWidth: 1))
                    .clipShape(Capsule())
            }
            .buttonStyle(.plain)
        }
        .padding(.top, 60)
        .padding(.horizontal, 24)
    }
}

// MARK: - Bytes Sub-Tab Bar

private struct BytesSubTabBar: View {
    @Binding var selected: BytesSubTab

    var body: some View {
        HStack(spacing: 8) {
            ForEach(BytesSubTab.allCases, id: \.self) { tab in
                Button {
                    withAnimation(.easeInOut(duration: 0.15)) { selected = tab }
                } label: {
                    Text(tab.rawValue)
                        .font(.byteMono(11, weight: selected == tab ? .bold : .regular))
                        .tracking(0.7)
                        .foregroundColor(selected == tab ? .byteAccent : .byteText1)
                        .padding(.horizontal, 16)
                        .padding(.vertical, 7)
                        .background(selected == tab ? IdentityColor.blue.bgActive : IdentityColor.blue.bgFaint)
                        .overlay(
                            RoundedRectangle(cornerRadius: 8)
                                .stroke(selected == tab ? Color.byteAccent : IdentityColor.blue.borderFaint, lineWidth: 1)
                        )
                        .clipShape(RoundedRectangle(cornerRadius: 8))
                        .shadow(color: selected == tab ? IdentityColor.blue.tint(0.20) : .clear, radius: 6)
                }
                .buttonStyle(.plain)
                .frame(minHeight: 36)
            }
            Spacer()
        }
    }
}

// MARK: - Interviews Sub-Tab Bar

private struct InterviewsSubTabBar: View {
    @Binding var selected: InterviewsSubTab

    var body: some View {
        HStack(spacing: 8) {
            ForEach(InterviewsSubTab.allCases, id: \.self) { tab in
                Button {
                    withAnimation(.easeInOut(duration: 0.15)) { selected = tab }
                } label: {
                    Text(tab.rawValue)
                        .font(.byteMono(11, weight: selected == tab ? .bold : .regular))
                        .tracking(0.7)
                        .foregroundColor(selected == tab ? .bytePurple : .byteText1)
                        .padding(.horizontal, 16)
                        .padding(.vertical, 7)
                        .background(selected == tab ? IdentityColor.purple.bgActive : IdentityColor.purple.bgFaint)
                        .overlay(
                            RoundedRectangle(cornerRadius: 8)
                                .stroke(selected == tab ? Color.bytePurple : IdentityColor.purple.borderFaint, lineWidth: 1)
                        )
                        .clipShape(RoundedRectangle(cornerRadius: 8))
                        .shadow(color: selected == tab ? Color.bytePurple.opacity(0.20) : .clear, radius: 6)
                }
                .buttonStyle(.plain)
                .frame(minHeight: 36)
            }
            Spacer()
        }
    }
}

// MARK: - Inline Drafts Tab

private struct InlineDraftsTab: View {
    @StateObject private var vm = DraftsVM()
    @State private var showCompose = false

    var body: some View {
        Group {
            if vm.isLoading && vm.drafts.isEmpty {
                VStack(spacing: 8) {
                    ForEach(0..<3, id: \.self) { _ in
                        RowSkeleton(hasSubtitle: true, titleWidth: 180, subtitleWidth: 240)
                            .padding(.horizontal, 16)
                    }
                }
                .padding(.top, 12)
                .redacted(reason: .placeholder)
                .accessibilityHidden(true)
            } else if vm.drafts.isEmpty {
                VStack(spacing: 14) {
                    Image(systemName: "tray")
                        .font(.system(size: 44, weight: .thin))
                        .foregroundColor(.byteText3)
                    Text("NO DRAFTS")
                        .font(.byteMono(13, weight: .bold))
                        .tracking(1.0)
                        .foregroundColor(.byteText1)
                    Text("Drafts you save while composing will appear here.")
                        .font(.byteBody)
                        .foregroundColor(.byteText2)
                        .multilineTextAlignment(.center)
                    Button { showCompose = true } label: {
                        Text("→ START WRITING")
                            .font(.byteMono(11, weight: .bold))
                            .tracking(0.5)
                            .foregroundColor(.byteAccent)
                            .padding(.horizontal, 20)
                            .padding(.vertical, 10)
                            .background(IdentityColor.blue.bgActive)
                            .overlay(Capsule().stroke(Color.byteAccent, lineWidth: 1))
                            .clipShape(Capsule())
                    }
                    .buttonStyle(.plain)
                }
                .padding(.top, 60)
                .padding(.horizontal, 24)
            } else {
                LazyVStack(spacing: 0) {
                    ForEach(vm.drafts) { draft in
                        VStack(alignment: .leading, spacing: 4) {
                            Text(draft.title?.isEmpty == false ? draft.title! : "Untitled draft")
                                .font(.byteSans(14, weight: .semibold))
                                .foregroundColor(.byteText1)
                                .lineLimit(1)
                            if let body = draft.body, !body.isEmpty {
                                Text(body)
                                    .font(.byteSmall)
                                    .foregroundColor(.byteText2)
                                    .lineLimit(2)
                            }
                        }
                        .padding(.horizontal, 16)
                        .padding(.vertical, 12)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .background(Color.byteCard)
                        .overlay(Rectangle().fill(Color.byteBorder).frame(height: 1), alignment: .bottom)
                    }
                }
                .padding(.top, 4)
            }
        }
        .task { await vm.load() }
        .sheet(isPresented: $showCompose) { ComposeView() }
    }
}

// MARK: - Compact interview summary row (used in profile interviews tab)

private struct InterviewSummaryRow: View {
    let interview: Interview

    var diffColor: Color {
        switch interview.difficulty {
        case .easy:   return .byteGreen
        case .medium: return .byteOrange
        case .hard:   return .byteRed
        }
    }

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            VStack(spacing: 2) {
                RoundedRectangle(cornerRadius: 3)
                    .fill(Color.bytePurple.opacity(0.55))
                    .frame(width: 3)
            }
            .frame(width: 3)

            VStack(alignment: .leading, spacing: 6) {
                HStack(spacing: 6) {
                    Text(interview.difficulty.label.uppercased())
                        .font(.byteMono(9, weight: .bold))
                        .tracking(0.5)
                        .foregroundColor(diffColor)
                        .padding(.horizontal, 6).padding(.vertical, 2)
                        .background(diffColor.opacity(0.12))
                        .overlay(RoundedRectangle(cornerRadius: 4).stroke(diffColor.opacity(0.4), lineWidth: 1))
                        .clipShape(RoundedRectangle(cornerRadius: 4))
                    if let company = interview.company, !company.isEmpty {
                        Text(company.uppercased())
                            .font(.byteMono(10, weight: .bold))
                            .foregroundColor(.byteText2)
                            .tracking(0.4)
                    }
                    Spacer(minLength: 0)
                    Text("\(interview.questions.count) Q's")
                        .font(.byteMono(10))
                        .foregroundColor(.byteText2)
                }
                Text(interview.title)
                    .font(.byteSans(15, weight: .semibold))
                    .foregroundColor(.byteText1)
                    .lineLimit(2)
                    .fixedSize(horizontal: false, vertical: true)
                if let role = interview.role, !role.isEmpty {
                    Text(role)
                        .font(.byteMono(11))
                        .foregroundColor(.byteText2)
                }
            }

            Image(systemName: "chevron.right")
                .font(.system(size: 11, weight: .semibold))
                .foregroundColor(.byteText3)
        }
        .padding(14)
        .background(Color.byteCard)
        .overlay(RoundedRectangle(cornerRadius: 12).stroke(Color.byteBorderHigh, lineWidth: 1))
        .clipShape(RoundedRectangle(cornerRadius: 12))
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
    @State private var username: String
    @State private var bio: String
    @State private var company: String
    @State private var roleTitle: String
    @State private var avatarVariant: String
    @State private var github: String
    @State private var twitter: String
    @State private var linkedin: String
    @State private var website: String
    @State private var techStack: [String]
    @State private var techStackOptions: [SearchableDropdown.DropdownOption] = []
    @State private var isLoading = false
    let onSave: (User) -> Void

    init(user: User, onSave: @escaping (User) -> Void) {
        self._displayName = State(initialValue: user.displayName)
        self._username = State(initialValue: user.username)
        self._bio = State(initialValue: user.bio)
        self._company = State(initialValue: user.company)
        self._roleTitle = State(initialValue: user.role)
        self._avatarVariant = State(initialValue: user.avatarVariant)
        self._github = State(initialValue: user.links.first(where: { $0.platform == "github" })?.url ?? "")
        self._twitter = State(initialValue: user.links.first(where: { $0.platform == "twitter" })?.url ?? "")
        self._linkedin = State(initialValue: user.links.first(where: { $0.platform == "linkedin" })?.url ?? "")
        self._website = State(initialValue: user.links.first(where: { $0.platform == "website" })?.url ?? "")
        self._techStack = State(initialValue: user.techStack)
        self.onSave = onSave
    }

    var body: some View {
        NavigationStack {
            ZStack {
                Color.byteBackground
                    .ignoresSafeArea()
                    .dismissKeyboardOnTap()
                ScrollView {
                    VStack(spacing: 18) {
                        AccentBarHeader(label: "AVATAR", size: .compact)
                        AvatarVariantPicker(selected: $avatarVariant)

                        AccentBarHeader(label: "BASICS", size: .compact)
                        ByteTextField(placeholder: "Display name", text: $displayName, icon: "person")
                        ByteTextField(placeholder: "username", text: $username, icon: "at")
                            .autocorrectionDisabled()
                            .textInputAutocapitalization(.never)
                        ByteTextField(placeholder: "Company", text: $company, icon: "building.2")
                        ByteTextField(placeholder: "Role (e.g. Senior Engineer)", text: $roleTitle, icon: "briefcase")
                        VStack(alignment: .leading, spacing: 6) {
                            Text("BIO").font(.byteMono(10)).foregroundColor(.byteText2)
                            TextField("Tell the world about yourself...", text: $bio, axis: .vertical)
                                .font(.byteBody).foregroundColor(.byteText1)
                                .lineLimit(3...6)
                                .padding(12)
                                .background(Color.byteElement)
                                .cornerRadius(8)
                                .overlay(RoundedRectangle(cornerRadius: 8).stroke(Color.byteBorderMedium, lineWidth: 1))
                        }

                        AccentBarHeader(label: "TECH STACK", size: .compact)
                        MultiSelectDropdown(
                            values: $techStack,
                            options: techStackOptions,
                            placeholder: "SELECT TECH STACKS",
                            identity: .blue
                        )

                        AccentBarHeader(label: "SOCIAL LINKS", size: .compact)
                        ByteTextField(placeholder: "GitHub URL", text: $github, icon: "chevron.left.forwardslash.chevron.right")
                            .autocorrectionDisabled()
                            .textInputAutocapitalization(.never)
                        ByteTextField(placeholder: "Twitter / X URL", text: $twitter, icon: "xmark")
                            .autocorrectionDisabled()
                            .textInputAutocapitalization(.never)
                        ByteTextField(placeholder: "LinkedIn URL", text: $linkedin, icon: "person.2.fill")
                            .autocorrectionDisabled()
                            .textInputAutocapitalization(.never)
                        ByteTextField(placeholder: "Website URL", text: $website, icon: "globe")
                            .autocorrectionDisabled()
                            .textInputAutocapitalization(.never)

                        ByteButton("Save Changes", icon: "checkmark", isLoading: isLoading) {
                            Task {
                                isLoading = true
                                defer { isLoading = false }
                                do {
                                    let links: [SocialLink] = [
                                        ("github", github),
                                        ("twitter", twitter),
                                        ("linkedin", linkedin),
                                        ("website", website),
                                    ].compactMap { (platform, url) in
                                        let trimmed = url.trimmingCharacters(in: .whitespacesAndNewlines)
                                        return trimmed.isEmpty ? nil : SocialLink(platform: platform, url: trimmed, label: nil)
                                    }
                                    let updated = try await APIClient.shared.updateProfile(
                                        username: username.isEmpty ? nil : username,
                                        displayName: displayName.isEmpty ? nil : displayName,
                                        bio: bio.isEmpty ? nil : bio,
                                        company: company.isEmpty ? nil : company,
                                        roleTitle: roleTitle.isEmpty ? nil : roleTitle,
                                        techStack: techStack,
                                        avatarVariant: avatarVariant,
                                        links: links
                                    )
                                    onSave(updated)
                                    dismiss()
                                } catch let err {
                                    ToastCenter.shared.show(error: err, context: "Couldn't save profile")
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
        .task {
            if let stacks = try? await APIClient.shared.getTechStacks() {
                techStackOptions = stacks.map {
                    SearchableDropdown.DropdownOption(value: $0.name, label: $0.label)
                }
            }
        }
    }
}

// MARK: - ViewModel

enum FollowersListMode: Identifiable {
    case followers, following
    var id: String {
        switch self {
        case .followers: return "followers"
        case .following: return "following"
        }
    }
    var title: String {
        switch self {
        case .followers: return "Followers"
        case .following: return "Following"
        }
    }
}

@MainActor
final class ProfileViewModel: ObservableObject {
    let username: String
    @Published var user: User?
    @Published var bytes: [Post] = []
    @Published var interviews: [Interview] = []
    @Published var bookmarks: [Post] = []
    @Published var badgeCatalog: [BadgeType] = []
    @Published var isLoading = false
    @Published var isFollowing = false
    @Published var followersListMode: FollowersListMode?

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
        } catch let err {
            user = try? await APIClient.shared.getMe()
            if user == nil {
                ToastCenter.shared.show(error: err, context: "Couldn't load profile")
            }
        }

        if isOwnProfile {
            async let b = APIClient.shared.getMyBytes()
            async let iv = APIClient.shared.getMyInterviews()
            async let bk = APIClient.shared.getMyBookmarks()
            bytes     = (try? await b)  ?? []
            interviews = (try? await iv) ?? []
            bookmarks  = (try? await bk) ?? []
        } else if let uid = user?.id {
            // Public profile: fetch ONLY this author's bytes + interviews. Do NOT fetch
            // bookmarks (private). Previously this was calling getFeed() (the viewer's
            // own feed) and getInterviews() with no filter — both leaked unrelated data.
            async let b = APIClient.shared.getUserBytes(userId: uid, pageSize: 30)
            async let iv = APIClient.shared.getInterviews(authorId: uid, pageSize: 30)
            bytes      = (try? await b)  ?? []
            interviews = (try? await iv) ?? []
            bookmarks  = []
        }

        // Badge catalog — drives the locked-readable rendering on the profile.
        if badgeCatalog.isEmpty {
            badgeCatalog = (try? await APIClient.shared.getBadgeTypes()) ?? []
        }
    }

    func toggleFollow() async {
        Haptics.medium()
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
        .environmentObject(AuthManager.shared)
        .environmentObject(FeatureFlagsManager.shared)
        .environmentObject(ChatService.shared)
        .environmentObject(DeepLinkRouter.shared)
        .environmentObject(ToastCenter.shared)
}

// ═══════════════════════════════════════════════════════════════════════════
// MARK: - Support Terminal View
// Mirrors UI/components/features/terminal/{TerminalShell, TerminalInput, TerminalOutput, useTerminal}.
// Reachable from Profile menu → "Send feedback".
// Commands: help · whoami · feedback --type good|bad|idea · history · clear · exit.
// Inlined here so it compiles into the existing ByteAI Xcode target without manual project edits.
// ═══════════════════════════════════════════════════════════════════════════

struct SupportTerminalView: View {
    @StateObject private var vm = SupportTerminalVM()
    @Environment(\.dismiss) private var dismiss
    @FocusState private var inputFocused: Bool
    @State private var caretOn = true

    var body: some View {
        ZStack {
            Color.byteBackground.ignoresSafeArea()

            VStack(spacing: 0) {
                titleBar
                accentLine
                outputScroll
                terminalInput
            }
        }
        .onAppear {
            withAnimation(.easeInOut(duration: 0.6).repeatForever(autoreverses: true)) {
                caretOn.toggle()
            }
            inputFocused = true
        }
    }

    private var titleBar: some View {
        ZStack {
            HStack(spacing: 6) {
                Button { dismiss() } label: {
                    Circle()
                        .fill(Color(red: 1, green: 0.37, blue: 0.34))
                        .overlay(Circle().stroke(Color.black.opacity(0.15), lineWidth: 1))
                        .frame(width: 12, height: 12)
                }
                .buttonStyle(.plain)
                .accessibilityLabel("Close support terminal")

                Button { vm.clear() } label: {
                    Circle()
                        .fill(Color(red: 1, green: 0.74, blue: 0.18))
                        .overlay(Circle().stroke(Color.black.opacity(0.15), lineWidth: 1))
                        .frame(width: 12, height: 12)
                }
                .buttonStyle(.plain)
                .accessibilityLabel("Clear terminal")

                Circle()
                    .fill(Color.white.opacity(0.10))
                    .overlay(Circle().stroke(Color.white.opacity(0.08), lineWidth: 1))
                    .frame(width: 12, height: 12)

                Spacer()

                stageBadge
            }
            .padding(.horizontal, 14)

            HStack(spacing: 6) {
                ZStack {
                    RoundedRectangle(cornerRadius: 4)
                        .fill(Color.byteGreen.opacity(0.10))
                        .overlay(RoundedRectangle(cornerRadius: 4).stroke(Color.byteGreen.opacity(0.20), lineWidth: 1))
                        .frame(width: 16, height: 16)
                    Image(systemName: "lifepreserver")
                        .font(.system(size: 9))
                        .foregroundColor(.byteGreen)
                }
                Text("SUPPORT")
                    .font(.system(size: 11, weight: .semibold, design: .monospaced))
                    .foregroundColor(.byteText1)
                    .tracking(0.6)
                Text("v1.0")
                    .font(.system(size: 11, design: .monospaced))
                    .foregroundColor(.byteText3)
            }
        }
        .frame(height: 44)
        .background(Color.byteGreen.opacity(0.03))
        .overlay(alignment: .bottom) {
            Rectangle().fill(Color.byteGreen.opacity(0.15)).frame(height: 1)
        }
    }

    @ViewBuilder
    private var stageBadge: some View {
        if vm.stage == .awaitingMessage {
            Text("INPUT")
                .font(.system(size: 9, design: .monospaced))
                .foregroundColor(Color(red: 0.98, green: 0.75, blue: 0.14))
                .tracking(0.5)
                .padding(.horizontal, 6).padding(.vertical, 2)
                .background(Color(red: 0.98, green: 0.75, blue: 0.14).opacity(0.12))
                .overlay(RoundedRectangle(cornerRadius: 4)
                    .stroke(Color(red: 0.98, green: 0.75, blue: 0.14).opacity(0.25), lineWidth: 1))
                .clipShape(RoundedRectangle(cornerRadius: 4))
        } else {
            Text("READY")
                .font(.system(size: 9, design: .monospaced))
                .foregroundColor(.byteGreen)
                .tracking(0.5)
                .padding(.horizontal, 6).padding(.vertical, 2)
                .background(Color.byteGreen.opacity(0.08))
                .overlay(RoundedRectangle(cornerRadius: 4)
                    .stroke(Color.byteGreen.opacity(0.20), lineWidth: 1))
                .clipShape(RoundedRectangle(cornerRadius: 4))
        }
    }

    private var accentLine: some View {
        LinearGradient(
            colors: [Color.byteGreen, Color.byteGreen.opacity(0.25), .clear],
            startPoint: .leading, endPoint: .trailing
        )
        .frame(height: 1)
    }

    private var outputScroll: some View {
        ScrollViewReader { proxy in
            ScrollView {
                LazyVStack(alignment: .leading, spacing: 2) {
                    ForEach(vm.lines) { line in
                        SupportTerminalLineRow(line: line)
                            .id(line.id)
                    }
                    if vm.loading {
                        HStack(spacing: 4) {
                            Text("◆").font(.system(size: 10, design: .monospaced)).foregroundColor(.byteText3)
                            ForEach(0..<3) { i in
                                Circle().fill(Color.byteGreen).frame(width: 4, height: 4)
                                    .opacity(caretOn ? 0.9 : 0.3)
                                    .animation(.easeInOut(duration: 0.6).repeatForever().delay(Double(i) * 0.15), value: caretOn)
                            }
                        }
                        .padding(.vertical, 2)
                    }
                    Color.clear.frame(height: 4).id("bottom-anchor")
                }
                .padding(.horizontal, 14)
                .padding(.vertical, 10)
            }
            .onChange(of: vm.lines.count) { _, _ in
                withAnimation(.easeOut(duration: 0.15)) {
                    proxy.scrollTo("bottom-anchor", anchor: .bottom)
                }
            }
        }
    }

    private var terminalInput: some View {
        VStack(spacing: 0) {
            Rectangle().fill(Color.byteBorderHigh).frame(height: 1)

            HStack(spacing: 4) {
                if vm.stage == .awaitingMessage {
                    HStack(spacing: 3) {
                        Text("input").foregroundColor(Color(red: 0.98, green: 0.75, blue: 0.14))
                        Text("›").foregroundColor(.byteGreen).fontWeight(.bold)
                    }
                    .font(.system(size: 12, design: .monospaced))
                } else {
                    HStack(spacing: 3) {
                        Text("byteai").foregroundColor(Color.byteGreen.opacity(0.55))
                        Text("@").foregroundColor(.byteText3)
                        Text("~").foregroundColor(.byteAccent)
                        Text("$").foregroundColor(.byteGreen).fontWeight(.bold)
                    }
                    .font(.system(size: 12, design: .monospaced))
                }

                TextField(vm.stage == .awaitingMessage ? "Type your message..." : "type a command...",
                          text: $vm.draft, axis: .vertical)
                    .font(.system(size: 12, design: .monospaced))
                    .foregroundColor(.byteText1)
                    .tint(.byteGreen)
                    .lineLimit(1...5)
                    .focused($inputFocused)
                    .submitLabel(.return)
                    .autocorrectionDisabled()
                    .textInputAutocapitalization(.never)
                    .onSubmit { Task { await vm.submitDraft(onClose: { dismiss() }) } }
                    .onChange(of: vm.draft) { _, newValue in
                        if newValue.last == "\n" {
                            vm.draft = String(newValue.dropLast())
                            Task { await vm.submitDraft(onClose: { dismiss() }) }
                        }
                    }

                Rectangle()
                    .fill(Color.byteGreen)
                    .frame(width: 6, height: 14)
                    .opacity(inputFocused && caretOn ? 0.9 : 0.3)
                    .cornerRadius(1)

                Button {
                    Task { await vm.submitDraft(onClose: { dismiss() }) }
                } label: {
                    Image(systemName: "return")
                        .font(.system(size: 14, weight: .bold))
                        .foregroundColor(vm.draft.trimmingCharacters(in: .whitespaces).isEmpty ? .byteText3 : .byteGreen)
                }
                .buttonStyle(.plain)
                .disabled(vm.draft.trimmingCharacters(in: .whitespaces).isEmpty || vm.loading)
                .accessibilityLabel("Submit")
            }
            .padding(.horizontal, 14).padding(.vertical, 10)
            .background(Color.byteGreen.opacity(0.02))
        }
    }
}

private struct SupportTerminalLineRow: View {
    let line: SupportTerminalLine

    var body: some View {
        switch line.kind {
        case .system:
            Text(line.text)
                .font(.system(size: 11, design: .monospaced))
                .foregroundColor(.byteText2)
                .padding(.bottom, 4)
        case .input, .output:
            Text(line.text)
                .font(.system(size: 11, design: .monospaced))
                .foregroundColor(.byteText1)
        case .success:
            Text(line.text)
                .font(.system(size: 11, design: .monospaced))
                .foregroundColor(.byteGreen)
        case .error:
            Text(line.text)
                .font(.system(size: 11, design: .monospaced))
                .foregroundColor(.byteRed)
        case .record:
            HStack(spacing: 8) {
                if let meta = line.meta {
                    Text(meta.feedbackType.uppercased())
                        .font(.system(size: 9, weight: .bold, design: .monospaced))
                        .foregroundColor(.byteGreen)
                        .padding(.horizontal, 5).padding(.vertical, 1)
                        .background(Color.byteGreen.opacity(0.12))
                        .overlay(RoundedRectangle(cornerRadius: 3).stroke(Color.byteGreen.opacity(0.25), lineWidth: 1))
                        .clipShape(RoundedRectangle(cornerRadius: 3))
                    Text(meta.date)
                        .font(.system(size: 10, design: .monospaced))
                        .foregroundColor(.byteText3)
                }
                Text(line.text)
                    .font(.system(size: 11, design: .monospaced))
                    .foregroundColor(.byteText1)
                    .lineLimit(1)
            }
        }
    }
}

struct SupportTerminalLine: Identifiable {
    enum Kind { case system, input, output, success, error, record }
    struct Meta { let feedbackType: String; let status: String; let date: String }
    let id: Int
    let kind: Kind
    let text: String
    let meta: Meta?
}

@MainActor
final class SupportTerminalVM: ObservableObject {
    enum Stage { case idle, awaitingMessage }

    @Published var lines: [SupportTerminalLine] = [
        SupportTerminalLine(id: 1, kind: .system,
                            text: "ByteAI Terminal v1.0 — type help to get started.",
                            meta: nil)
    ]
    @Published var draft: String = ""
    @Published var loading: Bool = false
    @Published var stage: Stage = .idle

    private var nextId: Int = 2
    private var pendingType: String?

    private let helpText = [
        "  help                           show this menu",
        "  whoami                         show your profile info",
        "  feedback -type good            submit positive feedback",
        "  feedback -type bad             report a bug or issue",
        "  feedback -type idea            suggest a feature",
        "  history                        view your last 5 submissions",
        "  clear                          clear terminal",
        "  exit                           close terminal"
    ]

    func clear() {
        lines = [SupportTerminalLine(id: nextId, kind: .system,
                                     text: "ByteAI Terminal v1.0 — type help to get started.",
                                     meta: nil)]
        nextId += 1
        stage = .idle
        pendingType = nil
    }

    func submitDraft(onClose: @escaping () -> Void) async {
        let raw = draft
        let trimmedLower = raw.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        guard !raw.trimmingCharacters(in: .whitespaces).isEmpty else { return }

        if trimmedLower == "clear" { draft = ""; clear(); return }
        if trimmedLower == "exit"  { draft = ""; onClose(); return }

        push(.input, "> \(raw)")
        draft = ""

        if stage == .awaitingMessage {
            let message = raw.trimmingCharacters(in: .whitespacesAndNewlines)
            guard let type = pendingType else { stage = .idle; return }
            if message.count < 5 {
                push(.error, "[!] Message too short — at least 5 characters.")
                return
            }
            await submit(type: type, message: message)
            stage = .idle
            pendingType = nil
            return
        }

        await runCommand(raw: raw)
    }

    private func runCommand(raw: String) async {
        let parsed = parse(raw)
        switch parsed {
        case .help:
            push(.output, "Commands:")
            helpText.forEach { push(.output, $0) }

        case .whoami:
            guard let me = AuthManager.shared.currentUser else {
                push(.error, "[!] Not signed in.")
                return
            }
            push(.output, "─────────────────────────────")
            push(.output, "  username    \(me.username)")
            push(.output, "  display     \(me.displayName)")
            push(.output, "  level       \(me.level)")
            push(.output, "  bytes       \(me.bytes)")
            push(.output, "  followers   \(me.followers)")
            push(.output, "  following   \(me.following)")
            if !me.role.isEmpty    { push(.output, "  role        \(me.role)") }
            if !me.company.isEmpty { push(.output, "  company     \(me.company)") }
            push(.output, "─────────────────────────────")

        case .history:
            loading = true
            let items = (try? await APIClient.shared.getMyFeedbackHistory()) ?? []
            loading = false
            if items.isEmpty {
                push(.output, "No feedback submitted yet.")
            } else {
                push(.output, "Your last submissions:")
                for f in items.prefix(5) {
                    let date = formattedDate(f.createdAt)
                    let preview = f.message.count > 55
                        ? String(f.message.prefix(55)) + "…"
                        : f.message
                    pushRecord(text: preview,
                               meta: SupportTerminalLine.Meta(feedbackType: f.type, status: f.status, date: date))
                }
            }

        case .feedback(let type, let inline):
            if let inline, !inline.isEmpty {
                if inline.count < 5 {
                    push(.error, "[!] Message too short — at least 5 characters.")
                    return
                }
                await submit(type: type, message: inline)
            } else {
                pendingType = type
                stage = .awaitingMessage
                let label = labelFor(type)
                push(.output, "[?] Tell us your \(label) (5–1000 chars):")
            }

        case .unknown(let raw):
            push(.error, "[!] Unknown command: \"\(raw)\". Type help for available commands.")
        }
    }

    private func submit(type: String, message: String) async {
        loading = true
        let result = try? await APIClient.shared.submitFeedback(
            type: type, message: message, pageContext: "ios:profile"
        )
        loading = false
        if result != nil {
            push(.success, "[✓] Feedback submitted (\(type)). Thank you!")
        } else {
            push(.error, "[!] Submission failed. Please try again.")
        }
    }

    private func push(_ kind: SupportTerminalLine.Kind, _ text: String) {
        lines.append(SupportTerminalLine(id: nextId, kind: kind, text: text, meta: nil))
        nextId += 1
    }

    private func pushRecord(text: String, meta: SupportTerminalLine.Meta) {
        lines.append(SupportTerminalLine(id: nextId, kind: .record, text: text, meta: meta))
        nextId += 1
    }

    private func labelFor(_ type: String) -> String {
        switch type {
        case "good": return "positive feedback"
        case "bad":  return "issue or bug"
        case "idea": return "feature idea"
        default:     return "feedback"
        }
    }

    private func formattedDate(_ iso: String) -> String {
        let f = ISO8601DateFormatter()
        f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        let date = f.date(from: iso) ?? ISO8601DateFormatter().date(from: iso) ?? Date()
        let out = DateFormatter()
        out.dateStyle = .short
        out.timeStyle = .none
        return out.string(from: date)
    }

    private enum Parsed {
        case help, whoami, history
        case feedback(type: String, inlineMessage: String?)
        case unknown(String)
    }

    private func parse(_ raw: String) -> Parsed {
        let trimmed = raw.trimmingCharacters(in: .whitespacesAndNewlines)
        let lower = trimmed.lowercased()

        if lower == "help"    { return .help }
        if lower == "whoami"  { return .whoami }
        if lower == "history" { return .history }

        if lower.hasPrefix("feedback") {
            let rest = trimmed.dropFirst("feedback".count).trimmingCharacters(in: .whitespaces)
            let scrubbed = rest
                .replacingOccurrences(of: "--type", with: "")
                .replacingOccurrences(of: "-type", with: "")
                .trimmingCharacters(in: .whitespaces)
            let parts = scrubbed.split(separator: " ", maxSplits: 1, omittingEmptySubsequences: true)
            guard let typeTok = parts.first?.lowercased(),
                  ["good", "bad", "idea"].contains(typeTok) else {
                return .unknown(raw)
            }
            var inline: String? = nil
            if parts.count == 2 {
                let body = String(parts[1]).trimmingCharacters(in: .whitespaces)
                inline = body.replacingOccurrences(of: "\"", with: "")
                              .replacingOccurrences(of: "'", with: "")
                              .trimmingCharacters(in: .whitespaces)
            }
            return .feedback(type: typeTok, inlineMessage: inline?.isEmpty == true ? nil : inline)
        }

        return .unknown(raw)
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// MARK: - Followers / Following list sheet
// Tapping a row navigates to that user's profile (push on the parent NavigationStack
// via NavigationLink).
// ═══════════════════════════════════════════════════════════════════════════

struct FollowersListSheet: View {
    let userId: String
    let mode: FollowersListMode
    @State private var people: [PersonResult] = []
    @State private var isLoading = true
    @State private var query = ""
    @Environment(\.dismiss) private var dismiss

    private var filtered: [PersonResult] {
        let q = query.trimmingCharacters(in: .whitespaces).lowercased()
        guard !q.isEmpty else { return people }
        return people.filter {
            $0.username.lowercased().contains(q) || $0.displayName.lowercased().contains(q)
        }
    }

    var body: some View {
        NavigationStack {
            ZStack {
                Color.byteBackground.ignoresSafeArea()
                    .dismissKeyboardOnTap()

                VStack(spacing: 0) {
                    HStack(spacing: 8) {
                        Image(systemName: "magnifyingglass")
                            .font(.system(size: 13))
                            .foregroundColor(.byteText2)
                        TextField("Search…", text: $query)
                            .font(.byteSans(14))
                            .foregroundColor(.byteText1)
                            .tint(.byteAccent)
                            .autocorrectionDisabled()
                            .textInputAutocapitalization(.never)
                        if !query.isEmpty {
                            Button { query = "" } label: {
                                Image(systemName: "xmark.circle.fill")
                                    .foregroundColor(.byteText3)
                            }
                            .buttonStyle(.plain)
                        }
                    }
                    .padding(.horizontal, 14).padding(.vertical, 10)
                    .background(IdentityColor.blue.bgFaint)
                    .overlay(Rectangle().fill(Color.byteBorderHigh).frame(height: 1), alignment: .bottom)

                    if isLoading {
                        Spacer()
                        ByteSpinner()
                        Spacer()
                    } else if filtered.isEmpty {
                        Spacer()
                        EmptyStateView(
                            icon: "person.slash",
                            title: query.isEmpty
                                ? (mode == .followers ? "No followers yet" : "Not following anyone")
                                : "No matches",
                            message: query.isEmpty ? "" : "Try a different name or username."
                        )
                        Spacer()
                    } else {
                        ScrollView {
                            LazyVStack(spacing: 0) {
                                ForEach(filtered) { person in
                                    NavigationLink(destination: ProfileView(username: person.username)) {
                                        FollowerRow(person: person)
                                    }
                                    .buttonStyle(.plain)
                                    Rectangle()
                                        .fill(Color.byteBorderHigh.opacity(0.4))
                                        .frame(height: 1)
                                        .padding(.leading, 60)
                                }
                            }
                        }
                    }
                }
            }
            .navigationTitle("\(mode.title) (\(people.count))")
            .navigationBarTitleDisplayMode(.inline)
            .toolbarBackground(Color.byteBackground, for: .navigationBar)
            .toolbarColorScheme(.dark, for: .navigationBar)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Done") { dismiss() }
                        .foregroundColor(.byteAccent)
                }
            }
        }
        .task {
            isLoading = true
            do {
                people = mode == .followers
                    ? try await APIClient.shared.getFollowers(userId: userId)
                    : try await APIClient.shared.getFollowing(userId: userId)
            } catch let err {
                people = []
                ToastCenter.shared.show(error: err, context: "Couldn't load \(mode == .followers ? "followers" : "following")")
            }
            isLoading = false
        }
    }
}

// MARK: - Avatar variant picker

private struct AvatarVariantPicker: View {
    @Binding var selected: String

    private let variants: [(key: String, color: Color)] = [
        ("cyan", .byteCyan),
        ("purple", .bytePurple),
        ("green", .byteGreen),
        ("orange", .byteOrange),
    ]

    var body: some View {
        HStack(spacing: 12) {
            ForEach(variants, id: \.key) { variant in
                Button {
                    selected = variant.key
                    Haptics.light()
                } label: {
                    Circle()
                        .fill(variant.color)
                        .frame(width: 36, height: 36)
                        .overlay(
                            Circle()
                                .stroke(selected == variant.key ? Color.white : Color.clear, lineWidth: 2)
                                .padding(-3)
                        )
                        .shadow(color: variant.color.opacity(selected == variant.key ? 0.6 : 0.0), radius: 8)
                }
                .buttonStyle(.plain)
                .accessibilityLabel("\(variant.key) avatar variant")
            }
            Spacer()
        }
    }
}

private struct FollowerRow: View {
    let person: PersonResult

    var body: some View {
        HStack(spacing: 12) {
            AvatarView(person.initials,
                       variant: AvatarVariant(rawValue: person.avatarVariant) ?? .cyan,
                       size: .md)
            VStack(alignment: .leading, spacing: 2) {
                Text(person.displayName)
                    .font(.byteSans(14, weight: .semibold))
                    .foregroundColor(.byteText1)
                Text("@\(person.username)")
                    .font(.byteMono(11))
                    .foregroundColor(.byteText2)
                if !person.role.isEmpty {
                    Text(person.role)
                        .font(.byteMono(11))
                        .foregroundColor(.byteText2)
                }
            }
            Spacer()
            Image(systemName: "chevron.right")
                .font(.system(size: 11, weight: .semibold))
                .foregroundColor(.byteText3)
        }
        .padding(.horizontal, 14).padding(.vertical, 12)
        .contentShape(Rectangle())
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// MARK: - Preferences (notification toggles + visibility)
// Hits /api/users/me/preferences. Theme is left to the system per project decision.
// ═══════════════════════════════════════════════════════════════════════════

struct PreferencesView: View {
    @StateObject private var vm = PreferencesViewModel()
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            ZStack {
                Color.byteBackground.ignoresSafeArea()
                if vm.isLoading {
                    ByteSpinner()
                } else {
                    ScrollView {
                        VStack(alignment: .leading, spacing: 22) {
                            AccentBarHeader(label: "NOTIFICATIONS", size: .compact)
                            VStack(spacing: 0) {
                                PreferencesToggle(
                                    title: "Reactions",
                                    subtitle: "When someone likes your byte or interview",
                                    isOn: $vm.prefs.notifReactions
                                )
                                Divider().background(Color.byteBorderHigh.opacity(0.5))
                                PreferencesToggle(
                                    title: "Comments",
                                    subtitle: "When someone comments on your post",
                                    isOn: $vm.prefs.notifComments
                                )
                                Divider().background(Color.byteBorderHigh.opacity(0.5))
                                PreferencesToggle(
                                    title: "Followers",
                                    subtitle: "When someone follows you",
                                    isOn: $vm.prefs.notifFollowers
                                )
                                Divider().background(Color.byteBorderHigh.opacity(0.5))
                                PreferencesToggle(
                                    title: "Unfollows",
                                    subtitle: "When someone unfollows you",
                                    isOn: $vm.prefs.notifUnfollows
                                )
                            }
                            .background(Color.byteCard)
                            .overlay(RoundedRectangle(cornerRadius: 12).stroke(Color.byteBorderHigh, lineWidth: 1))
                            .clipShape(RoundedRectangle(cornerRadius: 12))

                            AccentBarHeader(label: "VISIBILITY", size: .compact)
                            VisibilityPicker(value: $vm.prefs.visibility)
                        }
                        .padding(20)
                    }
                }
            }
            .navigationTitle("Preferences")
            .navigationBarTitleDisplayMode(.inline)
            .toolbarBackground(Color.byteBackground, for: .navigationBar)
            .toolbarColorScheme(.dark, for: .navigationBar)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") { dismiss() }.foregroundColor(.byteText2)
                }
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button {
                        Task { if await vm.save() { dismiss() } }
                    } label: {
                        Text(vm.isSaving ? "Saving…" : "Save")
                            .font(.byteMono(11, weight: .bold))
                            .tracking(0.5)
                            .foregroundColor(.byteAccent)
                    }
                    .disabled(vm.isSaving)
                }
            }
        }
        .task { await vm.load() }
    }
}

private struct PreferencesToggle: View {
    let title: String
    let subtitle: String
    @Binding var isOn: Bool

    var body: some View {
        HStack(spacing: 12) {
            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(.byteSans(14, weight: .semibold))
                    .foregroundColor(.byteText1)
                Text(subtitle)
                    .font(.byteMono(10))
                    .foregroundColor(.byteText2)
            }
            Spacer()
            Toggle("", isOn: $isOn)
                .labelsHidden()
                .tint(.byteAccent)
        }
        .padding(.horizontal, 14).padding(.vertical, 12)
    }
}

private struct VisibilityPicker: View {
    @Binding var value: String

    var body: some View {
        HStack(spacing: 8) {
            ForEach(["public", "followers", "private"], id: \.self) { option in
                Button { value = option } label: {
                    Text(option.uppercased())
                        .font(.byteMono(10, weight: value == option ? .bold : .regular))
                        .tracking(0.6)
                        .foregroundColor(value == option ? .byteAccent : .byteText1)
                        .padding(.horizontal, 12).padding(.vertical, 8)
                        .frame(maxWidth: .infinity)
                        .background(value == option ? IdentityColor.blue.bgActive : IdentityColor.blue.bgFaint)
                        .overlay(
                            RoundedRectangle(cornerRadius: 8)
                                .stroke(value == option ? Color.byteAccent : IdentityColor.blue.borderFaint, lineWidth: 1)
                        )
                        .clipShape(RoundedRectangle(cornerRadius: 8))
                }
                .buttonStyle(.plain)
            }
        }
    }
}

@MainActor
final class PreferencesViewModel: ObservableObject {
    @Published var prefs: UserPreferences = .default
    @Published var isLoading = true
    @Published var isSaving = false

    func load() async {
        isLoading = true
        defer { isLoading = false }
        if let p = try? await APIClient.shared.getMyPreferences() {
            prefs = p
            if let theme = AppTheme(rawValue: p.theme) {
                ThemeManager.shared.set(theme)
            }
        }
    }

    func save() async -> Bool {
        isSaving = true
        defer { isSaving = false }
        do {
            prefs = try await APIClient.shared.updatePreferences(prefs)
            ToastCenter.shared.show("Preferences saved", kind: .success)
            return true
        } catch let err {
            ToastCenter.shared.show(error: err, context: "Couldn't save preferences")
            return false
        }
    }
}

// MARK: - Delete Account Sheet

struct DeleteAccountSheet: View {
    @Environment(\.dismiss) private var dismiss
    @State private var confirmText = ""
    @State private var isDeleting = false

    private var canConfirm: Bool { confirmText == "DELETE" && !isDeleting }

    var body: some View {
        NavigationStack {
            ZStack {
                Color.byteBackground.ignoresSafeArea()
                ScrollView {
                    VStack(alignment: .leading, spacing: 20) {
                        // Warning card
                        VStack(alignment: .leading, spacing: 10) {
                            HStack(spacing: 8) {
                                Image(systemName: "exclamationmark.triangle.fill")
                                    .font(.system(size: 14))
                                    .foregroundColor(.byteRed)
                                Text("This cannot be undone")
                                    .font(.byteSmall.bold())
                                    .foregroundColor(.byteRed)
                            }
                            Text("Permanently deletes your account and all associated data: bytes, interviews, comments, follows, chat history, and badges.")
                                .font(.byteSmall)
                                .foregroundColor(.byteText2)
                                .fixedSize(horizontal: false, vertical: true)
                        }
                        .padding(16)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .background(Color.byteRed.opacity(0.08))
                        .overlay(RoundedRectangle(cornerRadius: 12).stroke(Color.byteRed.opacity(0.3), lineWidth: 1))
                        .clipShape(RoundedRectangle(cornerRadius: 12))

                        // Confirmation input
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Type DELETE to confirm")
                                .font(.byteSmall)
                                .foregroundColor(.byteText2)
                            TextField("", text: $confirmText)
                                .textInputAutocapitalization(.characters)
                                .autocorrectionDisabled()
                                .font(.system(.body, design: .monospaced))
                                .foregroundColor(.byteText1)
                                .padding(.horizontal, 14)
                                .padding(.vertical, 12)
                                .background(Color.byteElement)
                                .overlay(RoundedRectangle(cornerRadius: 10).stroke(
                                    confirmText == "DELETE" ? Color.byteRed.opacity(0.6) : Color.byteBorderMedium,
                                    lineWidth: 1))
                                .clipShape(RoundedRectangle(cornerRadius: 10))
                                .disabled(isDeleting)
                        }

                        // Confirm button
                        Button {
                            Task { await confirmDelete() }
                        } label: {
                            HStack(spacing: 8) {
                                if isDeleting {
                                    ProgressView()
                                        .tint(.white)
                                        .scaleEffect(0.85)
                                } else {
                                    Image(systemName: "trash")
                                }
                                Text(isDeleting ? "Deleting..." : "Delete My Account")
                                    .font(.byteSmall.bold())
                            }
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 14)
                            .background(canConfirm ? Color.byteRed : Color.byteRed.opacity(0.3))
                            .foregroundColor(.white)
                            .clipShape(RoundedRectangle(cornerRadius: 12))
                        }
                        .disabled(!canConfirm)
                        .animation(.easeInOut(duration: 0.15), value: canConfirm)
                    }
                    .padding(20)
                }
            }
            .navigationTitle("Delete Account")
            .navigationBarTitleDisplayMode(.inline)
            .toolbarBackground(Color.byteBackground, for: .navigationBar)
            .toolbarColorScheme(.dark, for: .navigationBar)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") { dismiss() }
                        .font(.byteSmall)
                        .foregroundColor(.byteText2)
                        .disabled(isDeleting)
                }
            }
        }
        .presentationDetents([.medium])
        .presentationDragIndicator(.visible)
    }

    private func confirmDelete() async {
        guard canConfirm else { return }
        isDeleting = true
        do {
            try await APIClient.shared.deleteAccount()
            ToastCenter.shared.show("Account deleted", kind: .success)
            await AuthManager.shared.signOut()
        } catch {
            ToastCenter.shared.show("Failed to delete account. Please try again.", kind: .error)
            isDeleting = false
        }
    }
}
