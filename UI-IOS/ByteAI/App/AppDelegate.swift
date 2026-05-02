import UIKit
import UserNotifications
import GoogleSignIn

final class AppDelegate: NSObject, @preconcurrency UIApplicationDelegate, UNUserNotificationCenterDelegate, UIGestureRecognizerDelegate {
    func application(_ application: UIApplication,
                     didFinishLaunchingWithOptions options: [UIApplication.LaunchOptionsKey : Any]?) -> Bool {
        UNUserNotificationCenter.current().delegate = self
        installGlobalTapToDismissKeyboard()

        // Cold-launch via a home-screen quick action: stash it for handling once
        // RootView is mounted and the user has authenticated. Returning false
        // here is the documented way to prevent UIKit from also calling
        // performActionFor on the same action.
        if let item = options?[.shortcutItem] as? UIApplicationShortcutItem {
            QuickActionRouter.shared.pending = item.type
            return false
        }
        return true
    }

    // Warm-launch path: app is already running when the user picks a quick action.
    func application(_ application: UIApplication,
                     performActionFor shortcutItem: UIApplicationShortcutItem) async -> Bool {
        await MainActor.run { QuickActionRouter.shared.handle(type: shortcutItem.type) }
        return true
    }

    // GoogleSignIn 8.x uses ASWebAuthenticationSession by default, but still
    // forwards URLs through this hook on the legacy fallback path.
    func application(_ app: UIApplication, open url: URL,
                     options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        GIDSignIn.sharedInstance.handle(url)
    }

    /// Window-level tap gesture: a single tap anywhere on the screen resigns the
    /// first responder, so the keyboard always closes when the user taps off a field.
    /// `cancelsTouchesInView = false` keeps every other tap (Buttons, list rows, links)
    /// working normally; the recognizer just rides along.
    private func installGlobalTapToDismissKeyboard() {
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) { [weak self] in
            guard let window = UIApplication.shared.connectedScenes
                .compactMap({ $0 as? UIWindowScene })
                .first?.windows.first else { return }
            let tap = UITapGestureRecognizer(
                target: window, action: #selector(UIView.endEditing(_:))
            )
            tap.cancelsTouchesInView = false
            tap.delegate = self
            window.addGestureRecognizer(tap)
        }
    }

    func gestureRecognizer(_ gestureRecognizer: UIGestureRecognizer,
                           shouldRecognizeSimultaneouslyWith other: UIGestureRecognizer) -> Bool {
        true
    }

    // MARK: - APNs registration

    func application(_ application: UIApplication,
                     didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        let token = deviceToken.map { String(format: "%02x", $0) }.joined()
        UserDefaults.standard.set(token, forKey: "byteai_apns_token")
        Task { try? await APIClient.shared.registerDevice(apnsToken: token) }
    }

    func application(_ application: UIApplication,
                     didFailToRegisterForRemoteNotificationsWithError error: Error) {
        dprint("[Push] registration failed: \(error.localizedDescription)")
    }

    // MARK: - Foreground presentation

    func userNotificationCenter(_ center: UNUserNotificationCenter,
                                willPresent notification: UNNotification) async
                                -> UNNotificationPresentationOptions {
        // Broadcast the payload so already-mounted views (bell badge,
        // notification list) can update their state without a network
        // round-trip. The system still shows the banner / plays sound — we
        // just enrich the in-app state in parallel.
        let userInfo = notification.request.content.userInfo
        await MainActor.run {
            NotificationCenter.default.post(
                name: .pushReceived,
                object: nil,
                userInfo: userInfo
            )
        }
        return [.banner, .sound, .badge]
    }

    // MARK: - Tap → deep link

    func userNotificationCenter(_ center: UNUserNotificationCenter,
                                didReceive response: UNNotificationResponse) async {
        let info = response.notification.request.content.userInfo
        await MainActor.run {
            if let postId = info["byteId"] as? String {
                DeepLinkRouter.shared.openPost(id: postId)
            } else if let conversationId = info["conversationId"] as? String {
                DeepLinkRouter.shared.openConversation(id: conversationId)
            } else if info["type"] as? String == "notification" {
                DeepLinkRouter.shared.openNotifications()
            }
        }
    }
}
