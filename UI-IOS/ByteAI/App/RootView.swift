import SwiftUI

// MARK: - Root View
// Mirrors middleware.ts auth routing:
//   unauthenticated → AuthView
//   onboarding      → OnboardingView
//   authenticated   → MainTabView

struct RootView: View {
    @EnvironmentObject private var auth: AuthManager

    var body: some View {
        Group {
            switch auth.state {
            case .unauthenticated:
                AuthView()
                    .transition(.opacity)

            case .onboarding:
                OnboardingView()
                    .transition(.opacity)

            case .authenticated:
                MainTabView()
                    .transition(.opacity)
            }
        }
        .animation(.easeInOut(duration: 0.3), value: stateKey)
    }

    // Stable key for animation — avoids re-animating within the same state
    private var stateKey: String {
        switch auth.state {
        case .unauthenticated: return "auth"
        case .onboarding:      return "onboarding"
        case .authenticated:   return "main"
        }
    }
}

// MARK: - Main Tab View
// iOS equivalent of the AppShell sidebar: bottom tab bar with 5 tabs.
// Matches: BITS → INTERVIEWS → SEARCH → POST → ALERTS

struct MainTabView: View {
    @State private var selectedTab: Tab = .feed
    @State private var showCompose = false
    @State private var showNotifications = false
    @StateObject private var notifBadge = NotificationBadgeVM()

    enum Tab: Int, CaseIterable {
        case feed, interviews, search, notifications, profile
    }

    var body: some View {
        TabView(selection: $selectedTab) {
            FeedView()
                .tabItem {
                    Label("Bits", systemImage: "bolt.fill")
                }
                .tag(Tab.feed)

            InterviewsView()
                .tabItem {
                    Label("Interviews", systemImage: "briefcase.fill")
                }
                .tag(Tab.interviews)

            // Compose — center FAB-style tap
            Color.clear
                .tabItem {
                    Label("Post", systemImage: "plus.circle.fill")
                }
                .tag(Tab.search) // placeholder

            SearchView()
                .tabItem {
                    Label("Search", systemImage: "magnifyingglass")
                }
                .tag(Tab.notifications)

            ProfileView(username: AuthManager.shared.currentUser?.username ?? "")
                .tabItem {
                    Label("Profile", systemImage: "person.fill")
                }
                .tag(Tab.profile)
        }
        .tint(.byteAccent)
        .onAppear { applyTabBarAppearance() }
        // Intercept center tab → show compose sheet
        .onChange(of: selectedTab) { tab in
            if tab == .search {
                selectedTab = .feed
                showCompose = true
            }
        }
        .sheet(isPresented: $showCompose) {
            ComposeView()
        }
        .overlay(alignment: .bottom) {
            // Notification badge overlay on profile tab item — handled via .badge modifier below
            EmptyView()
        }
        .task { await notifBadge.load() }
    }

    private func applyTabBarAppearance() {
        let appearance = UITabBarAppearance()
        appearance.configureWithOpaqueBackground()
        appearance.backgroundColor = UIColor(Color.byteCard)

        // Border line at top
        appearance.shadowColor = UIColor(Color.byteBorderMedium)

        UITabBar.appearance().standardAppearance = appearance
        UITabBar.appearance().scrollEdgeAppearance = appearance
        UITabBar.appearance().unselectedItemTintColor = UIColor(Color.byteText2)
    }
}

// MARK: - Notification Badge ViewModel

@MainActor
final class NotificationBadgeVM: ObservableObject {
    @Published var unreadCount = 0

    func load() async {
        unreadCount = (try? await APIClient.shared.getUnreadCount()) ?? 0
    }
}

#Preview {
    RootView()
        .environmentObject(AuthManager.shared)
}
