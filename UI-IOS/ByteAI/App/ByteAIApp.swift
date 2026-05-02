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
    @StateObject private var gestures = GestureManager.shared

    init() {
        configureNavigationAppearance()
        configureURLCache()
    }

    @State private var splashFinished = false

    var body: some Scene {
        WindowGroup {
            ZStack {
                RootView()
                    .overlay(alignment: .top) { ToastOverlay() }
                    .environmentObject(authManager)
                    .environmentObject(flags)
                    .environmentObject(chat)
                    .environmentObject(router)
                    .environmentObject(toasts)
                    .environmentObject(gestures)
                    .preferredColorScheme(themeManager.current.preferredColorScheme)
                    // Cap Dynamic Type at xxxLarge so the layout doesn't explode at the
                    // accessibility scales. Users can still scale up to the cap.
                    .dynamicTypeSize(.xSmall ... .xxxLarge)
                    .onOpenURL { handleIncomingURL($0) }

                // Animated post-launch splash — sits on top of RootView and fades
                // out after ~1.4s. Apple disallows animated launch screens, so we
                // hand off from the static UILaunchScreen to this animated layer
                // the moment SwiftUI takes over.
                if !splashFinished {
                    LaunchSplashView()
                        .transition(.opacity)
                        .task {
                            try? await Task.sleep(nanoseconds: 1_400_000_000)
                            withAnimation(.easeInOut(duration: 0.45)) {
                                splashFinished = true
                            }
                        }
                }
            }
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

    /// Routes every URL the app receives — Apple universal links, OAuth
    /// callback redirects (`com.byteai.app://`), and any future custom schemes.
    ///
    /// Universal links land here as full `https://` URLs whose host matches an
    /// `applinks:` entry in the entitlements. We dispatch by path to the
    /// matching `DeepLinkRouter` channel; everything else falls through to the
    /// auth manager so OAuth/magic-link flows continue to work unchanged.
    @MainActor
    private func handleIncomingURL(_ url: URL) {
        if let host = url.host?.lowercased(), isShareHost(host) {
            // Path can have a leading slash; split once and inspect the first
            // two non-empty components: ["post", "<id>"] or ["interviews", "<id>"].
            let parts = url.path.split(separator: "/").map(String.init)
            if parts.count >= 2 {
                let kind = parts[0].lowercased()
                let id = parts[1]
                switch kind {
                case "post":
                    router.openPost(id: id)
                    return
                case "interviews", "interview":
                    router.openInterview(id: id)
                    return
                default:
                    break
                }
            }
        }
        // Anything else (Supabase OAuth redirect, magic link, GoogleSignIn fallback) → auth.
        authManager.handle(url: url)
    }

    /// Hosts we consider "ours" for share-link routing. Must stay in sync with
    /// `applinks:` entries in `ByteAI.entitlements` / `ByteAI.Debug.entitlements`.
    private func isShareHost(_ host: String) -> Bool {
        let known: Set<String> = [
            "byteaiofficial.com",
            "www.byteaiofficial.com",
            "staging.byteaiofficial.com",
            "dev.byteaiofficial.com",
        ]
        if known.contains(host) { return true }
        // Also accept whatever shareBaseURL points at — keeps prod/staging/dev
        // override builds working without touching this list.
        return AppConfig.shareBaseURL.host?.lowercased() == host
    }
}
