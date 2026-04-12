import SwiftUI
import ClerkKit

@main
struct ByteAIApp: App {
    @StateObject private var authManager = AuthManager.shared

    init() {
        configureNavigationAppearance()
        // Configure Clerk with publishable key from Info.plist
        let key = Bundle.main.object(forInfoDictionaryKey: "ClerkPublishableKey") as? String ?? ""
        Clerk.configure(publishableKey: key)
    }

    var body: some Scene {
        WindowGroup {
            RootView()
                .environmentObject(authManager)
                .preferredColorScheme(.dark)
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
}
