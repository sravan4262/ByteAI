import SwiftUI

/// Trailing "…" menu for posts, comments, profile, and chat surfaces.
/// Wraps Report (always offered for non-self content) and an optional Block.
struct ContentOverflowMenu: View {
    let contentType: String
    let contentId: String
    let isOwnContent: Bool
    /// Author of the content. When non-nil and `showBlock = true`, the menu
    /// also offers "Block @username".
    let authorUserId: String?
    let authorUsername: String?
    var showBlock: Bool = false
    var onBlocked: (() -> Void)? = nil

    @State private var showReportSheet: Bool = false
    @State private var showBlockConfirm: Bool = false

    var body: some View {
        if isOwnContent {
            EmptyView()
        } else {
            Menu {
                Button {
                    showReportSheet = true
                } label: {
                    Label("Report", systemImage: "flag")
                }

                if showBlock, let username = authorUsername, authorUserId != nil {
                    Button(role: .destructive) {
                        showBlockConfirm = true
                    } label: {
                        Label("Block @\(username)", systemImage: "hand.raised")
                    }
                }
            } label: {
                Image(systemName: "ellipsis")
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundStyle(.secondary)
                    .frame(width: 32, height: 32)
                    .contentShape(Rectangle())
            }
            .accessibilityLabel("More options")
            .sheet(isPresented: $showReportSheet) {
                ReportSheet(contentType: contentType, contentId: contentId)
                    .presentationDetents([.medium, .large])
            }
            .alert("Block @\(authorUsername ?? "user")?", isPresented: $showBlockConfirm) {
                Button("Cancel", role: .cancel) {}
                Button("Block", role: .destructive) {
                    Task { await performBlock() }
                }
            } message: {
                Text("They won't see your posts and you won't see theirs. Existing follows will be removed in both directions.")
            }
        }
    }

    private func performBlock() async {
        guard let id = authorUserId else { return }
        do {
            try await APIClient.shared.blockUser(id)
            ToastCenter.shared.show("Blocked @\(authorUsername ?? "user")")
            onBlocked?()
        } catch {
            ToastCenter.shared.show("Couldn't block user", kind: .error)
        }
    }
}

// MARK: - @-mention rendering (Phase 1.4.5)
//
// Lives here rather than its own file because the Xcode project tracks files
// by explicit pbxproj reference; ContentOverflowMenu.swift is already tracked,
// so colocating these helpers here avoids a project-file edit.

/// Same regex as the backend `MentionExtractor`: 3–50 chars, lookarounds prevent
/// matches inside emails (foo@bar.com) or word continuations.
private let _byteAIMentionPattern: NSRegularExpression = {
    // swiftlint:disable:next force_try
    try! NSRegularExpression(
        pattern: #"(?<![A-Za-z0-9_])@([A-Za-z0-9_]{3,50})(?![A-Za-z0-9_])"#
    )
}()

/// Builds an `AttributedString` from a body, turning each `@username` mention
/// into an accent-colored tappable link. The link uses a custom `byteai://`
/// scheme so `.handleMentionTaps()` can intercept it and route to the in-app
/// profile via `byteAIOpenProfile` notifications.
///
/// Web parity: `UI/lib/utils/render-mentions.tsx`.
func renderMentions(_ body: String) -> AttributedString {
    var attributed = AttributedString(body)
    let nsBody = body as NSString
    let range = NSRange(location: 0, length: nsBody.length)

    for match in _byteAIMentionPattern.matches(in: body, range: range).reversed() {
        guard match.numberOfRanges >= 2 else { continue }
        let usernameRange = match.range(at: 1)
        let username = nsBody.substring(with: usernameRange)

        guard let attrRange = Range(match.range, in: attributed) else { continue }

        attributed[attrRange].link = URL(string: "byteai://profile/\(username)")
        attributed[attrRange].foregroundColor = .byteAccent
        attributed[attrRange].underlineStyle = .single
    }

    return attributed
}

/// Intercepts `byteai://profile/<username>` taps and posts a notification the
/// app's root navigation observer can pick up to push the matching profile.
struct MentionTapHandler: ViewModifier {
    func body(content: Content) -> some View {
        content.environment(\.openURL, OpenURLAction { url in
            guard url.scheme == "byteai", url.host == "profile" else {
                return .systemAction
            }
            let username = url.lastPathComponent
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
