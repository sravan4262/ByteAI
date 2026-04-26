import UIKit
import UserNotifications
import GoogleSignIn

final class AppDelegate: NSObject, UIApplicationDelegate, UNUserNotificationCenterDelegate, UIGestureRecognizerDelegate {
    func application(_ application: UIApplication,
                     didFinishLaunchingWithOptions options: [UIApplication.LaunchOptionsKey : Any]?) -> Bool {
        UNUserNotificationCenter.current().delegate = self
        installGlobalTapToDismissKeyboard()
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
        print("[Push] registration failed: \(error.localizedDescription)")
    }

    // MARK: - Foreground presentation

    func userNotificationCenter(_ center: UNUserNotificationCenter,
                                willPresent notification: UNNotification) async
                                -> UNNotificationPresentationOptions {
        return [.banner, .sound, .badge]
    }

    // MARK: - Tap → deep link

    func userNotificationCenter(_ center: UNUserNotificationCenter,
                                didReceive response: UNNotificationResponse) async {
        let info = response.notification.request.content.userInfo
        if let postId = info["byteId"] as? String {
            await DeepLinkRouter.shared.openPost(id: postId)
        } else if let conversationId = info["conversationId"] as? String {
            await DeepLinkRouter.shared.openConversation(id: conversationId)
        } else if info["type"] as? String == "notification" {
            await DeepLinkRouter.shared.openNotifications()
        }
    }
}
