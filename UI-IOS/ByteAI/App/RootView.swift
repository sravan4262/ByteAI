import SwiftUI
import UserNotifications
import LocalAuthentication

// MARK: - Root View
//   unauthenticated → AuthView
//   onboarding      → OnboardingView
//   authenticated   → MainTabView

struct RootView: View {
    @EnvironmentObject private var auth: AuthManager
    @EnvironmentObject private var flags: FeatureFlagsManager
    @EnvironmentObject private var chat: ChatService
    @EnvironmentObject private var router: DeepLinkRouter
    @EnvironmentObject private var gestures: GestureManager
    @Environment(\.scenePhase) private var scenePhase

    /// Debounce window for auto-FaceID. Banner-tap re-activations and brief
    /// system sheets can fire `.active` again moments after a successful
    /// unlock — re-prompting in those cases is jarring.
    @State private var lastUnlockedAt: Date = .distantPast

    /// Set when the API returns 403 ACCOUNT_SUSPENDED. While present, overlays
    /// AccountSuspendedView in place of any other UI; tapping SIGN OUT clears
    /// the local Supabase session and routes back to the auth screen.
    @State private var suspensionMessage: String?

    var body: some View {
        Group {
            if let suspensionMessage {
                AccountSuspendedView(message: suspensionMessage) {
                    Task {
                        await auth.signOut()
                        self.suspensionMessage = nil
                    }
                }
                .transition(.opacity)
            } else {
                switch auth.state {
                case .unauthenticated:
                    AuthView().transition(.opacity)
                case .onboarding:
                    OnboardingView().transition(.opacity)
                case .locked:
                    BiometricLockView().transition(.opacity)
                case .authenticated:
                    MainTabView().transition(.opacity)
                }
            }
        }
        .animation(.easeInOut(duration: 0.3), value: stateKey)
        // Shake → Support terminal (authenticated only)
        .onReceive(NotificationCenter.default.publisher(for: .deviceDidShake)) { _ in
            guard case .authenticated = auth.state else { return }
            gestures.openSupport()
        }
        // Global Support terminal sheet
        .sheet(isPresented: $gestures.showSupportTerminal) {
            SupportTerminalView()
                .presentationDetents([.large])
                .presentationDragIndicator(.visible)
                .presentationBackground(Color.byteCard)
                .presentationCornerRadius(20)
        }
        // Global Chat terminal sheet
        .sheet(isPresented: $gestures.showChatTerminal) {
            ChatTerminalSheet { convo in
                gestures.showChatTerminal = false
                gestures.chatConversation = convo
            }
            .environmentObject(chat)
            .presentationDetents([.large])
            .presentationDragIndicator(.visible)
            .presentationBackground(Color.byteCard)
            .presentationCornerRadius(20)
        }
        .onReceive(NotificationCenter.default.publisher(for: .apiDidReceiveAccountSuspended)) { note in
            let msg = (note.userInfo?["message"] as? String)
                ?? "Your account has been suspended."
            suspensionMessage = msg
        }
        .onChange(of: auth.state) { _, newState in
            if case .authenticated = newState {
                Task {
                    flags.start()
                    await chat.start()
                    await requestPushPermission()
                }
            } else {
                flags.stop()
                Task { await chat.stop() }
            }
        }
        .onChange(of: scenePhase) { _, phase in
            switch phase {
            case .active:
                if case .authenticated = auth.state {
                    Task { await chat.start() }
                }
                // Auto-prompt FaceID on foreground. The Supabase session is
                // still alive (FaceID is just a UI gate), so unlocking here
                // is only a transition from `.locked` → `.authenticated`.
                if case .locked = auth.state,
                   BiometricLock.shared.isEnabled,
                   BiometricLock.shared.isAvailable {
                    Task { await autoUnlockOnForeground() }
                }
            case .background:
                // FaceID enabled? Re-lock so the next foreground starts at
                // the lock screen. Doing this here (not on .inactive) avoids
                // flashing the lock view while a system sheet is briefly up.
                if BiometricLock.shared.isEnabled,
                   case .authenticated = auth.state {
                    auth.lock()
                }
                Task { await chat.stop() }
            default:
                break
            }
        }
    }

    /// Auto-FaceID flow triggered on `scenePhase → .active`.
    ///
    /// Flow:
    ///   1. Debounce: skip if we just unlocked <30s ago (banner-tap re-activations).
    ///   2. Run the system FaceID/TouchID prompt.
    ///   3. On success: flip auth state, then refresh the Supabase token in the
    ///      background so the user returns to a guaranteed-fresh session.
    ///   4. If the refresh token is dead, surface the sign-in screen via signOut.
    ///   5. On user-cancel / user-fallback, leave `BiometricLockView` mounted so the
    ///      manual "Unlock" button is available.
    ///   6. On app/system cancel (e.g. another sheet stole focus), retry on next `.active`.
    @MainActor
    private func autoUnlockOnForeground() async {
        if Date().timeIntervalSince(lastUnlockedAt) < 30 { return }

        do {
            let ok = try await BiometricLock.shared.evaluate(reason: "Unlock ByteAI")
            guard ok else { return }
            auth.unlock()
            lastUnlockedAt = Date()
            // Token refresh is best-effort — if Supabase has already
            // refreshed silently this is a no-op. If the refresh token
            // is dead, sign out so the user lands on the auth screen
            // instead of seeing 401s on the next API call.
            do {
                try await auth.refreshSession()
            } catch {
                print("[Auth] auto-unlock refreshSession failed: \(error) — signing out")
                await auth.signOut()
            }
        } catch let nsError as NSError {
            switch nsError.code {
            case LAError.userCancel.rawValue, LAError.userFallback.rawValue:
                // User explicitly dismissed → fall back to manual unlock UI.
                break
            case LAError.appCancel.rawValue, LAError.systemCancel.rawValue:
                // Interrupted by another sheet / OS → next `.active` will retry.
                break
            default:
                break
            }
        }
    }

    private var stateKey: String {
        switch auth.state {
        case .unauthenticated: return "auth"
        case .onboarding:      return "onboarding"
        case .locked:          return "locked"
        case .authenticated:   return "main"
        }
    }

    @MainActor
    private func requestPushPermission() async {
        let center = UNUserNotificationCenter.current()
        let granted = (try? await center.requestAuthorization(options: [.alert, .sound, .badge])) ?? false
        if granted {
            UIApplication.shared.registerForRemoteNotifications()
        }
    }
}

// MARK: - Main Tab View

struct MainTabView: View {
    @State private var selectedTab: Tab = .feed
    @State private var previousTab: Tab = .feed
    @State private var showCompose = false
    @State private var showNotifications = false
    @State private var showBiometricOptIn = false
    @State private var feedScrollToTop = 0
    @State private var lastMagnification: CGFloat = 1.0
    @StateObject private var notifBadge = NotificationBadgeVM()
    @EnvironmentObject private var auth: AuthManager
    @EnvironmentObject private var router: DeepLinkRouter
    @EnvironmentObject private var chat: ChatService
    @EnvironmentObject private var gestures: GestureManager
    @ObservedObject private var themeManager = ThemeManager.shared

    enum Tab: Int, CaseIterable {
        case feed, interviews, compose, search, profile
    }

    var body: some View {
        TabView(selection: $selectedTab) {
            FeedView(scrollToTopTrigger: feedScrollToTop)
                .tabItem { Label("Bits", systemImage: "bolt.fill") }
                .tag(Tab.feed)

            InterviewsView()
                .tabItem { Label("Interviews", systemImage: "briefcase.fill") }
                .tag(Tab.interviews)

            // Compose — center FAB-style tap (intercepted; never actually selected)
            Color.clear
                .tabItem { Label("Post", systemImage: "plus.circle.fill") }
                .tag(Tab.compose)

            SearchView()
                .tabItem { Label("Search", systemImage: "magnifyingglass") }
                .tag(Tab.search)

            ProfileView(username: auth.currentUser?.username ?? "")
                .tabItem { Label("Profile", systemImage: "person.fill") }
                .tag(Tab.profile)
                .badge(notifBadge.unreadCount > 0 ? notifBadge.unreadCount : 0)
        }
        .id(themeManager.current.rawValue)
        .tint(.byteAccent)
        .onAppear { applyTabBarAppearance() }
        .onChange(of: themeManager.current) { _, _ in applyTabBarAppearance() }
        .onChange(of: selectedTab) { oldValue, newValue in
            if newValue == .compose {
                selectedTab = previousTab
                showCompose = true
                Haptics.light()
            } else {
                if oldValue == newValue, newValue == .feed {
                    // Tap the active feed tab → scroll-to-top
                    feedScrollToTop &+= 1
                }
                previousTab = newValue
            }
        }
        .sheet(isPresented: $showCompose) { ComposeView() }
        .sheet(isPresented: $showNotifications) { NotificationsView() }
        .sheet(isPresented: $showBiometricOptIn) {
            BiometricOptInSheet()
                .presentationDetents([.height(360)])
                .presentationDragIndicator(.visible)
        }
        .onChange(of: router.requestedTab) { _, tab in
            if let raw = tab, let t = Tab(rawValue: raw) {
                selectedTab = t
            }
        }
        .onChange(of: router.showNotifications) { _, show in
            showNotifications = show
            if !show { router.showNotifications = false }
        }
        .task { await notifBadge.load() }
        .task {
            // Surface the FaceID opt-in sheet exactly once per device, and
            // only when biometrics are actually enrolled. Mark hasPrompted
            // up-front so a force-quit before the user answers doesn't
            // re-prompt next launch.
            try? await Task.sleep(nanoseconds: 600_000_000)
            if BiometricLock.shared.isAvailable,
               !BiometricLock.shared.hasPrompted,
               !BiometricLock.shared.isEnabled {
                BiometricLock.shared.hasPrompted = true
                showBiometricOptIn = true
            }
        }
        .task(id: chat.unreadCount) {
            let total = notifBadge.unreadCount + chat.unreadCount
            try? await UNUserNotificationCenter.current().setBadgeCount(total)
        }
        // Pinch to zoom entire app; double-tap to reset.
        .scaleEffect(gestures.zoomScale, anchor: .center)
        .gesture(
            MagnificationGesture()
                .onChanged { value in
                    gestures.applyZoomDelta(value / lastMagnification)
                    lastMagnification = value
                }
                .onEnded { _ in lastMagnification = 1.0 }
        )
        .simultaneousGesture(
            TapGesture(count: 2)
                .onEnded { gestures.resetZoom() }
        )
        // Bottom-right edge swipe → Chat terminal.
        .overlay(alignment: .bottomTrailing) {
            Color.clear
                .frame(width: 80, height: 80)
                .contentShape(Rectangle())
                .gesture(
                    DragGesture(minimumDistance: 40)
                        .onEnded { value in
                            guard value.translation.height < -40 else { return }
                            gestures.openChat()
                        }
                )
                .padding(.bottom, 83)
        }
    }

    private func applyTabBarAppearance() {
        let tab = UITabBarAppearance()
        tab.configureWithOpaqueBackground()
        tab.backgroundColor = UIColor(Color.byteCard)
        tab.shadowColor = UIColor(Color.byteBorderMedium)
        UITabBar.appearance().standardAppearance = tab
        UITabBar.appearance().scrollEdgeAppearance = tab
        UITabBar.appearance().unselectedItemTintColor = UIColor(Color.byteText2)

        let nav = UINavigationBarAppearance()
        nav.configureWithOpaqueBackground()
        nav.backgroundColor = UIColor(Color.byteBackground)
        nav.shadowColor = UIColor(Color.byteBorderMedium)
        nav.titleTextAttributes = [
            .foregroundColor: UIColor(Color.byteText1),
            .font: UIFont.systemFont(ofSize: 16, weight: .semibold)
        ]
        UINavigationBar.appearance().standardAppearance = nav
        UINavigationBar.appearance().scrollEdgeAppearance = nav
        UINavigationBar.appearance().compactAppearance = nav
    }
}

// MARK: - Notification Badge ViewModel

@MainActor
final class NotificationBadgeVM: ObservableObject {
    @Published var unreadCount = 0
    private var observer: NSObjectProtocol?

    init() {
        observer = NotificationCenter.default.addObserver(
            forName: .notificationsMarkedRead, object: nil, queue: .main
        ) { [weak self] note in
            guard let self else { return }
            let delta = (note.userInfo?["delta"] as? Int) ?? 0
            MainActor.assumeIsolated {
                self.unreadCount = max(0, self.unreadCount + delta)
            }
        }
    }

    func load() async {
        unreadCount = (try? await APIClient.shared.getUnreadCount()) ?? 0
    }
}

#Preview {
    RootView()
        .environmentObject(AuthManager.shared)
        .environmentObject(FeatureFlagsManager.shared)
        .environmentObject(ChatService.shared)
        .environmentObject(DeepLinkRouter.shared)
        .environmentObject(ToastCenter.shared)
        .environmentObject(GestureManager.shared)
}
