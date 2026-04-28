import Foundation

// MARK: - User

struct User: Identifiable, Codable, Hashable {
    let id: String
    let username: String
    let displayName: String
    let initials: String
    let role: String
    let company: String
    let bio: String
    let level: Int
    let xp: Int
    let xpToNextLevel: Int
    let followers: Int
    let following: Int
    let bytes: Int
    let reactions: Int
    let streak: Int
    var techStack: [String]
    let feedPreferences: [String]
    let links: [SocialLink]
    let badges: [Badge]
    let isVerified: Bool
    let isOnline: Bool
    let avatarVariant: String // "cyan" | "purple" | "green" | "orange"
    var avatarUrl: String?
    var isSystem: Bool = false   // AI-curated content account (web parity: SYSTEM_USER_ID)
    var isOnboarded: Bool = true // Server source of truth from /me; defaults true for embedded uses
}

// Web parity (UI/lib/api/client.ts): authorId == SYSTEM_USER_ID flags AI-curated posts.
let BYTEAI_SYSTEM_USER_ID = "00000000-0000-0000-0000-000000000001"

struct SocialLink: Codable, Hashable {
    let platform: String   // "github" | "linkedin" | "twitter" | "website"
    let url: String
    let label: String?
}

// MARK: - Post / BytePost

struct Post: Identifiable, Codable, Hashable {
    let id: String
    let title: String
    let body: String
    let author: User
    let tags: [String]
    var likes: Int
    var comments: Int
    let shares: Int
    let bookmarks: Int
    let timestamp: String
    var isLiked: Bool
    var isBookmarked: Bool
    let code: CodeSnippet?
    let views: Int?
    let type: PostType

    enum PostType: String, Codable {
        case byte, interview
    }
}

struct CodeSnippet: Codable, Hashable {
    let language: String
    let filename: String
    let content: String
}

// MARK: - Comment

struct Comment: Identifiable, Codable {
    let id: String
    let content: String
    let author: User
    let timestamp: String
    let replies: [Comment]
    var votes: Int
}

// MARK: - Interview

struct Interview: Identifiable, Codable {
    let id: String
    let title: String
    let company: String?
    let role: String?
    let location: String?
    let difficulty: Difficulty
    let type: String
    let createdAt: String
    let questions: [InterviewQuestion]
    let author: User
    let commentCount: Int
    let isAnonymous: Bool
    let isBookmarked: Bool

    enum Difficulty: String, Codable {
        case easy, medium, hard

        var label: String { rawValue.capitalized }
        var color: String {
            switch self {
            case .easy:   return "green"
            case .medium: return "orange"
            case .hard:   return "red"
            }
        }
    }
}

struct InterviewQuestion: Identifiable, Codable {
    let id: String
    let question: String
    let answer: String
    let orderIndex: Int
    var likeCount: Int
    let commentCount: Int
    var isLiked: Bool
}

// MARK: - Badge

struct Badge: Identifiable, Codable, Hashable {
    let id: String
    let name: String
    let icon: String   // emoji or SF Symbol name
    let earned: Bool
}

/// Catalog entry from /api/lookup/badge-types — used to render locked badges
/// alongside the user's earned set on the profile screen.
struct BadgeType: Identifiable, Codable, Hashable {
    let id: String
    let name: String
    let label: String
    let icon: String
    let description: String?
}

// MARK: - User preferences

struct UserPreferences: Codable, Equatable {
    var theme: String
    var visibility: String
    var notifReactions: Bool
    var notifComments: Bool
    var notifFollowers: Bool
    var notifUnfollows: Bool

    static let `default` = UserPreferences(
        theme: "dark",
        visibility: "public",
        notifReactions: true,
        notifComments: true,
        notifFollowers: true,
        notifUnfollows: false
    )
}

// MARK: - Support feedback (terminal widget)

struct FeedbackEntry: Identifiable, Codable, Hashable {
    let id: String
    let type: String        // "good" | "bad" | "idea"
    let message: String
    let pageContext: String?
    let status: String      // "open" | "reviewed" | "closed"
    let adminNote: String?
    let createdAt: String
}

// MARK: - Notification

struct AppNotification: Identifiable, Codable {
    let id: String
    let userId: String
    let type: NotificationType
    let payload: NotificationPayload
    /// Live actor profile joined at read time on the backend.
    /// These take precedence over the (possibly stale) snapshot in `payload` —
    /// fall back to `payload.actor*` for legacy / pre-refactor records that still inline them.
    /// Default `nil` so existing call-sites (e.g. mock fixtures) continue to compile.
    var actorUsername: String? = nil
    var actorDisplayName: String? = nil
    var actorAvatarUrl: String? = nil
    var read: Bool
    let createdAt: String

    enum NotificationType: String, Codable {
        case like, comment, follow, unfollow, badge
        case feedbackUpdate = "feedback_update"
        case system

        // Unknown server-side types fall back to .system rather than failing decode.
        init(from decoder: Decoder) throws {
            let raw = try decoder.singleValueContainer().decode(String.self)
            self = NotificationType(rawValue: raw) ?? .system
        }
    }
}

struct NotificationPayload: Codable {
    let byteId: String?
    let actorId: String?
    let actorUsername: String?
    let actorDisplayName: String?
    let actorAvatarUrl: String?
    let commentId: String?
    let reactionType: String?
    let badgeName: String?
    let badgeLabel: String?
    let badgeIcon: String?
    let message: String?
    let preview: String?

    init(
        byteId: String? = nil,
        actorId: String? = nil,
        actorUsername: String? = nil,
        actorDisplayName: String? = nil,
        actorAvatarUrl: String? = nil,
        commentId: String? = nil,
        reactionType: String? = nil,
        badgeName: String? = nil,
        badgeLabel: String? = nil,
        badgeIcon: String? = nil,
        message: String? = nil,
        preview: String? = nil
    ) {
        self.byteId = byteId
        self.actorId = actorId
        self.actorUsername = actorUsername
        self.actorDisplayName = actorDisplayName
        self.actorAvatarUrl = actorAvatarUrl
        self.commentId = commentId
        self.reactionType = reactionType
        self.badgeName = badgeName
        self.badgeLabel = badgeLabel
        self.badgeIcon = badgeIcon
        self.message = message
        self.preview = preview
    }
}

// MARK: - Search

struct SearchResult: Identifiable, Codable {
    let id: String
    let post: Post?
    let user: PersonResult?
}

struct PersonResult: Identifiable, Codable {
    let id: String
    let username: String
    let displayName: String
    let initials: String
    let role: String
    let company: String
    let followers: Int
    let avatarVariant: String
    var isFollowing: Bool
}

struct AskResult: Codable {
    let answer: String
    let sources: [Post]
}

/// Compact source row emitted by `/api/ai/search-ask-stream`. Mirrors the server's
/// `SearchAskSource(Id, Title, ContentType)` record.
struct SearchAskSource: Identifiable, Codable, Hashable {
    let id: String
    let title: String
    let contentType: String  // "byte" | "interview"
}

// MARK: - Lookup

struct SeniorityType: Identifiable, Codable, Hashable {
    let id: String
    let name: String
    let label: String
    let icon: String
}

struct Domain: Identifiable, Codable, Hashable {
    let id: String
    let name: String
    let label: String
    let icon: String
}

struct TechStack: Identifiable, Codable, Hashable {
    let id: String
    let name: String
    let label: String
    let subdomainId: String?
}

// MARK: - Interview / Question Comments
// Mirrors UI/lib/api/client.ts QuestionComment + InterviewComment payloads.

struct InterviewComment: Identifiable, Codable {
    let id: String
    let body: String
    let authorId: String
    let authorUsername: String?
    let authorDisplayName: String?
    let authorAvatarUrl: String?
    let authorRoleTitle: String?
    var voteCount: Int
    let createdAt: String
    let parentId: String?
}

struct QuestionComment: Identifiable, Codable {
    let id: String
    let body: String
    let authorId: String
    let authorUsername: String?
    let authorDisplayName: String?
    let authorAvatarUrl: String?
    let authorRoleTitle: String?
    var voteCount: Int
    let createdAt: String
    let parentId: String?
}

struct AskByteResult: Codable {
    let answer: String
    let sourceId: String
    let sourceTitle: String
}

// MARK: - Feed Filter
// Web parity: only FOR_YOU and TRENDING are surfaced as tabs (UI/components/features/feed/feed-filters.tsx).
// `following` and `newest` remain as raw values for routing compatibility.

enum FeedFilter: String, CaseIterable {
    case forYou    = "for_you"
    case trending  = "trending"
    case following = "following"
    case newest    = "newest"

    var label: String {
        switch self {
        case .forYou:    return "FOR_YOU"
        case .trending:  return "TRENDING"
        case .following: return "FOLLOWING"
        case .newest:    return "NEWEST"
        }
    }

    /// Tabs surfaced in the feed UI (web parity).
    static let visibleTabs: [FeedFilter] = [.forYou, .trending]
}

enum SearchType: String, CaseIterable {
    case bytes = "Bytes"
    case interviews = "Interviews"
    case people = "People"
}
