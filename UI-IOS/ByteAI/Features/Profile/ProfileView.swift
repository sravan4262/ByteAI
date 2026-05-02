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
    @State private var publicProfileTab: ProfileTab = .bytes
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
                    if vm.isOwnProfile {
                        VStack(spacing: 0) {
                            ProfileTabs(selected: $selectedTab, tabs: visibleTabs)
                            ScrollView {
                                ByteScrollOffsetReader(coordinateSpace: "byteScroll")
                                ProfileTabContent(tab: selectedTab, user: user, vm: vm)
                                    .padding(.vertical, 12)
                                    .byteScrollContentSize()
                            }
                            .coordinateSpace(name: "byteScroll")
                            .byteScrollbar()
                            .refreshable { await vm.load() }
                            .scrollDismissesKeyboard(.interactively)
                        }
                    } else {
                        // Public profile: profile info scrolls at top, tab bar sticks, content below.
                        ScrollView {
                            ByteScrollOffsetReader(coordinateSpace: "byteScroll")
                            LazyVStack(spacing: 0, pinnedViews: [.sectionHeaders]) {
                                ProfileInfoTab(user: user, vm: vm)
                                    .padding(.vertical, 12)
                                Section {
                                    ProfileTabContent(tab: publicProfileTab, user: user, vm: vm)
                                        .padding(.vertical, 4)
                                } header: {
                                    ProfileTabs(selected: $publicProfileTab, tabs: [.bytes, .interviews])
                                        .background(Color.byteBackground)
                                }
                            }
                            .byteScrollContentSize()
                        }
                        .coordinateSpace(name: "byteScroll")
                        .byteScrollbar()
                        .refreshable { await vm.load() }
                        .scrollDismissesKeyboard(.interactively)
                    }
                } else {
                    EmptyStateView(icon: "person", title: "Profile not found", message: "")
                }

                // Floating action capsules — own profile only.
                // Labelled pills (not bare circles) signal tappable surface and
                // surface unread count inline. Bottom-trailing anchored above
                // the tab bar safe area.
                if vm.isOwnProfile {
                    VStack(alignment: .trailing, spacing: 10) {
                        ProfileActionPill(
                            icon: "terminal",
                            label: "ASSIST",
                            badge: 0,
                            tint: .byteCyan
                        ) { showSupportFloat = true }

                        if flags.isEnabled("chat") {
                            ProfileActionPill(
                                icon: "bubble.left.and.bubble.right.fill",
                                label: "CHAT",
                                badge: chat.unreadCount,
                                tint: .byteAccent
                            ) { showChatFloat = true }
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
                // System accounts (e.g. @byteai) get an OFFICIAL ribbon in the
                // trailing slot — web parity with the `+ OFFICIAL` chip on the
                // public profile.
                if !vm.isOwnProfile, vm.user?.isSystem == true {
                    ToolbarItem(placement: .navigationBarTrailing) {
                        HStack(spacing: 4) {
                            Image(systemName: "plus")
                                .font(.system(size: 9, weight: .bold))
                            Text("OFFICIAL")
                                .font(.byteMono(10, weight: .bold))
                                .tracking(0.8)
                        }
                        .foregroundColor(.bytePurple)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(IdentityColor.purple.bgActive)
                        .overlay(Capsule().stroke(IdentityColor.purple.solid, lineWidth: 1))
                        .clipShape(Capsule())
                    }
                }

                if vm.isOwnProfile {
                    ToolbarItem(placement: .navigationBarLeading) {
                        ProfileToolbarButton(
                            icon: "rectangle.portrait.and.arrow.right",
                            tint: .byteRed
                        ) {
                            Task { await AuthManager.shared.signOut() }
                        }
                        .accessibilityLabel("Sign out")
                    }
                    ToolbarItem(placement: .navigationBarTrailing) {
                        ProfileToolbarButton(
                            icon: "pencil",
                            tint: .byteAccent
                        ) {
                            showEditProfile = true
                        }
                        .accessibilityLabel("Edit profile")
                    }
                }
            }
            .sheet(isPresented: $showEditProfile) {
                if let user = vm.user {
                    EditProfileSheet(user: user) { updated in vm.user = updated }
                }
            }
            .sheet(isPresented: $showSupportFloat) {
                // Compact medium detent — terminal sits over the lower half of
                // the screen instead of taking it whole, so the user can still
                // see the byte they were reading. Drag up to .large for more
                // history when needed.
                SupportTerminalView()
                    .presentationDetents([.large])
                    .presentationDragIndicator(.visible)
                    .presentationBackground(Color.byteCard)
                    .presentationCornerRadius(20)
            }
            .sheet(isPresented: $showChatFloat) {
                ChatTerminalSheet { convo in
                    showChatFloat = false
                    chatTerminalConversation = convo
                }
                .environmentObject(chat)
                .presentationDetents([.large])
                .presentationDragIndicator(.visible)
                .presentationBackground(Color.byteCard)
                .presentationCornerRadius(20)
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

// MARK: - Profile Action Pill (chat / assist launchers)
// Capsule with icon + uppercase mono label and an inline unread chip when
// non-zero. Replaces the prior bare-icon FAB so the button reads as
// tappable / actionable on first glance and never collides with the tab bar.

private struct ProfileActionPill: View {
    let icon: String
    let label: String
    let badge: Int
    let tint: Color
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 8) {
                Image(systemName: icon)
                    .font(.system(size: 13, weight: .semibold))
                Text(label)
                    .font(.byteMono(11, weight: .bold))
                    .tracking(0.8)
                if badge > 0 {
                    Text(badge > 99 ? "99+" : "\(badge)")
                        .font(.byteMono(10, weight: .bold))
                        .foregroundColor(.white)
                        .padding(.horizontal, 6)
                        .padding(.vertical, 1)
                        .background(Capsule().fill(tint))
                        .shadow(color: tint.opacity(0.5), radius: 4)
                }
            }
            .foregroundColor(tint)
            .padding(.horizontal, 14)
            .padding(.vertical, 10)
            .background(
                Capsule()
                    .fill(Color.byteCard.opacity(0.92))
                    .background(.ultraThinMaterial, in: Capsule())
            )
            .overlay(Capsule().stroke(tint.opacity(0.45), lineWidth: 1))
            .shadow(color: tint.opacity(0.18), radius: 8, y: 4)
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

            // OWN profile: rich dashboard (XP bar + activity stats + badges).
            // PUBLIC profile: web parity — three identity stats (BYTES /
            // FOLLOWERS / LEVEL), no XP bar, no badges, no streak. The viewer
            // doesn't need someone else's progression detail.
            if vm.isOwnProfile {
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
            } else {
                HStack(spacing: 8) {
                    PublicStatCard(label: "BYTES",      value: user.bytes)
                    PublicStatCard(label: "INTERVIEWS", value: vm.interviews.count)
                    PublicStatCard(label: "LEVEL",      value: user.level)
                }
            }

            // Tech-stack tags + badges + social links + XP only land on the owner's
            // view. Public profile stays minimal to match the web's compact layout.
            if vm.isOwnProfile {
                if !user.techStack.isEmpty {
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 6) {
                            ForEach(user.techStack, id: \.self) { TagView(label: $0, isSelected: true) }
                        }
                    }
                }
            }

            if vm.isOwnProfile {
                BadgesSection(
                    earnedNames: Set(user.badges.map { $0.name.lowercased() }),
                    catalog: vm.badgeCatalog
                )

                if !user.links.isEmpty {
                    SocialLinksRow(links: user.links)
                }
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
            let serverUrl = try await APIClient.shared.uploadAvatar(data)
            // Append a cache-busting query so KFImage and the system URL cache
            // see a different key — Supabase upserts to the same storage path,
            // so without this the old image keeps coming back.
            let busted = appendCacheBust(serverUrl)
            if var updated = vm.user {
                updated.avatarUrl = busted
                vm.user = updated
            }
            // Broadcast: AuthManager updates `state` so any view bound to
            // currentUser repaints; .avatarChanged notification refreshes
            // captured user copies in feed/comments/notifications rows.
            if vm.isOwnProfile {
                AuthManager.shared.applyAvatarUpdate(busted)
            }
            ToastCenter.shared.show("Avatar updated", kind: .success)
        } catch {
            ToastCenter.shared.show("Couldn't upload avatar", kind: .error)
        }
    }

    private func appendCacheBust(_ url: String) -> String {
        let stamp = Int(Date().timeIntervalSince1970)
        return url.contains("?") ? "\(url)&v=\(stamp)" : "\(url)?v=\(stamp)"
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
                    if BiometricLock.shared.isAvailable {
                        biometricSection
                    }
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
    // Web parity (profile-screen.tsx:1215–1244): wrap-flow chips for the user's
    // current stacks (each tappable to remove), plus an `+ ADD` pill that
    // expands to a typeable dropdown.

    private var techStackSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            AccentBarHeader(label: "TECH_STACK", size: .compact)
            TechStackPrefsEditor(
                values: Binding(
                    get: { vm.user?.techStack ?? [] },
                    set: { newStack in
                        vm.user?.techStack = newStack
                        Task {
                            // Persist server-side, then mirror into the auth-scoped
                            // currentUser + broadcast `techStackChanged` so listeners
                            // (chiefly FeedViewModel's For-You filter) update without
                            // requiring a remount.
                            if (try? await APIClient.shared.updateProfile(techStack: newStack)) != nil {
                                AuthManager.shared.applyTechStackUpdate(newStack)
                            }
                        }
                    }
                ),
                allOptions: availableTechStacks.map { TechOption(value: $0.name, label: $0.label) }
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

    // MARK: Biometric Section

    private var biometricSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            AccentBarHeader(label: "PRIVACY & SECURITY", size: .compact)
            BiometricLockToggleRow()
                .background(Color.byteCard)
                .overlay(RoundedRectangle(cornerRadius: 12).stroke(Color.byteBorderHigh, lineWidth: 1))
                .clipShape(RoundedRectangle(cornerRadius: 12))
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
    @State private var levelPop = false

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
                    // Spring-pop whenever the level increments — small celebration on level-up.
                    .scaleEffect(levelPop ? 1.18 : 1.0)
                    .animation(.spring(response: 0.35, dampingFraction: 0.45), value: levelPop)
                    .onChange(of: user.level) { _, _ in
                        levelPop = true
                        DispatchQueue.main.asyncAfter(deadline: .now() + 0.36) { levelPop = false }
                    }

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
                        // Web parity: when XP changes, the bar springs to its
                        // new width instead of snapping. Keyed off `pct` so a
                        // level-up (which resets pct toward 0) also animates.
                        .animation(.interpolatingSpring(stiffness: 80, damping: 14), value: pct)
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

// MARK: - Public Stat Card
// Web parity: a row of bordered cards showing identity stats (BYTES / FOLLOWERS
// / LEVEL) on the public profile. Each card is its own bordered tile, in
// contrast to the own-profile StatItem which lives inside a single shared card.

private struct PublicStatCard: View {
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
        VStack(spacing: 4) {
            Text(formatted)
                .font(.byteSans(20, weight: .bold))
                .foregroundColor(.byteText1)
            Text(label)
                .font(.byteMono(10, weight: .semibold))
                .foregroundColor(.byteText2)
                .tracking(0.6)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 16)
        .background(Color.byteCard)
        .overlay(RoundedRectangle(cornerRadius: 12).stroke(Color.byteBorderHigh, lineWidth: 1))
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }

    private var formatted: String {
        value >= 1000 ? String(format: "%.1fk", Double(value)/1000) : "\(value)"
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

    private func isEarned(_ b: BadgeType) -> Bool {
        earnedNames.contains(b.name.lowercased())
    }

    private var earnedCount: Int { catalog.filter(isEarned).count }

    /// Web parity: earned badges render first, locked badges follow. Within each
    /// group the original catalog (progression) order is preserved so the
    /// "next" badge stays the first locked one in the chain.
    private var orderedCatalog: [BadgeType] {
        let earned = catalog.filter(isEarned)
        let locked = catalog.filter { !isEarned($0) }
        return earned + locked
    }

    /// `isNext` is the FIRST locked badge in the original catalog (progression
    /// chain), regardless of where it lands in display order.
    private var nextLockedId: String? {
        catalog.first(where: { !isEarned($0) })?.id
    }

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
                        ForEach(Array(orderedCatalog.enumerated()), id: \.element.id) { idx, type in
                            let earned = isEarned(type)
                            let isNext = type.id == nextLockedId
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
            .fullScreenCover(item: $selected) { detail in
                BadgeDetailSheet(detail: detail)
                    .presentationBackground(.clear)
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
                    withAnimation(.easeInOut(duration: 1.4).repeatForever(autoreverses: false)) {
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

// Centered floating modal — mirrors the web `profile-screen.tsx` badge popup.
// Earned = gold halo + particle burst + 3 expanding rings + floating icon + shine
// sweep. Locked = lock-shake on appear. Tap card or backdrop to dismiss.
private struct BadgeDetailSheet: View {
    let detail: BadgesSection.BadgeDetail
    @Environment(\.dismiss) private var dismiss

    // Animation state — kept verbatim from the prior sheet, plus particles/rings/shake.
    @State private var iconScale: CGFloat = 0.4
    @State private var iconRotation: Double = -12
    @State private var iconOpacity: Double = 0
    @State private var glowOn = false
    @State private var shineX: CGFloat = -160
    @State private var floatY: CGFloat = 0
    @State private var ringScales: [CGFloat] = [0.5, 0.5, 0.5]
    @State private var ringOpacities: [Double] = [0.8, 0.8, 0.8]
    @State private var lockShake: CGFloat = 0
    @State private var didEnter = false

    private static let gold = Color(red: 251/255, green: 191/255, blue: 36/255)
    private static let goldDim = Color(red: 251/255, green: 191/255, blue: 36/255).opacity(0.4)

    // Particle burst — 12 dots fanned out radially, only on earned.
    private static let particles: [Particle] = (0..<12).map { i in
        let angle = Double(i) * (2 * .pi / 12)
        let dist: CGFloat = 90 + CGFloat((i * 7) % 30)
        return Particle(
            id: i,
            dx: CGFloat(cos(angle)) * dist,
            dy: CGFloat(sin(angle)) * dist,
            size: i.isMultiple(of: 3) ? 5 : 3,
            color: i.isMultiple(of: 2) ? gold : Color(hex: "#fde68a"),
            delay: Double(i % 4) * 0.04
        )
    }
    private struct Particle: Identifiable {
        let id: Int; let dx: CGFloat; let dy: CGFloat
        let size: CGFloat; let color: Color; let delay: Double
    }

    var body: some View {
        ZStack {
            // Backdrop — tap dismisses.
            Color.black.opacity(0.55)
                .ignoresSafeArea()
                .background(.ultraThinMaterial)
                .contentShape(Rectangle())
                .onTapGesture { dismiss() }

            ZStack {
                if detail.earned {
                    // Big radial gold halo behind the card.
                    RadialGradient(
                        colors: [Self.gold.opacity(0.55), Self.gold.opacity(0.18), .clear],
                        center: .center, startRadius: 20, endRadius: 220
                    )
                    .frame(width: 440, height: 440)
                    .blur(radius: 12)
                    .opacity(didEnter ? 1.0 : 0.0)
                    .scaleEffect(didEnter ? 1.0 : 0.6)
                    .allowsHitTesting(false)

                    // 3 expanding ring rings (one-shot on appear).
                    ForEach(0..<3, id: \.self) { i in
                        Circle()
                            .stroke(Self.goldDim, lineWidth: 1)
                            .frame(width: 90, height: 90)
                            .scaleEffect(ringScales[i])
                            .opacity(ringOpacities[i])
                            .allowsHitTesting(false)
                    }

                    // Particle burst (one-shot on appear).
                    ForEach(Self.particles) { p in
                        Circle()
                            .fill(p.color)
                            .frame(width: p.size, height: p.size)
                            .offset(x: didEnter ? p.dx : 0, y: didEnter ? p.dy : 0)
                            .opacity(didEnter ? 0 : 1)
                            .scaleEffect(didEnter ? 0.4 : 1)
                            .animation(
                                .timingCurve(0.2, 0, 0.8, 1, duration: 0.7 + p.delay).delay(p.delay),
                                value: didEnter
                            )
                            .allowsHitTesting(false)
                    }
                }

                // Card.
                cardContent
                    .scaleEffect(iconScale)
                    .rotationEffect(.degrees(iconRotation))
                    .opacity(iconOpacity)
                    .shadow(
                        color: detail.earned
                            ? Self.gold.opacity(glowOn ? 0.45 : 0.20)
                            : Color.black.opacity(0.5),
                        radius: detail.earned ? (glowOn ? 60 : 40) : 28
                    )
                    .shadow(
                        color: detail.earned ? Self.gold.opacity(0.10) : .clear,
                        radius: detail.earned ? 120 : 0
                    )
                    .padding(.horizontal, 24)
                    .onTapGesture { dismiss() }
            }
        }
        .onAppear { runEntryAnimations() }
    }

    private var cardContent: some View {
        VStack(spacing: 16) {
            // Icon block
            ZStack {
                if detail.earned {
                    // Soft gold halo right behind the icon (mirrors the inset blur on web).
                    Circle()
                        .fill(
                            RadialGradient(
                                colors: [Self.gold.opacity(0.35), .clear],
                                center: .center, startRadius: 0, endRadius: 50
                            )
                        )
                        .frame(width: 100, height: 100)
                        .blur(radius: 8)
                        .allowsHitTesting(false)
                }

                Text(detail.type.icon)
                    .font(.system(size: 56))
                    .opacity(detail.earned ? 1 : 0.45)
                    .offset(y: floatY)
                    .modifier(LockShakeModifier(amount: lockShake, enabled: !detail.earned))
                    .shadow(
                        color: detail.earned ? Self.gold.opacity(glowOn ? 0.55 : 0.2) : .clear,
                        radius: glowOn ? 22 : 8
                    )

                // Diagonal shine sweep — earned only.
                if detail.earned {
                    LinearGradient(
                        colors: [.clear, Self.gold.opacity(0.28), .clear],
                        startPoint: .topLeading, endPoint: .bottomTrailing
                    )
                    .frame(width: 60)
                    .rotationEffect(.degrees(14))
                    .offset(x: shineX)
                    .allowsHitTesting(false)
                    .clipped()
                }
            }
            .frame(width: 110, height: 110)
            .clipShape(RoundedRectangle(cornerRadius: 24))

            // Title
            Text(detail.earned ? detail.type.label.lowercased().replacingOccurrences(of: " ", with: "_") : "LOCKED")
                .font(.byteMono(13, weight: .bold))
                .tracking(1.2)
                .foregroundColor(detail.earned ? Self.gold : .byteText2)

            // Description
            if let desc = detail.type.description, !desc.isEmpty, detail.earned {
                Text(desc)
                    .font(.byteMono(11))
                    .foregroundColor(.byteText2)
                    .multilineTextAlignment(.center)
                    .lineSpacing(2)
                    .padding(.horizontal, 12)
            } else if !detail.earned {
                Text("Keep building to unlock\nthis badge.")
                    .font(.byteMono(11))
                    .foregroundColor(.byteText3)
                    .multilineTextAlignment(.center)
                    .lineSpacing(2)
                    .padding(.horizontal, 12)
            }

            // Status pill
            HStack(spacing: 6) {
                if detail.earned {
                    Text("✦")
                        .font(.system(size: 11))
                        .foregroundColor(Self.gold)
                    Text("BADGE_UNLOCKED")
                        .font(.byteMono(11, weight: .bold))
                        .tracking(1.0)
                        .foregroundColor(Self.gold.opacity(0.85))
                } else {
                    Image(systemName: "lock.fill")
                        .font(.system(size: 9, weight: .semibold))
                        .foregroundColor(.byteText3)
                    Text("NOT_YET_EARNED")
                        .font(.byteMono(11, weight: .bold))
                        .tracking(1.0)
                        .foregroundColor(.byteText3)
                }
            }
            .padding(.horizontal, 12).padding(.vertical, 5)
            .background(detail.earned ? Self.gold.opacity(0.12) : Color.byteElement)
            .overlay(
                Capsule()
                    .stroke(detail.earned ? Self.gold.opacity(0.4) : Color.byteBorderMedium, lineWidth: 1)
            )
            .clipShape(Capsule())

            // Footer
            Text("tap to close")
                .font(.byteMono(10))
                .foregroundColor(.byteText3)
                .padding(.top, 2)
        }
        .padding(.horizontal, 36)
        .padding(.vertical, 28)
        .background(Color.byteCard)
        .overlay(
            RoundedRectangle(cornerRadius: 22)
                .stroke(detail.earned ? Self.gold.opacity(0.55) : Color.byteBorderMedium, lineWidth: 1.5)
        )
        .clipShape(RoundedRectangle(cornerRadius: 22))
    }

    private func runEntryAnimations() {
        // Spring entry (mirrors web `type:'spring', stiffness:300, damping:20`).
        withAnimation(.spring(response: 0.45, dampingFraction: 0.6)) {
            iconScale = 1.0
            iconRotation = 0
            iconOpacity = 1
            didEnter = true
        }

        if detail.earned {
            // Floating icon loop.
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.30) {
                withAnimation(.easeInOut(duration: 2.5).repeatForever(autoreverses: true)) {
                    floatY = -6
                }
                withAnimation(.easeInOut(duration: 1.6).repeatForever(autoreverses: true)) {
                    glowOn = true
                }
                withAnimation(.easeInOut(duration: 1.4).repeatForever(autoreverses: false)) {
                    shineX = 160
                }
            }

            // Expanding rings — staggered one-shot.
            for i in 0..<3 {
                DispatchQueue.main.asyncAfter(deadline: .now() + Double(i) * 0.12) {
                    withAnimation(.easeOut(duration: 0.9)) {
                        ringScales[i] = 1.5 + CGFloat(i) * 0.8
                        ringOpacities[i] = 0
                    }
                }
            }
        } else {
            // Lock shake (mirrors web `[0,-6,6,-4,4,-2,2,0]`).
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.15) {
                withAnimation(.easeInOut(duration: 0.5)) {
                    lockShake = 1
                }
            }
        }
    }
}

// MARK: - Lock-shake modifier

private struct LockShakeModifier: ViewModifier {
    let amount: CGFloat
    let enabled: Bool

    func body(content: Content) -> some View {
        if enabled {
            content
                .offset(x: shakeOffset(for: amount))
        } else {
            content
        }
    }

    /// Simulates the web sequence [0,-6,6,-4,4,-2,2,0] over the animation phase.
    private func shakeOffset(for t: CGFloat) -> CGFloat {
        guard t > 0 else { return 0 }
        let phase = t * 7
        let stops: [CGFloat] = [0, -6, 6, -4, 4, -2, 2, 0]
        let idx = Int(phase.rounded(.down))
        guard idx < stops.count - 1 else { return 0 }
        let frac = phase - CGFloat(idx)
        return stops[idx] + (stops[idx + 1] - stops[idx]) * frac
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
                // POSTED / SAVED / DRAFTS only make sense on the owner's view.
                // Public profile shows posted bytes only — saved + drafts are
                // inherently personal.
                if vm.isOwnProfile {
                    BytesSubTabBar(selected: $bytesSubTab)
                        .padding(.horizontal, 12)
                        .padding(.vertical, 10)
                }

                switch (vm.isOwnProfile ? bytesSubTab : .posted) {
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
                if vm.isOwnProfile {
                    InterviewsSubTabBar(selected: $interviewsSubTab)
                        .padding(.horizontal, 12)
                        .padding(.vertical, 10)
                }

                switch (vm.isOwnProfile ? interviewsSubTab : .posted) {
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
                    if vm.savedInterviews.isEmpty {
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
                    } else {
                        LazyVStack(spacing: 12) {
                            ForEach(vm.savedInterviews) { iv in
                                NavigationLink(destination: InterviewDetailView(interviewId: iv.id)) {
                                    InterviewSummaryRow(interview: iv)
                                }
                                .buttonStyle(.plain)
                                .padding(.horizontal, 16)
                            }
                        }
                        .padding(.top, 4)
                    }
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
            Text(vm.isOwnProfile ? "Share a technique, pattern, or lesson" : "No bytes posted yet.")
                .font(.byteBody)
                .foregroundColor(.byteText2)
                .multilineTextAlignment(.center)
            if vm.isOwnProfile {
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
            Text(vm.isOwnProfile ? "Document your interview experience" : "No interviews posted yet.")
                .font(.byteBody)
                .foregroundColor(.byteText2)
                .multilineTextAlignment(.center)
            if vm.isOwnProfile {
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
                        .font(.byteTerminalSmall)
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
// Config-editor terminal aesthetic — mirrors the web's `EDIT_PROFILE` drawer:
// mono caps header with pulsing dirty-state dot, gradient COMMIT pill (also pinned
// at the bottom for thumb reach), accent-bar section labels, mono `KEY = value`
// inputs with focus glow, dev-avatar tile picker, social-link icon rows.
//
// Logic preserved: every @State, init(user:), save closure, techStackOptions task.
// View layer only — no API/VM changes.

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
    @State private var showDiscardAlert = false
    @State private var dirtyDotPulse = false
    let onSave: (User) -> Void

    // Snapshot of init values — `isDirty` compares current @State against this.
    // Pure view-layer concern; no model change.
    private let original: Original

    private struct Original {
        let displayName: String
        let username: String
        let bio: String
        let company: String
        let roleTitle: String
        let avatarVariant: String
        let github: String
        let twitter: String
        let linkedin: String
        let website: String
        let techStack: [String]
    }

    init(user: User, onSave: @escaping (User) -> Void) {
        let github = user.links.first(where: { $0.platform == "github" })?.url ?? ""
        let twitter = user.links.first(where: { $0.platform == "twitter" })?.url ?? ""
        let linkedin = user.links.first(where: { $0.platform == "linkedin" })?.url ?? ""
        let website = user.links.first(where: { $0.platform == "website" })?.url ?? ""
        self._displayName = State(initialValue: user.displayName)
        self._username = State(initialValue: user.username)
        self._bio = State(initialValue: user.bio)
        self._company = State(initialValue: user.company)
        self._roleTitle = State(initialValue: user.role)
        self._avatarVariant = State(initialValue: user.avatarVariant)
        self._github = State(initialValue: github)
        self._twitter = State(initialValue: twitter)
        self._linkedin = State(initialValue: linkedin)
        self._website = State(initialValue: website)
        self._techStack = State(initialValue: user.techStack)
        self.original = Original(
            displayName: user.displayName,
            username: user.username,
            bio: user.bio,
            company: user.company,
            roleTitle: user.role,
            avatarVariant: user.avatarVariant,
            github: github,
            twitter: twitter,
            linkedin: linkedin,
            website: website,
            techStack: user.techStack
        )
        self.onSave = onSave
    }

    private var isDirty: Bool {
        displayName    != original.displayName    ||
        username       != original.username       ||
        bio            != original.bio            ||
        company        != original.company        ||
        roleTitle      != original.roleTitle      ||
        avatarVariant  != original.avatarVariant  ||
        github         != original.github         ||
        twitter        != original.twitter        ||
        linkedin       != original.linkedin       ||
        website        != original.website        ||
        techStack      != original.techStack
    }

    var body: some View {
        ZStack(alignment: .bottom) {
            Color.byteBackground
                .ignoresSafeArea()
                .dismissKeyboardOnTap()

            VStack(spacing: 0) {
                EditProfileHeader(
                    isDirty: isDirty,
                    isLoading: isLoading,
                    pulse: dirtyDotPulse,
                    onCommit: { Task { await save() } },
                    onClose: { attemptDismiss() }
                )

                ScrollView {
                    VStack(alignment: .leading, spacing: 22) {
                        // ── AVATAR ──────────────────────────────────────────
                        Section {
                            AccentBarHeader(label: "AVATAR", size: .compact)
                            EditProfileAvatarPicker(selected: $avatarVariant)
                        }

                        // ── BASICS ──────────────────────────────────────────
                        Section {
                            AccentBarHeader(label: "BASICS", size: .compact)
                            VStack(alignment: .leading, spacing: 14) {
                                ConfigField(
                                    label: "USERNAME",
                                    placeholder: "your_handle",
                                    text: $username,
                                    prefix: "@",
                                    autocapitalize: false,
                                    keyboardType: .asciiCapable
                                )
                                ConfigField(
                                    label: "DISPLAY_NAME",
                                    placeholder: "Your name",
                                    text: $displayName
                                )
                                ConfigBioField(label: "BIO", text: $bio, maxChars: 280)
                                RoleAtCompanyRow(roleTitle: $roleTitle, company: $company)
                            }
                        }

                        // ── TECH_STACK ──────────────────────────────────────
                        Section {
                            AccentBarHeader(label: "TECH_STACK", size: .compact)
                            MultiSelectDropdown(
                                values: $techStack,
                                options: techStackOptions,
                                placeholder: "SELECT TECH STACKS",
                                identity: .blue
                            )
                        }

                        // ── SOCIAL_LINKS ────────────────────────────────────
                        Section {
                            AccentBarHeader(label: "SOCIAL_LINKS", size: .compact)
                            VStack(spacing: 10) {
                                SocialLinkRow(
                                    platform: .github,
                                    url: $github
                                )
                                SocialLinkRow(
                                    platform: .twitter,
                                    url: $twitter
                                )
                                SocialLinkRow(
                                    platform: .linkedin,
                                    url: $linkedin
                                )
                                SocialLinkRow(
                                    platform: .website,
                                    url: $website
                                )
                            }
                        }

                        // Bottom spacer so the floating save bar never overlaps the last field.
                        Color.clear.frame(height: 80)
                    }
                    .padding(.horizontal, 18)
                    .padding(.top, 16)
                }
            }

            // Floating thumb-reachable save bar.
            EditProfileSaveBar(
                isDirty: isDirty,
                isLoading: isLoading,
                pulse: dirtyDotPulse,
                onCommit: { Task { await save() } }
            )
        }
        .alert("Discard changes?", isPresented: $showDiscardAlert) {
            Button("Keep editing", role: .cancel) {}
            Button("Discard", role: .destructive) { dismiss() }
        } message: {
            Text("You have unsaved changes. Discarding will lose them.")
        }
        .task {
            if let stacks = try? await APIClient.shared.getTechStacks() {
                techStackOptions = stacks.map {
                    SearchableDropdown.DropdownOption(value: $0.name, label: $0.label)
                }
            }
        }
        .onAppear {
            withAnimation(.easeInOut(duration: 0.9).repeatForever(autoreverses: true)) {
                dirtyDotPulse.toggle()
            }
        }
    }

    private func attemptDismiss() {
        if isDirty { showDiscardAlert = true } else { dismiss() }
    }

    @MainActor
    private func save() async {
        guard !isLoading else { return }
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
            Haptics.success()
            onSave(updated)
            dismiss()
        } catch let err {
            Haptics.error()
            ToastCenter.shared.show(error: err, context: "Couldn't save profile")
        }
    }
}

// MARK: Edit Profile — Header

private struct EditProfileHeader: View {
    let isDirty: Bool
    let isLoading: Bool
    let pulse: Bool
    let onCommit: () -> Void
    let onClose: () -> Void

    var body: some View {
        ZStack(alignment: .bottom) {
            HStack(spacing: 8) {
                HStack(spacing: 8) {
                    Text("EDIT_PROFILE")
                        .font(.byteMono(13, weight: .bold))
                        .tracking(1.2)
                        .foregroundColor(.byteText1)
                    Circle()
                        .fill(isDirty ? Color.byteAccent : Color.byteText3.opacity(0.45))
                        .frame(width: 6, height: 6)
                        .opacity(isDirty ? (pulse ? 1.0 : 0.35) : 0.5)
                        .shadow(color: isDirty ? Color.byteAccent.opacity(0.6) : .clear, radius: 4)
                        .animation(.easeInOut(duration: 0.4), value: isDirty)
                }
                Spacer()
                GradientCommitPill(isLoading: isLoading, isEnabled: isDirty, action: onCommit)
                Button(action: onClose) {
                    Image(systemName: "xmark")
                        .font(.system(size: 11, weight: .bold))
                        .foregroundColor(.byteText2)
                        .frame(width: 28, height: 28)
                        .background(Color.byteElement)
                        .overlay(
                            Circle().stroke(Color.byteBorderHigh, lineWidth: 1)
                        )
                        .clipShape(Circle())
                }
                .buttonStyle(.plain)
                .accessibilityLabel("Close edit profile")
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 12)
            .background(Color.byteBackground)

            // Gradient accent line under header.
            LinearGradient(
                colors: [Color.byteAccent, Color.byteAccent.opacity(0.25), .clear],
                startPoint: .leading, endPoint: .trailing
            )
            .frame(height: 1)
        }
    }
}

// MARK: Edit Profile — Floating Save Bar

private struct EditProfileSaveBar: View {
    let isDirty: Bool
    let isLoading: Bool
    let pulse: Bool
    let onCommit: () -> Void

    var body: some View {
        HStack(spacing: 12) {
            HStack(spacing: 6) {
                if isDirty {
                    Circle()
                        .fill(Color.byteAccent)
                        .frame(width: 6, height: 6)
                        .opacity(pulse ? 1.0 : 0.35)
                        .shadow(color: Color.byteAccent.opacity(0.6), radius: 4)
                    Text("UNSAVED")
                        .font(.byteMono(10, weight: .bold))
                        .tracking(0.8)
                        .foregroundColor(.byteAccent)
                } else {
                    Text("// .profile")
                        .font(.byteMono(11))
                        .foregroundColor(.byteText3)
                }
            }
            Spacer()
            GradientCommitPill(isLoading: isLoading, isEnabled: isDirty, action: onCommit)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 10)
        .background(
            Color.byteBackground.opacity(0.92)
                .background(.ultraThinMaterial)
        )
        .overlay(alignment: .top) {
            Rectangle().fill(Color.byteBorderHigh).frame(height: 1)
        }
    }
}

// MARK: Edit Profile — Gradient COMMIT pill

private struct GradientCommitPill: View {
    let isLoading: Bool
    let isEnabled: Bool
    let action: () -> Void

    var body: some View {
        Button(action: { if isEnabled && !isLoading { Haptics.medium(); action() } }) {
            HStack(spacing: 6) {
                if isLoading {
                    ProgressView().tint(.white).scaleEffect(0.7)
                    Text("SAVING…")
                        .font(.byteMono(11, weight: .bold))
                        .tracking(0.8)
                        .foregroundColor(.white)
                } else {
                    Image(systemName: "checkmark")
                        .font(.system(size: 10, weight: .bold))
                        .foregroundColor(.white)
                    Text("COMMIT")
                        .font(.byteMono(11, weight: .bold))
                        .tracking(0.8)
                        .foregroundColor(.white)
                }
            }
            .padding(.horizontal, 14)
            .padding(.vertical, 8)
            .background(
                LinearGradient(
                    colors: [Color.byteAccent, Color(hex: "#2563eb")],
                    startPoint: .topLeading, endPoint: .bottomTrailing
                )
            )
            .clipShape(Capsule())
            .overlay(Capsule().stroke(Color.white.opacity(0.08), lineWidth: 1))
            .shadow(color: Color.byteAccent.opacity(isEnabled ? 0.30 : 0), radius: 12, y: 0)
            .opacity(isEnabled || isLoading ? 1.0 : 0.45)
        }
        .buttonStyle(.plain)
        .disabled(!isEnabled || isLoading)
        .accessibilityLabel("Commit profile changes")
    }
}

// MARK: Edit Profile — Mono "ConfigField" input

private struct ConfigField: View {
    let label: String
    let placeholder: String
    @Binding var text: String
    var prefix: String? = nil
    var autocapitalize: Bool = true
    var keyboardType: UIKeyboardType = .default
    var focusGlow: Color = .byteAccent

    @FocusState private var focused: Bool

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            EditProfileFieldLabel(text: label)
            HStack(spacing: 6) {
                if let prefix {
                    Text(prefix)
                        .font(.byteMono(12, weight: .semibold))
                        .foregroundColor(.byteText3)
                }
                TextField(placeholder, text: $text)
                    .font(.byteMono(12, weight: .medium))
                    .foregroundColor(.byteText1)
                    .tint(focusGlow)
                    .keyboardType(keyboardType)
                    .textInputAutocapitalization(autocapitalize ? .sentences : .never)
                    .autocorrectionDisabled(!autocapitalize)
                    .focused($focused)
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 10)
            .background(Color.byteElement)
            .overlay(
                RoundedRectangle(cornerRadius: 10)
                    .stroke(focused ? focusGlow : Color.byteBorderHigh, lineWidth: 1)
            )
            .clipShape(RoundedRectangle(cornerRadius: 10))
            .shadow(color: focused ? focusGlow.opacity(0.18) : .clear, radius: 6)
            .animation(.easeInOut(duration: 0.15), value: focused)
        }
    }
}

// MARK: Edit Profile — Bio field with character counter

private struct ConfigBioField: View {
    let label: String
    @Binding var text: String
    let maxChars: Int

    @FocusState private var focused: Bool

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            EditProfileFieldLabel(text: label)
            TextField("Tell the world what you build…", text: $text, axis: .vertical)
                .font(.byteMono(12))
                .foregroundColor(.byteText1)
                .tint(.byteAccent)
                .lineLimit(3...6)
                .focused($focused)
                .padding(.horizontal, 12)
                .padding(.vertical, 10)
                .background(Color.byteElement)
                .overlay(
                    RoundedRectangle(cornerRadius: 10)
                        .stroke(focused ? Color.byteAccent : Color.byteBorderHigh, lineWidth: 1)
                )
                .clipShape(RoundedRectangle(cornerRadius: 10))
                .shadow(color: focused ? Color.byteAccent.opacity(0.18) : .clear, radius: 6)
                .animation(.easeInOut(duration: 0.15), value: focused)
            HStack {
                Spacer()
                Text("\(text.count)/\(maxChars)")
                    .font(.byteMono(10))
                    .foregroundColor(text.count > maxChars ? .byteRed : .byteText3)
            }
        }
    }
}

// MARK: Edit Profile — Mono field label with accent pill

private struct EditProfileFieldLabel: View {
    let text: String
    var body: some View {
        HStack(spacing: 6) {
            Capsule()
                .fill(Color.byteAccent)
                .frame(width: 3, height: 12)
            Text(text)
                .font(.byteMono(10, weight: .bold))
                .tracking(0.8)
                .foregroundColor(.byteText1)
        }
    }
}

// MARK: Edit Profile — Role @ Company row

private struct RoleAtCompanyRow: View {
    @Binding var roleTitle: String
    @Binding var company: String

    @FocusState private var focusedField: Field?
    private enum Field { case role, company }

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            EditProfileFieldLabel(text: "ROLE_TITLE @ COMPANY")
            HStack(spacing: 8) {
                fieldBox(text: $roleTitle, placeholder: "Sr. Engineer", focusColor: .byteAccent, field: .role)
                Text("@")
                    .font(.byteMono(13))
                    .foregroundColor(.byteText3)
                fieldBox(text: $company, placeholder: "company.io", focusColor: .byteGreen, field: .company)
            }
        }
    }

    @ViewBuilder
    private func fieldBox(text: Binding<String>, placeholder: String, focusColor: Color, field: Field) -> some View {
        let isFocused = focusedField == field
        TextField(placeholder, text: text)
            .font(.byteMono(12, weight: .medium))
            .foregroundColor(.byteText1)
            .tint(focusColor)
            .focused($focusedField, equals: field)
            .padding(.horizontal, 12)
            .padding(.vertical, 10)
            .background(Color.byteElement)
            .overlay(
                RoundedRectangle(cornerRadius: 10)
                    .stroke(isFocused ? focusColor : Color.byteBorderHigh, lineWidth: 1)
            )
            .clipShape(RoundedRectangle(cornerRadius: 10))
            .shadow(color: isFocused ? focusColor.opacity(0.18) : .clear, radius: 6)
            .animation(.easeInOut(duration: 0.15), value: focusedField)
    }
}

// MARK: Edit Profile — Social link row

private struct SocialLinkRow: View {
    enum Platform {
        case github, twitter, linkedin, website

        var glyph: String {
            switch self {
            case .github:   return "chevron.left.forwardslash.chevron.right"
            case .twitter:  return "xmark"
            case .linkedin: return "person.2.fill"
            case .website:  return "globe"
            }
        }
        var placeholder: String {
            switch self {
            case .github:   return "https://github.com/username"
            case .twitter:  return "https://x.com/username"
            case .linkedin: return "https://linkedin.com/in/username"
            case .website:  return "https://yoursite.dev"
            }
        }
    }

    let platform: Platform
    @Binding var url: String

    @FocusState private var focused: Bool

    var body: some View {
        HStack(spacing: 8) {
            ZStack {
                RoundedRectangle(cornerRadius: 8)
                    .fill(Color.byteBackground)
                    .overlay(
                        RoundedRectangle(cornerRadius: 8)
                            .stroke(Color.byteBorderHigh, lineWidth: 1)
                    )
                    .frame(width: 36, height: 36)
                Image(systemName: platform.glyph)
                    .font(.system(size: 13))
                    .foregroundColor(.byteText2)
            }

            TextField(platform.placeholder, text: $url)
                .font(.byteMono(11))
                .foregroundColor(.byteText1)
                .tint(.byteAccent)
                .keyboardType(.URL)
                .textInputAutocapitalization(.never)
                .autocorrectionDisabled()
                .focused($focused)
                .padding(.horizontal, 12)
                .padding(.vertical, 10)
                .background(Color.byteElement)
                .overlay(
                    RoundedRectangle(cornerRadius: 10)
                        .stroke(focused ? Color.byteAccent : Color.byteBorderHigh, lineWidth: 1)
                )
                .clipShape(RoundedRectangle(cornerRadius: 10))
                .shadow(color: focused ? Color.byteAccent.opacity(0.18) : .clear, radius: 6)
                .animation(.easeInOut(duration: 0.15), value: focused)

            if !url.isEmpty {
                Button {
                    url = ""
                    Haptics.light()
                } label: {
                    Image(systemName: "xmark.circle.fill")
                        .font(.system(size: 16))
                        .foregroundColor(.byteText3)
                }
                .buttonStyle(.plain)
                .accessibilityLabel("Clear link")
            }
        }
    }
}

// MARK: Edit Profile — Avatar picker (4 themed tiles, lossless to backend variant)

private struct EditProfileAvatarPicker: View {
    @Binding var selected: String

    private struct Tile: Identifiable {
        let id = UUID()
        let variant: AvatarVariant
        let glyph: String
        let label: String
    }

    private let tiles: [Tile] = [
        .init(variant: .cyan,   glyph: "🤖", label: "CYBORG"),
        .init(variant: .purple, glyph: "👾", label: "RETRO"),
        .init(variant: .green,  glyph: "⚡", label: "FORCE"),
        .init(variant: .orange, glyph: "🚀", label: "ROCKET"),
    ]

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            EditProfileFieldLabel(text: "DEV_AVATAR")
            HStack(spacing: 10) {
                ForEach(tiles) { tile in
                    AvatarTile(
                        glyph: tile.glyph,
                        label: tile.label,
                        glow: tile.variant.glowColor,
                        isSelected: selected == tile.variant.rawValue
                    ) {
                        guard selected != tile.variant.rawValue else { return }
                        Haptics.light()
                        withAnimation(.spring(response: 0.3, dampingFraction: 0.7)) {
                            selected = tile.variant.rawValue
                        }
                    }
                }
            }
        }
    }
}

private struct AvatarTile: View {
    let glyph: String
    let label: String
    let glow: Color
    let isSelected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            VStack(spacing: 4) {
                ZStack {
                    RoundedRectangle(cornerRadius: 12)
                        .fill(isSelected ? glow.opacity(0.10) : Color.byteElement)
                        .overlay(
                            RoundedRectangle(cornerRadius: 12)
                                .stroke(isSelected ? glow : Color.byteBorderHigh, lineWidth: isSelected ? 2 : 1)
                        )
                        .frame(width: 56, height: 56)
                    Text(glyph)
                        .font(.system(size: 26))
                }
                .shadow(color: isSelected ? glow.opacity(0.45) : .clear, radius: 10)
                Text(label)
                    .font(.byteMono(8, weight: .bold))
                    .tracking(0.6)
                    .foregroundColor(isSelected ? glow : .byteText3)
            }
            .frame(maxWidth: .infinity)
        }
        .buttonStyle(.plain)
        .scaleEffect(isSelected ? 1.0 : 0.98)
        .animation(.spring(response: 0.25, dampingFraction: 0.75), value: isSelected)
        .accessibilityLabel("\(label) avatar")
        .accessibilityAddTraits(isSelected ? [.isSelected] : [])
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
    @Published var savedInterviews: [Interview] = []
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
            async let siv = APIClient.shared.getMyInterviewBookmarks()
            bytes          = (try? await b)   ?? []
            interviews     = (try? await iv)  ?? []
            bookmarks      = (try? await bk)  ?? []
            savedInterviews = (try? await siv) ?? []
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
    @State private var isMaximized = false
    @State private var isMinimized = false

    var body: some View {
        ZStack {
            if isMinimized {
                Color.clear
                    .ignoresSafeArea()
                TerminalOrb(label: "support") {
                    withAnimation(.spring(response: 0.4, dampingFraction: 0.7)) {
                        isMinimized = false
                    }
                }
            } else {
                terminalSurface
                    .transition(.scale.combined(with: .opacity))
            }
        }
        .animation(.spring(response: 0.4, dampingFraction: 0.7), value: isMinimized)
    }

    private var terminalSurface: some View {
        GeometryReader { geo in
            ZStack {
                Color.byteBackground.ignoresSafeArea()

                VStack(spacing: 0) {
                    titleBar
                    accentLine
                    outputScroll
                    quickActionStrip
                    terminalInput
                }
            }
            .frame(
                width: isMaximized ? UIScreen.main.bounds.width : geo.size.width,
                height: isMaximized ? UIScreen.main.bounds.height : geo.size.height
            )
        }
        .onAppear {
            withAnimation(.easeInOut(duration: 0.6).repeatForever(autoreverses: true)) {
                caretOn.toggle()
            }
            inputFocused = true
            Task { await vm.loadInitialContext() }
        }
        .toolbar {
            ToolbarItemGroup(placement: .keyboard) {
                Button { vm.recallPrevious() } label: {
                    Image(systemName: "chevron.up")
                        .font(.system(size: 14, weight: .semibold))
                }
                .disabled(!vm.canRecallPrevious)
                .accessibilityLabel("Previous command")

                Button { vm.recallNext() } label: {
                    Image(systemName: "chevron.down")
                        .font(.system(size: 14, weight: .semibold))
                }
                .disabled(!vm.canRecallNext)
                .accessibilityLabel("Next command")

                Button { vm.tabComplete() } label: {
                    Image(systemName: "arrow.right.to.line.compact")
                        .font(.system(size: 14, weight: .semibold))
                }
                .accessibilityLabel("Tab complete")

                Spacer()

                if !vm.draft.isEmpty {
                    Button { vm.draft = "" } label: {
                        Image(systemName: "xmark.circle.fill")
                            .font(.system(size: 16))
                    }
                    .accessibilityLabel("Clear input")
                }

                Button("Done") { inputFocused = false }
                    .font(.byteSans(13, weight: .semibold))
            }
        }
    }

    // Tap-to-fill command palette above the input. Idle = command shortcuts,
    // awaitingMessage = quick-cancel only (message must be free-typed).
    @ViewBuilder
    private var quickActionStrip: some View {
        if vm.draft.isEmpty || vm.stage == .awaitingMessage {
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 6) {
                    ForEach(SupportQuickAction.actions(for: vm.stage), id: \.self) { action in
                        SupportQuickChip(action: action) {
                            handleQuickAction(action)
                        }
                    }
                }
                .padding(.horizontal, 14)
                .padding(.vertical, 6)
            }
            .background(Color.byteGreen.opacity(0.02))
            .overlay(alignment: .top) {
                Rectangle().fill(Color.byteBorderHigh.opacity(0.4)).frame(height: 1)
            }
            .transition(.opacity)
        }
    }

    private func handleQuickAction(_ action: SupportQuickAction) {
        Haptics.light()
        switch action {
        case .help, .whoami, .history, .clear:
            vm.draft = action.commandToken
            Task { await vm.submitDraft(onClose: { dismiss() }) }
        case .good, .bad, .idea:
            vm.draft = "feedback -type \(action.commandToken)"
            Task { await vm.submitDraft(onClose: { dismiss() }) }
        case .report:
            vm.draft = "report"
            Task { await vm.submitDraft(onClose: { dismiss() }) }
        case .cancel:
            vm.cancelAwaitingMessage()
        }
    }

    private var titleBar: some View {
        TerminalChrome(
            title: "SUPPORT",
            version: "v1.0",
            icon: "lifepreserver",
            isMaximized: $isMaximized,
            isMinimized: $isMinimized,
            onClear: { vm.clear() },
            onClose: { dismiss() },
            trailingBadge: AnyView(stageBadge)
        )
    }

    @ViewBuilder
    private var stageBadge: some View {
        if vm.stage != .idle {
            Text(vm.stage == .awaitingMessage ? "INPUT" : "REPORT")
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
                // Wider line-spacing + slightly larger text → less cluttered while
                // keeping the same terminal silhouette.
                LazyVStack(alignment: .leading, spacing: 6) {
                    ForEach(vm.lines) { line in
                        SupportTerminalLineRow(line: line)
                            .id(line.id)
                    }
                    if vm.loading {
                        HStack(spacing: 5) {
                            Text("◆").font(.system(size: 11, design: .monospaced)).foregroundColor(.byteText3)
                            ForEach(0..<3) { i in
                                Circle().fill(Color.byteGreen).frame(width: 5, height: 5)
                                    .opacity(caretOn ? 0.9 : 0.3)
                                    .animation(.easeInOut(duration: 0.6).repeatForever().delay(Double(i) * 0.15), value: caretOn)
                            }
                        }
                        .padding(.vertical, 2)
                    }
                    Color.clear.frame(height: 4).id("bottom-anchor")
                }
                .padding(.horizontal, 16)
                .padding(.vertical, 14)
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

            HStack(spacing: 5) {
                if vm.stage != .idle {
                    HStack(spacing: 3) {
                        Text(vm.stage == .awaitingMessage ? "input" : "report")
                            .foregroundColor(Color(red: 0.98, green: 0.75, blue: 0.14))
                        Text("›").foregroundColor(.byteGreen).fontWeight(.bold)
                    }
                    .font(.system(size: 13, design: .monospaced))
                } else {
                    HStack(spacing: 3) {
                        Text("byteai").foregroundColor(Color.byteGreen.opacity(0.55))
                        Text("@").foregroundColor(.byteText3)
                        Text("~").foregroundColor(.byteAccent)
                        Text("$").foregroundColor(.byteGreen).fontWeight(.bold)
                    }
                    .font(.system(size: 13, design: .monospaced))
                }

                TextField(vm.stage == .idle ? "type a command..." : "type your response...",
                          text: $vm.draft, axis: .vertical)
                    .font(.system(size: 13, design: .monospaced))
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
                    .frame(width: 7, height: 16)
                    .opacity(inputFocused && caretOn ? 0.9 : 0.3)
                    .cornerRadius(1)

                Button {
                    Task { await vm.submitDraft(onClose: { dismiss() }) }
                } label: {
                    Image(systemName: "return")
                        .font(.system(size: 15, weight: .bold))
                        .foregroundColor(vm.draft.trimmingCharacters(in: .whitespaces).isEmpty ? .byteText3 : .byteGreen)
                }
                .buttonStyle(.plain)
                .disabled(vm.draft.trimmingCharacters(in: .whitespaces).isEmpty || vm.loading)
                .accessibilityLabel("Submit")
            }
            .padding(.horizontal, 16).padding(.vertical, 12)
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
                .font(.system(size: 12, design: .monospaced))
                .foregroundColor(.byteText2)
                .padding(.bottom, 4)
        case .input, .output:
            Text(line.text)
                .font(.system(size: 12, design: .monospaced))
                .foregroundColor(.byteText1)
        case .success:
            Text(line.text)
                .font(.system(size: 12, design: .monospaced))
                .foregroundColor(.byteGreen)
        case .error:
            Text(line.text)
                .font(.system(size: 12, design: .monospaced))
                .foregroundColor(.byteRed)
        case .record:
            HStack(spacing: 8) {
                if let meta = line.meta {
                    Text(meta.feedbackType.uppercased())
                        .font(.system(size: 10, weight: .bold, design: .monospaced))
                        .foregroundColor(.byteGreen)
                        .padding(.horizontal, 6).padding(.vertical, 2)
                        .background(Color.byteGreen.opacity(0.12))
                        .overlay(RoundedRectangle(cornerRadius: 3).stroke(Color.byteGreen.opacity(0.25), lineWidth: 1))
                        .clipShape(RoundedRectangle(cornerRadius: 3))
                    Text(meta.date)
                        .font(.system(size: 11, design: .monospaced))
                        .foregroundColor(.byteText3)
                }
                Text(line.text)
                    .font(.system(size: 12, design: .monospaced))
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
    enum Stage { case idle, awaitingMessage, awaitingReportType, awaitingReportId, awaitingReportMessage }

    @Published var lines: [SupportTerminalLine] = [
        SupportTerminalLine(id: 1, kind: .system,
                            text: "ByteAI Terminal v1.0 — type help or tap a command below.",
                            meta: nil)
    ]
    @Published var draft: String = ""
    @Published var loading: Bool = false
    @Published var stage: Stage = .idle

    private var nextId: Int = 2
    private var pendingType: String?
    private var pendingReportType: String?
    private var pendingReportId: String?
    private var hasLoadedContext = false

    // Command history — `↑` / `↓` keyboard accessory cycles through this ring.
    private var history: [String] = []
    private var historyCursor: Int = -1
    private static let maxHistory = 20

    var canRecallPrevious: Bool { !history.isEmpty && historyCursor < history.count - 1 }
    var canRecallNext: Bool { historyCursor > 0 }

    func recallPrevious() {
        guard canRecallPrevious else { return }
        historyCursor += 1
        draft = history[history.count - 1 - historyCursor]
        Haptics.selection()
    }

    func recallNext() {
        guard canRecallNext else { return }
        historyCursor -= 1
        draft = history[history.count - 1 - historyCursor]
        Haptics.selection()
    }

    /// Best-prefix tab completion against the available top-level commands.
    func tabComplete() {
        let prefix = draft.lowercased().trimmingCharacters(in: .whitespaces)
        guard !prefix.isEmpty else { return }
        let pool = ["help", "whoami", "history", "clear", "exit", "report",
                    "feedback -type good", "feedback -type bad", "feedback -type idea"]
        if let match = pool.first(where: { $0.hasPrefix(prefix) }), match != prefix {
            draft = match
            Haptics.light()
        }
    }

    func cancelAwaitingMessage() {
        guard stage == .awaitingMessage || stage == .awaitingReportType
                || stage == .awaitingReportId || stage == .awaitingReportMessage else { return }
        push(.error, "[!] cancelled")
        stage = .idle
        pendingType = nil
        pendingReportType = nil
        pendingReportId = nil
        draft = ""
    }

    /// Pushed once on first appear — adds a `whoami` snapshot + last 3 feedback rows so
    /// the terminal isn't a single intro line on iPhone.
    func loadInitialContext() async {
        guard !hasLoadedContext else { return }
        hasLoadedContext = true
        if let me = AuthManager.shared.currentUser {
            push(.output, "◆ logged in as @\(me.username) (Lv \(me.level))")
        }
        loading = true
        let items = (try? await APIClient.shared.getMyFeedbackHistory()) ?? []
        loading = false
        if !items.isEmpty {
            push(.output, "◆ Last \(min(items.count, 3)) submission\(items.count == 1 ? "" : "s"):")
            for f in items.prefix(3) {
                let date = formattedDate(f.createdAt)
                let preview = f.message.count > 40
                    ? String(f.message.prefix(40)) + "…"
                    : f.message
                pushRecord(text: preview,
                           meta: SupportTerminalLine.Meta(feedbackType: f.type, status: f.status, date: date))
            }
        }
    }

    private let helpText = [
        "  help                           show this menu",
        "  whoami                         show your profile info",
        "  feedback -type good            submit positive feedback",
        "  feedback -type bad             report a bug or issue",
        "  feedback -type idea            suggest a feature",
        "  report                         report offensive content",
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
        pendingReportType = nil
        pendingReportId = nil
    }

    func submitDraft(onClose: @escaping () -> Void) async {
        let raw = draft
        let trimmedLower = raw.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        guard !raw.trimmingCharacters(in: .whitespaces).isEmpty else { return }

        // Record into history ring — only commands, not free-text responses.
        if stage == .idle {
            recordHistory(raw)
        }
        historyCursor = -1

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

        if stage == .awaitingReportType {
            let t = raw.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
            guard ["byte", "comment", "interview", "chat"].contains(t) else {
                push(.error, "[!] Unknown type \"\(t)\". Use: byte, comment, interview, chat")
                return
            }
            pendingReportType = t
            stage = .awaitingReportId
            push(.output, "[?] Paste the content ID (UUID from the URL):")
            return
        }

        if stage == .awaitingReportId {
            let id = raw.trimmingCharacters(in: .whitespacesAndNewlines)
            let uuidPattern = "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$"
            guard (try? NSRegularExpression(pattern: uuidPattern))?.firstMatch(
                    in: id, range: NSRange(id.startIndex..., in: id)) != nil else {
                push(.error, "[!] That doesn't look like a valid ID. Copy it from the post URL.")
                return
            }
            pendingReportId = id
            stage = .awaitingReportMessage
            push(.output, "[?] Describe the issue (optional — press Enter to skip):")
            return
        }

        if stage == .awaitingReportMessage {
            let message: String? = raw.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
                ? nil
                : raw.trimmingCharacters(in: .whitespacesAndNewlines)
            guard let contentType = pendingReportType, let contentId = pendingReportId else {
                stage = .idle; return
            }
            loading = true
            do {
                _ = try await APIClient.shared.reportContent(contentType: contentType,
                                                             contentId: contentId,
                                                             message: message)
                push(.success, "[✓] Report submitted. Our team will review it.")
            } catch {
                push(.error, "[!] Report failed. Please try again.")
            }
            loading = false
            stage = .idle
            pendingReportType = nil
            pendingReportId = nil
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

        case .report:
            stage = .awaitingReportType
            push(.output, "[?] What type of content? (byte / comment / interview / chat):")

        case .unknown(let raw):
            push(.error, "[!] Unknown command: \"\(raw)\". Type help for available commands.")
        }
    }

    private func submit(type: String, message: String) async {
        loading = true
        defer { loading = false }
        do {
            _ = try await APIClient.shared.submitFeedback(
                type: type, message: message, pageContext: "ios:profile"
            )
            push(.success, "[✓] Feedback submitted (\(type)). Thank you!")
        } catch {
            // Moderation rejections render as one red error line per reason —
            // matches the terminal aesthetic of this screen. Fall back to the
            // generic failure line for any other error.
            if let rejection = APIError.rejection(from: error) {
                push(.error, "[!] CONTENT_REJECTED — feedback was not submitted.")
                for reason in rejection.reasons {
                    push(.error, "> ERROR: \(reason.code) — \(reason.message)")
                }
            } else {
                push(.error, "[!] Submission failed. Please try again.")
            }
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

    private func recordHistory(_ raw: String) {
        let cleaned = raw.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !cleaned.isEmpty else { return }
        if let last = history.last, last == cleaned { return }
        history.append(cleaned)
        if history.count > Self.maxHistory {
            history.removeFirst(history.count - Self.maxHistory)
        }
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
        case help, whoami, history, report
        case feedback(type: String, inlineMessage: String?)
        case unknown(String)
    }

    private func parse(_ raw: String) -> Parsed {
        let trimmed = raw.trimmingCharacters(in: .whitespacesAndNewlines)
        let lower = trimmed.lowercased()

        if lower == "help"    { return .help }
        if lower == "whoami"  { return .whoami }
        if lower == "history" { return .history }
        if lower == "report"  { return .report }

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

// MARK: - Support Quick Action chip strip

enum SupportQuickAction: Hashable {
    case help, whoami, history, clear
    case good, bad, idea
    case report
    case cancel

    var label: String {
        switch self {
        case .help:    return "help"
        case .whoami:  return "whoami"
        case .history: return "history"
        case .clear:   return "clear"
        case .good:    return "good"
        case .bad:     return "bad"
        case .idea:    return "idea"
        case .report:  return "report"
        case .cancel:  return "cancel"
        }
    }

    var glyph: String {
        switch self {
        case .help:    return "questionmark.circle"
        case .whoami:  return "person"
        case .history: return "clock.arrow.circlepath"
        case .clear:   return "xmark.bin"
        case .good:    return "hand.thumbsup.fill"
        case .bad:     return "exclamationmark.triangle.fill"
        case .idea:    return "lightbulb.fill"
        case .report:  return "flag.fill"
        case .cancel:  return "xmark"
        }
    }

    /// Token typed into the input on tap (commands only — feedback expands separately).
    var commandToken: String {
        switch self {
        case .help:    return "help"
        case .whoami:  return "whoami"
        case .history: return "history"
        case .clear:   return "clear"
        case .good:    return "good"
        case .bad:     return "bad"
        case .idea:    return "idea"
        case .report:  return "report"
        case .cancel:  return ""
        }
    }

    static func actions(for stage: SupportTerminalVM.Stage) -> [SupportQuickAction] {
        switch stage {
        case .idle:
            return [.help, .whoami, .good, .bad, .idea, .report, .history, .clear]
        case .awaitingMessage, .awaitingReportType, .awaitingReportId, .awaitingReportMessage:
            return [.cancel]
        }
    }
}

private struct SupportQuickChip: View {
    let action: SupportQuickAction
    let onTap: () -> Void

    var body: some View {
        Button(action: onTap) {
            HStack(spacing: 6) {
                Image(systemName: action.glyph)
                    .font(.system(size: 10, weight: .semibold))
                    .foregroundColor(action == .cancel ? .byteRed : .byteGreen)
                Text(action.label)
                    .font(.byteMono(11, weight: .semibold))
                    .tracking(0.4)
                    .foregroundColor(.byteText1)
            }
            .padding(.horizontal, 11)
            .padding(.vertical, 7)
            .background(action == .cancel ? IdentityColor.red.bgFaint : IdentityColor.green.bgFaint)
            .overlay(
                RoundedRectangle(cornerRadius: 8)
                    .stroke(action == .cancel ? IdentityColor.red.borderFaint : IdentityColor.green.borderFaint, lineWidth: 1)
            )
            .clipShape(RoundedRectangle(cornerRadius: 8))
        }
        .buttonStyle(.plain)
        .accessibilityLabel("\(action.label) shortcut")
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
    @State private var loadFailed = false
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
                            .font(.byteBodyMedium)
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
                    } else if loadFailed {
                        Spacer()
                        VStack(spacing: 8) {
                            Image(systemName: "exclamationmark.triangle.fill")
                                .font(.system(size: 28))
                                .foregroundColor(.byteRed)
                            Text("Couldn't load \(mode == .followers ? "followers" : "following")")
                                .font(.byteSans(14, weight: .semibold))
                                .foregroundColor(.byteRed)
                            Text("Pull down to retry.")
                                .font(.byteTerminalSmall)
                                .foregroundColor(.byteText2)
                        }
                        .multilineTextAlignment(.center)
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
                        // `.scrollBounceBehavior(.basedOnSize)` keeps short lists
                        // from bouncing — that overscroll was visually pulling on
                        // the static search bar above it through the shared VStack
                        // layout (the bar isn't inside the scroll view, but iOS's
                        // safe-area / content-margin animations during bounce
                        // re-flow the parent VStack). Locking bounce to "only when
                        // content actually overflows" is enough to make the search
                        // bar feel pinned. The list itself still bounces on long
                        // results, where overscroll feels natural.
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
                        .scrollBounceBehavior(.basedOnSize)
                    }
                }
            }
            // Static title — interpolating `people.count` made the title's
            // intrinsic width change on load, which re-laid out the toolbar
            // and rippled into the search field below ("dancing search bar").
            // `.toolbarBackground(.visible)` locks the bar's appearance so iOS
            // doesn't fade between scrollEdge/standard appearances as content
            // size changes — that fade was the residual cause of the bounce.
            .navigationTitle(mode.title)
            .navigationBarTitleDisplayMode(.inline)
            .toolbarBackground(Color.byteBackground, for: .navigationBar)
            .toolbarBackground(.visible, for: .navigationBar)
            .toolbarColorScheme(.dark, for: .navigationBar)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Done") { dismiss() }
                        .foregroundColor(.byteAccent)
                }
            }
        }
        .task { await fetchPeople() }
    }

    private func fetchPeople() async {
        isLoading = true; loadFailed = false
        do {
            people = mode == .followers
                ? try await APIClient.shared.getFollowers(userId: userId)
                : try await APIClient.shared.getFollowing(userId: userId)
        } catch {
            people = []
            loadFailed = true
        }
        isLoading = false
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
                    .font(.byteTerminalSmall)
                    .foregroundColor(.byteText2)
                if !person.role.isEmpty {
                    Text(person.role)
                        .font(.byteTerminalSmall)
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

                            // Hidden on simulator / devices without enrolled biometrics
                            // so the toggle never lies about being available.
                            if BiometricLock.shared.isAvailable {
                                AccentBarHeader(label: "PRIVACY & SECURITY", size: .compact)
                                BiometricLockToggleRow()
                                    .background(Color.byteCard)
                                    .overlay(RoundedRectangle(cornerRadius: 12).stroke(Color.byteBorderHigh, lineWidth: 1))
                                    .clipShape(RoundedRectangle(cornerRadius: 12))
                            }
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

/// Settings row for the FaceID/TouchID lock. Toggling **on** runs a real
/// biometric prompt first so we don't lie to the user about it working —
/// if the prompt fails or is cancelled, the toggle stays off.
private struct BiometricLockToggleRow: View {
    @State private var isEnabled = BiometricLock.shared.isEnabled
    @State private var errorMessage: String?

    private let lock = BiometricLock.shared

    var body: some View {
        VStack(spacing: 0) {
            HStack(spacing: 12) {
                VStack(alignment: .leading, spacing: 2) {
                    Text("Require \(lock.biometryType.label)")
                        .font(.byteSans(14, weight: .semibold))
                        .foregroundColor(.byteText1)
                    Text("Unlock ByteAI with \(lock.biometryType.label) when you reopen the app")
                        .font(.byteMono(10))
                        .foregroundColor(.byteText2)
                }
                Spacer()
                Toggle("", isOn: Binding(
                    get: { isEnabled },
                    set: { newValue in handleToggle(newValue) }
                ))
                .labelsHidden()
                .tint(.byteAccent)
            }
            .padding(.horizontal, 14).padding(.vertical, 12)

            if let errorMessage {
                Text(errorMessage)
                    .font(.byteMono(10))
                    .foregroundColor(.red)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(.horizontal, 14)
                    .padding(.bottom, 10)
            }
        }
    }

    private func handleToggle(_ newValue: Bool) {
        errorMessage = nil
        if newValue {
            // Prove the device can do it before we rely on it on cold launch.
            Task { @MainActor in
                do {
                    let ok = try await lock.evaluate(reason: "Enable \(lock.biometryType.label) for ByteAI")
                    if ok {
                        lock.isEnabled = true
                        isEnabled = true
                    }
                } catch {
                    isEnabled = false
                    errorMessage = "Couldn't enable \(lock.biometryType.label)"
                }
            }
        } else {
            lock.isEnabled = false
            isEnabled = false
        }
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

// MARK: - Tech Stack Prefs Editor (wrap-flow chips + ADD)
// Web parity (profile-screen.tsx tech stack section): selected stacks render as
// removable chips that wrap to multiple lines, followed by an ADD pill that
// expands into a typeable picker.

private struct TechStackPrefsEditor: View {
    @Binding var values: [String]
    let allOptions: [TechOption]
    @State private var isAdding = false

    private func label(for value: String) -> String {
        allOptions.first(where: { $0.value == value })?.label ?? value
    }

    private var addableOptions: [TechOption] {
        allOptions.filter { !values.contains($0.value) }
    }

    var body: some View {
        FlowLayout(spacing: 6) {
            ForEach(values, id: \.self) { v in
                Button {
                    withAnimation(.easeInOut(duration: 0.12)) {
                        values.removeAll { $0 == v }
                    }
                } label: {
                    HStack(spacing: 5) {
                        Text(label(for: v))
                            .font(.byteMono(11, weight: .semibold))
                        Image(systemName: "xmark")
                            .font(.system(size: 8, weight: .bold))
                            .opacity(0.6)
                    }
                    .foregroundColor(.byteAccent)
                    .padding(.horizontal, 10).padding(.vertical, 5)
                    .background(IdentityColor.blue.bgActive)
                    .overlay(Capsule().stroke(Color.byteAccent, lineWidth: 1))
                    .clipShape(Capsule())
                }
                .buttonStyle(.plain)
            }

            if isAdding {
                Menu {
                    if addableOptions.isEmpty {
                        Text("All stacks added")
                    } else {
                        ForEach(addableOptions, id: \.value) { opt in
                            Button(opt.label) {
                                if !values.contains(opt.value) { values.append(opt.value) }
                                isAdding = false
                            }
                        }
                    }
                } label: {
                    HStack(spacing: 5) {
                        Text("SELECT STACK")
                            .font(.byteMono(11, weight: .semibold))
                        Image(systemName: "chevron.down")
                            .font(.system(size: 9, weight: .bold))
                    }
                    .foregroundColor(.byteAccent)
                    .padding(.horizontal, 10).padding(.vertical, 5)
                    .background(IdentityColor.blue.bgFaint)
                    .overlay(Capsule().stroke(IdentityColor.blue.borderFaint, lineWidth: 1))
                    .clipShape(Capsule())
                }
                .menuStyle(.borderlessButton)

                Button { isAdding = false } label: {
                    Text("CANCEL")
                        .font(.byteMono(11, weight: .semibold))
                        .foregroundColor(.byteRed)
                        .padding(.horizontal, 10).padding(.vertical, 5)
                        .background(Color.byteRed.opacity(0.06))
                        .overlay(Capsule().stroke(Color.byteRed.opacity(0.3), lineWidth: 1))
                        .clipShape(Capsule())
                }
                .buttonStyle(.plain)
            } else {
                Button { isAdding = true } label: {
                    HStack(spacing: 5) {
                        Image(systemName: "plus")
                            .font(.system(size: 9, weight: .bold))
                        Text("ADD")
                            .font(.byteMono(11, weight: .semibold))
                    }
                    .foregroundColor(.byteAccent)
                    .padding(.horizontal, 10).padding(.vertical, 5)
                    .background(IdentityColor.blue.bgFaint)
                    .overlay(Capsule().stroke(IdentityColor.blue.borderFaint, lineWidth: 1))
                    .clipShape(Capsule())
                }
                .buttonStyle(.plain)
            }
        }
    }
}

// MARK: - Toolbar icon button with tinted background + spring press

private struct ProfileToolbarButton: View {
    let icon: String
    let tint: Color
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            ZStack {
                Circle()
                    .fill(tint.opacity(0.15))
                    .frame(width: 32, height: 32)
                Image(systemName: icon)
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundColor(tint)
            }
        }
        .buttonStyle(SpringPressButtonStyle())
    }
}

private struct SpringPressButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .scaleEffect(configuration.isPressed ? 0.86 : 1.0)
            .animation(.spring(response: 0.25, dampingFraction: 0.6), value: configuration.isPressed)
    }
}

