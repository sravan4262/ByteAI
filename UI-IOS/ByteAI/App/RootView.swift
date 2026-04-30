import SwiftUI
import UserNotifications

// MARK: - Root View
//   unauthenticated → AuthView
//   onboarding      → OnboardingView
//   authenticated   → MainTabView

struct RootView: View {
    @EnvironmentObject private var auth: AuthManager
    @EnvironmentObject private var flags: FeatureFlagsManager
    @EnvironmentObject private var chat: ChatService
    @EnvironmentObject private var router: DeepLinkRouter
    @Environment(\.scenePhase) private var scenePhase

    var body: some View {
        Group {
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
        .animation(.easeInOut(duration: 0.3), value: stateKey)
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
    @StateObject private var notifBadge = NotificationBadgeVM()
    @EnvironmentObject private var auth: AuthManager
    @EnvironmentObject private var router: DeepLinkRouter
    @EnvironmentObject private var chat: ChatService
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
            await MainActor.run {
                let total = notifBadge.unreadCount + chat.unreadCount
                UIApplication.shared.applicationIconBadgeNumber = total
            }
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
            self.unreadCount = max(0, self.unreadCount + delta)
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
}
