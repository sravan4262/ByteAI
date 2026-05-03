import SwiftUI

/// Same regex as the backend `MentionExtractor`: 3–50 chars, lookarounds prevent
/// matches inside emails (foo@bar.com) or word continuations.
private let mentionPattern: NSRegularExpression = {
    // swiftlint:disable:next force_try
    try! NSRegularExpression(
        pattern: #"(?<![A-Za-z0-9_])@([A-Za-z0-9_]{3,50})(?![A-Za-z0-9_])"#
    )
}()

/// Builds an `AttributedString` from a body, turning each `@username` mention
/// into an accent-colored tappable link. The link uses a custom `byteai://`
/// scheme so we can intercept it (see `.environment(\.openURL, ...)` handler in
/// any view that renders mention text) and route to the in-app profile.
///
/// Web parity: `UI/lib/utils/render-mentions.tsx`.
func renderMentions(_ body: String) -> AttributedString {
    var attributed = AttributedString(body)
    let nsBody = body as NSString
    let range = NSRange(location: 0, length: nsBody.length)

    for match in mentionPattern.matches(in: body, range: range).reversed() {
        guard match.numberOfRanges >= 2 else { continue }
        let usernameRange = match.range(at: 1)
        let username = nsBody.substring(with: usernameRange)

        // Locate the mention range in the AttributedString — convert from NSRange.
        guard let attrRange = Range(match.range, in: attributed) else { continue }

        attributed[attrRange].link = URL(string: "byteai://profile/\(username)")
        attributed[attrRange].foregroundColor = .byteAccent
        attributed[attrRange].underlineStyle = .single
    }

    return attributed
}

/// View modifier that intercepts `byteai://profile/<username>` links inside a
/// rendered `Text(AttributedString)` and pushes the matching ProfileView onto
/// the navigation stack provided by `path`.
///
/// Usage:
///   Text(renderMentions(post.body))
///       .handleMentionTaps()
struct MentionTapHandler: ViewModifier {
    func body(content: Content) -> some View {
        content.environment(\.openURL, OpenURLAction { url in
            guard url.scheme == "byteai", url.host == "profile" else {
                return .systemAction
            }
            let username = url.lastPathComponent
            // Posts a notification that the app's root navigation observer can
            // pick up. Lightweight + avoids threading a binding through every
            // call site.
            NotificationCenter.default.post(
                name: .byteAIOpenProfile,
                object: nil,
                userInfo: ["username": username]
            )
            return .handled
        })
    }
}

extension View {
    func handleMentionTaps() -> some View { modifier(MentionTapHandler()) }
}

extension Notification.Name {
    static let byteAIOpenProfile = Notification.Name("byteAIOpenProfile")
}
