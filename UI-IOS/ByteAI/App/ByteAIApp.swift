import SwiftUI

@main
struct ByteAIApp: App {
    @UIApplicationDelegateAdaptor(AppDelegate.self) private var appDelegate
    @StateObject private var authManager = AuthManager.shared
    @StateObject private var flags = FeatureFlagsManager.shared
    @StateObject private var chat = ChatService.shared
    @StateObject private var router = DeepLinkRouter.shared
    @StateObject private var toasts = ToastCenter.shared
    @StateObject private var themeManager = ThemeManager.shared

    init() {
        configureNavigationAppearance()
        configureURLCache()
    }

    var body: some Scene {
        WindowGroup {
            RootView()
                .overlay(alignment: .top) { ToastOverlay() }
                .environmentObject(authManager)
                .environmentObject(flags)
                .environmentObject(chat)
                .environmentObject(router)
                .environmentObject(toasts)
                .preferredColorScheme(themeManager.current.preferredColorScheme)
                // Cap Dynamic Type at xxxLarge so the layout doesn't explode at the
                // accessibility scales. Users can still scale up to the cap.
                .dynamicTypeSize(.xSmall ... .xxxLarge)
                .onOpenURL { authManager.handle(url: $0) }
        }
    }

    private func configureNavigationAppearance() {
        let appearance = UINavigationBarAppearance()
        appearance.configureWithOpaqueBackground()
        appearance.backgroundColor = UIColor(Color.byteBackground)
        appearance.shadowColor = UIColor(Color.byteBorderMedium)
        appearance.titleTextAttributes = [
            .foregroundColor: UIColor(Color.byteText1),
            .font: UIFont.systemFont(ofSize: 16, weight: .semibold)
        ]
        UINavigationBar.appearance().standardAppearance = appearance
        UINavigationBar.appearance().scrollEdgeAppearance = appearance
        UINavigationBar.appearance().compactAppearance = appearance
    }

    private func configureURLCache() {
        // 50 MB disk + 10 MB memory image cache (avatars, post media).
        URLCache.shared = URLCache(
            memoryCapacity: 10 * 1024 * 1024,
            diskCapacity: 50 * 1024 * 1024,
            diskPath: "byteai_url_cache"
        )
    }
}
