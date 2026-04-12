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
    let techStack: [String]
    let feedPreferences: [String]
    let links: [SocialLink]
    let badges: [Badge]
    let isVerified: Bool
    let isOnline: Bool
    let avatarVariant: String // "cyan" | "purple" | "green" | "orange"
    var avatarUrl: String?
}

struct SocialLink: Codable, Hashable {
    let type: String   // "github" | "linkedin" | "twitter" | "website"
    let url: String
    let label: String
}

// MARK: - Post / BytePost

struct Post: Identifiable, Codable, Hashable {
    let id: String
    let title: String
    let body: String
    let author: User
    let tags: [String]
    var likes: Int
    let comments: Int
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
    let difficulty: Difficulty
    let type: String
    let createdAt: String
    let questions: [InterviewQuestion]
    let author: User

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

// MARK: - Notification

struct AppNotification: Identifiable, Codable {
    let id: String
    let userId: String
    let type: NotificationType
    let payload: NotificationPayload
    var read: Bool
    let createdAt: String

    enum NotificationType: String, Codable {
        case like, comment, follow, badge, system
    }
}

struct NotificationPayload: Codable {
    let byteId: String?
    let actorId: String?
    let actorUsername: String?
    let preview: String?
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

// MARK: - Lookup

struct SeniorityType: Identifiable, Codable {
    let id: String
    let label: String
}

struct Domain: Identifiable, Codable {
    let id: String
    let name: String
}

struct TechStack: Identifiable, Codable {
    let id: String
    let name: String
    let domainId: String?
}

// MARK: - Feed Filter

enum FeedFilter: String, CaseIterable {
    case bytes     = "for_you"
    case trending  = "trending"
    case following = "following"
    case newest    = "newest"

    var label: String {
        switch self {
        case .bytes:     return "BYTES"
        case .trending:  return "TRENDING"
        case .following: return "FOLLOWING"
        case .newest:    return "NEWEST"
        }
    }
}

enum SearchType: String, CaseIterable {
    case bytes = "Bytes"
    case interviews = "Interviews"
    case people = "People"
}
