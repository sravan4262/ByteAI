import Foundation

// MARK: - API Client
// Mirrors /UI/lib/api/http.ts + client.ts
// Base URL: http://localhost:5239 (local dev)
//           Set BYTEAI_API_URL env var in scheme for staging/prod

actor APIClient {
    static let shared = APIClient()

    // For simulator hitting local Mac backend use 127.0.0.1
    // For real device on same Wi-Fi replace with your Mac's LAN IP e.g. http://192.168.1.x:5239
    private let baseURL: URL = {
        let env = ProcessInfo.processInfo.environment["BYTEAI_API_URL"]
            ?? "http://127.0.0.1:5239"
        return URL(string: env)!
    }()

    private var authToken: String?

    private init() {}

    func setToken(_ token: String?) {
        authToken = token
    }

    // MARK: - Generic request (mirrors apiFetch)

    private func request<T: Decodable>(
        _ path: String,
        method: String = "GET",
        body: (any Encodable)? = nil
    ) async throws -> T {
        // appendingPathComponent encodes '?' — use string concat instead
        guard let url = URL(string: baseURL.absoluteString + path) else {
            throw URLError(.badURL)
        }
        var req = URLRequest(url: url)
        req.httpMethod = method
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        if let token = authToken {
            req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        if let body {
            req.httpBody = try JSONEncoder().encode(body)
        }
        req.timeoutInterval = 15

        let (data, response) = try await URLSession.shared.data(for: req)

        if let http = response as? HTTPURLResponse {
            if http.statusCode == 401 {
                // Token expired — notify on main thread to trigger re-auth
                await MainActor.run {
                    NotificationCenter.default.post(name: .apiDidReceiveUnauthorized, object: nil)
                }
                throw APIError.unauthorized
            }
            if !(200..<300).contains(http.statusCode) {
                let msg = String(data: data, encoding: .utf8) ?? ""
                throw APIError.http(http.statusCode, msg)
            }
        }

        return try JSONDecoder().decode(T.self, from: data)
    }

    // Unwraps the { data: T } envelope the backend always returns
    private func fetch<T: Decodable>(_ path: String, method: String = "GET", body: (any Encodable)? = nil) async throws -> T {
        let envelope: APIEnvelope<T> = try await request(path, method: method, body: body)
        return envelope.data
    }

    // MARK: - Feed

    func getFeed(filter: String = "for_you", stack: String? = nil, page: Int = 1) async throws -> [Post] {
        var comps = URLComponents()
        comps.queryItems = [
            URLQueryItem(name: "filter", value: filter),
            URLQueryItem(name: "page", value: "\(page)"),
            URLQueryItem(name: "pageSize", value: "20"),
        ]
        if let stack { comps.queryItems?.append(URLQueryItem(name: "stack", value: stack)) }
        let qs = comps.percentEncodedQuery ?? ""
        let paged: PagedResponse<ByteResponse> = try await fetch("/api/feed?\(qs)")
        return paged.items.map { Post(from: $0) }
    }

    func getPost(id: String) async throws -> Post {
        let b: ByteResponse = try await fetch("/api/bytes/\(id)")
        return Post(from: b)
    }

    // MARK: - Reactions

    func toggleLike(postId: String) async throws -> Bool {
        struct R: Decodable { let isLiked: Bool }
        let r: R = try await fetch("/api/bytes/\(postId)/likes", method: "POST")
        return r.isLiked
    }

    func toggleBookmark(postId: String, type: String = "byte") async throws -> Bool {
        struct R: Decodable { let isSaved: Bool }
        let r: R = try await fetch("/api/bookmarks", method: "POST", body: BookmarkBody(byteId: postId, type: type))
        return r.isSaved
    }

    // MARK: - Comments

    func getComments(postId: String) async throws -> [Comment] {
        let paged: PagedResponse<CommentResponse> = try await fetch("/api/bytes/\(postId)/comments")
        return paged.items.map { Comment(from: $0) }
    }

    func addComment(postId: String, body: String) async throws {
        struct B: Encodable { let body: String }
        let _: EmptyResponse = try await fetch("/api/bytes/\(postId)/comments", method: "POST", body: B(body: body))
    }

    // MARK: - Interviews

    func getInterviews(company: String? = nil, stack: String? = nil, difficulty: String? = nil, page: Int = 1) async throws -> [Interview] {
        var items: [URLQueryItem] = [
            URLQueryItem(name: "page", value: "\(page)"),
            URLQueryItem(name: "pageSize", value: "20"),
        ]
        if let company    { items.append(.init(name: "company",    value: company)) }
        if let stack      { items.append(.init(name: "stack",      value: stack)) }
        if let difficulty { items.append(.init(name: "difficulty", value: difficulty)) }
        var comps = URLComponents()
        comps.queryItems = items
        let qs = comps.percentEncodedQuery ?? ""
        let paged: PagedResponse<InterviewResponse> = try await fetch("/api/interviews?\(qs)")
        return paged.items.map { Interview(from: $0) }
    }

    func getInterview(id: String) async throws -> Interview {
        let r: InterviewResponse = try await fetch("/api/interviews/\(id)")
        return Interview(from: r)
    }

    func likeQuestion(questionId: String) async throws {
        let _: EmptyResponse = try await fetch("/api/interviews/questions/\(questionId)/likes", method: "POST")
    }

    func unlikeQuestion(questionId: String) async throws {
        let _: EmptyResponse = try await fetch("/api/interviews/questions/\(questionId)/likes", method: "DELETE")
    }

    // MARK: - Search

    func search(query: String, type: String) async throws -> [Post] {
        let q = query.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? ""
        let results: [SearchResponse] = try await fetch("/api/search?q=\(q)&type=\(type)")
        return results.map { Post(from: $0) }
    }

    func searchPeople(query: String) async throws -> [PersonResult] {
        let q = query.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? ""
        let results: [UserSearchResponse] = try await fetch("/api/search?q=\(q)&type=people")
        return results.map { PersonResult(from: $0) }
    }

    func searchAsk(question: String) async throws -> AskResult {
        struct B: Encodable { let question: String }
        return try await fetch("/api/search/ask", method: "POST", body: B(question: question))
    }

    // MARK: - Profile

    func getProfile(username: String) async throws -> User {
        let r: UserResponse = try await fetch("/api/users/username/\(username)")
        return User(from: r)
    }

    func getMe() async throws -> User {
        // Requires auth — returns 401 if no token
        let r: UserResponse = try await fetch("/api/users/me")
        return User(from: r)
    }

    func followUser(userId: String) async throws {
        let _: EmptyResponse = try await fetch("/api/users/\(userId)/follow", method: "POST")
    }

    func unfollowUser(userId: String) async throws {
        let _: EmptyResponse = try await fetch("/api/users/\(userId)/follow", method: "DELETE")
    }

    // MARK: - Notifications

    func getNotifications(page: Int = 1, unreadOnly: Bool = false) async throws -> [AppNotification] {
        let paged: PagedResponse<NotificationResponse> = try await fetch("/api/notifications?page=\(page)&unreadOnly=\(unreadOnly)")
        return paged.items.map { AppNotification(from: $0) }
    }

    func getUnreadCount() async throws -> Int {
        struct R: Decodable { let count: Int }
        let r: R = try await fetch("/api/notifications/unread-count")
        return r.count
    }

    func markRead(notificationId: String) async throws {
        let _: EmptyResponse = try await fetch("/api/notifications/\(notificationId)/read", method: "PUT")
    }

    func markAllRead() async throws {
        let _: EmptyResponse = try await fetch("/api/notifications/read-all", method: "PUT")
    }

    // MARK: - Compose

    func createPost(title: String, content: String, code: CodeSnippet?, tags: [String]) async throws -> String {
        struct B: Encodable { let title: String; let body: String; let codeSnippet: String?; let language: String?; let tags: [String] }
        struct R: Decodable { let id: String }
        let r: R = try await fetch("/api/bytes", method: "POST", body: B(
            title: title, body: content,
            codeSnippet: code?.content, language: code?.language,
            tags: tags
        ))
        return r.id
    }

    func createInterview(title: String, company: String?, role: String?, difficulty: String, questions: [InterviewQuestion]) async throws -> String {
        struct Q: Encodable { let question: String; let answer: String; let orderIndex: Int }
        struct B: Encodable { let title: String; let company: String?; let role: String?; let difficulty: String; let questions: [Q] }
        struct R: Decodable { let id: String }
        let r: R = try await fetch("/api/interviews", method: "POST", body: B(
            title: title, company: company, role: role, difficulty: difficulty,
            questions: questions.map { Q(question: $0.question, answer: $0.answer, orderIndex: $0.orderIndex) }
        ))
        return r.id
    }

    func getReachEstimate(content: String, tags: [String]) async throws -> Int {
        struct B: Encodable { let content: String; let tags: [String] }
        struct R: Decodable { let reach: Int }
        let r: R = try await fetch("/api/bytes/reach-estimate", method: "POST", body: B(content: content, tags: tags))
        return r.reach
    }

    func getMyBookmarks() async throws -> [Post] {
        let paged: PagedResponse<ByteResponse> = try await fetch("/api/me/bookmarks")
        return paged.items.map { Post(from: $0) }
    }

    func getMyBytes(page: Int = 1) async throws -> [Post] {
        let paged: PagedResponse<ByteResponse> = try await fetch("/api/me/bytes?page=\(page)&pageSize=20")
        return paged.items.map { Post(from: $0) }
    }

    func deletePost(postId: String) async throws {
        let _: EmptyResponse = try await fetch("/api/bytes/\(postId)", method: "DELETE")
    }

    func getLikes(postId: String) async throws -> [LikeUser] {
        let items: [LikeUserResponse] = try await fetch("/api/bytes/\(postId)/likes")
        return items.map { LikeUser(id: $0.userId, displayName: $0.displayName, username: $0.username, avatarVariant: "cyan") }
    }

    func updateProfile(displayName: String?, bio: String?, company: String? = nil, roleTitle: String? = nil, techStack: [String]? = nil) async throws -> User {
        struct B: Encodable { let displayName: String?; let bio: String?; let company: String?; let roleTitle: String?; let techStack: [String]? }
        let r: UserResponse = try await fetch("/api/users/me/profile", method: "PUT", body: B(displayName: displayName, bio: bio, company: company, roleTitle: roleTitle, techStack: techStack))
        return User(from: r)
    }

    // MARK: - Lookups

    func getSeniorityTypes() async throws -> [SeniorityType] {
        let items: [SeniorityTypeResponse] = try await fetch("/api/lookup/seniority-types")
        return items.map { SeniorityType(id: $0.id, label: $0.label) }
    }

    func getDomains() async throws -> [Domain] {
        let items: [DomainResponse] = try await fetch("/api/lookup/domains")
        return items.map { Domain(id: $0.id, name: $0.label) }
    }

    func getTechStacks(domainId: String? = nil) async throws -> [TechStack] {
        let qs = domainId.map { "domainId=\($0)" } ?? ""
        let items: [TechStackResponse] = try await fetch("/api/lookup/tech-stacks?\(qs)")
        return items.map { TechStack(id: $0.id, name: $0.label, domainId: $0.domainId) }
    }
}

// MARK: - API Error

enum APIError: LocalizedError {
    case http(Int, String)
    case unauthorized
    var errorDescription: String? {
        switch self {
        case .http(let code, let msg): return "HTTP \(code): \(msg)"
        case .unauthorized: return "Session expired"
        }
    }
}

extension Notification.Name {
    static let apiDidReceiveUnauthorized = Notification.Name("APIClientDidReceiveUnauthorized")
}

struct LikeUser: Identifiable {
    let id: String
    let displayName: String
    let username: String
    let avatarVariant: String
    var initials: String {
        String(displayName.split(separator: " ").compactMap { $0.first }.prefix(2).map { String($0) }.joined()).uppercased()
    }
}

private struct LikeUserResponse: Decodable {
    let userId: String
    let displayName: String
    let username: String
}

// MARK: - Wire Envelope / Response Types (mirror C# ViewModels)

private struct APIEnvelope<T: Decodable>: Decodable { let data: T }
private struct PagedResponse<T: Decodable>: Decodable {
    let items: [T]; let total: Int; let page: Int; let pageSize: Int
}
private struct EmptyResponse: Decodable {}
private struct BookmarkBody: Encodable { let byteId: String; let type: String }

struct ByteResponse: Decodable {
    let id: String
    let authorId: String
    let title: String
    let body: String
    let codeSnippet: String?
    let language: String?
    let type: String
    let createdAt: String
    let commentCount: Int
    let likeCount: Int
}

struct UserResponse: Decodable {
    let id: String
    let clerkId: String
    let username: String
    let displayName: String
    let bio: String?
    let company: String?
    let roleTitle: String?
    let seniority: String?
    let domain: String?
    let level: Int
    let xp: Int
    let streak: Int
    let isVerified: Bool
    let badges: [BadgeResponse]
    let avatarUrl: String?
}

struct BadgeResponse: Decodable {
    let name: String
    let label: String
    let icon: String
    let earnedAt: String?
}

struct CommentResponse: Decodable {
    let id: String
    let body: String
    let authorId: String
    let authorUsername: String
    let voteCount: Int
    let createdAt: String
    let parentId: String?
}

struct InterviewResponse: Decodable {
    let id: String
    let authorId: String
    let title: String
    let company: String?
    let role: String?
    let difficulty: String
    let type: String
    let createdAt: String
    let questions: [InterviewQuestionResponse]
}

struct InterviewQuestionResponse: Decodable {
    let id: String
    let question: String
    let answer: String
    let orderIndex: Int
    let likeCount: Int
    let commentCount: Int
    let isLiked: Bool
}

struct NotificationResponse: Decodable {
    let id: String
    let userId: String
    let type: String
    let payload: NotificationPayload
    let read: Bool
    let createdAt: String
}

struct PersonResponse: Decodable {
    let id: String
    let username: String
    let displayName: String
    let roleTitle: String?
    let company: String?
    let followerCount: Int
    let isFollowing: Bool
}

struct SeniorityTypeResponse: Decodable { let id: String; let label: String }
struct DomainResponse: Decodable { let id: String; let label: String }
struct TechStackResponse: Decodable { let id: String; let domainId: String?; let label: String }

struct SearchResponse: Decodable {
    let id: String
    let authorId: String
    let title: String
    let body: String
    let codeSnippet: String?
    let language: String?
    let tags: [String]
    let type: String
    let contentType: String
    let likeCount: Int
    let commentCount: Int
    let createdAt: String
}

struct UserSearchResponse: Decodable {
    let id: String
    let username: String
    let displayName: String
    let bio: String?
    let avatarUrl: String?
    let isVerified: Bool
}

// MARK: - Domain model initialisers from API responses

extension Post {
    init(from b: ByteResponse) {
        self.init(
            id: b.id,
            title: b.title,
            body: b.body,
            author: User.placeholder(id: b.authorId),
            tags: [],
            likes: b.likeCount,
            comments: b.commentCount,
            shares: 0,
            bookmarks: 0,
            timestamp: Self.relativeTime(from: b.createdAt),
            isLiked: false,
            isBookmarked: false,
            code: b.codeSnippet.map { CodeSnippet(language: b.language ?? "text", filename: "snippet", content: $0) },
            views: nil,
            type: b.type == "interview" ? .interview : .byte  // backend uses "article" for bytes
        )
    }

    private static func relativeTime(from iso: String) -> String {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        guard let date = formatter.date(from: iso) else { return iso }
        let diff = Date().timeIntervalSince(date)
        switch diff {
        case ..<60:        return "just now"
        case ..<3600:      return "\(Int(diff/60))m ago"
        case ..<86400:     return "\(Int(diff/3600))h ago"
        default:           return "\(Int(diff/86400))d ago"
        }
    }
}

extension User {
    static func placeholder(id: String) -> User {
        User(id: id, username: "user", displayName: "User", initials: "U",
             role: "", company: "", bio: "", level: 1, xp: 0, xpToNextLevel: 1000,
             followers: 0, following: 0, bytes: 0, reactions: 0, streak: 0,
             techStack: [], feedPreferences: [], links: [], badges: [],
             isVerified: false, isOnline: false, avatarVariant: "cyan", avatarUrl: nil)
    }

    init(from r: UserResponse) {
        self.init(
            id: r.id,
            username: r.username,
            displayName: r.displayName,
            initials: String(r.displayName.split(separator: " ").compactMap { $0.first }.prefix(2).map { String($0) }.joined()).uppercased(),
            role: r.roleTitle ?? "",
            company: r.company ?? "",
            bio: r.bio ?? "",
            level: r.level,
            xp: r.xp,
            xpToNextLevel: (r.level + 1) * 1000,
            followers: 0,
            following: 0,
            bytes: 0,
            reactions: 0,
            streak: r.streak,
            techStack: [],
            feedPreferences: [],
            links: [],
            badges: r.badges.map { Badge(id: $0.name, name: $0.label, icon: $0.icon, earned: true) },
            isVerified: r.isVerified,
            isOnline: false,
            avatarVariant: "cyan",
            avatarUrl: r.avatarUrl
        )
    }
}

extension Comment {
    init(from r: CommentResponse) {
        self.init(
            id: r.id,
            content: r.body,
            author: User.placeholder(id: r.authorId),
            timestamp: r.createdAt,
            replies: [],
            votes: r.voteCount
        )
    }
}

extension Interview {
    init(from r: InterviewResponse) {
        self.init(
            id: r.id,
            title: r.title,
            company: r.company,
            role: r.role,
            difficulty: Difficulty(rawValue: r.difficulty) ?? .medium,
            type: r.type,
            createdAt: r.createdAt,
            questions: r.questions.map { InterviewQuestion(from: $0) },
            author: User.placeholder(id: r.authorId)
        )
    }
}

extension InterviewQuestion {
    init(from r: InterviewQuestionResponse) {
        self.init(
            id: r.id,
            question: r.question,
            answer: r.answer,
            orderIndex: r.orderIndex,
            likeCount: r.likeCount,
            commentCount: r.commentCount,
            isLiked: r.isLiked
        )
    }
}

extension AppNotification {
    init(from r: NotificationResponse) {
        self.init(
            id: r.id,
            userId: r.userId,
            type: NotificationType(rawValue: r.type) ?? .system,
            payload: r.payload,
            read: r.read,
            createdAt: r.createdAt
        )
    }
}

extension Post {
    init(from r: SearchResponse) {
        self.init(
            id: r.id,
            title: r.title,
            body: r.body,
            author: User.placeholder(id: r.authorId),
            tags: r.tags,
            likes: r.likeCount,
            comments: r.commentCount,
            shares: 0, bookmarks: 0,
            timestamp: Self.relativeTime(from: r.createdAt),
            isLiked: false, isBookmarked: false,
            code: r.codeSnippet.map { CodeSnippet(language: r.language ?? "text", filename: "snippet", content: $0) },
            views: nil,
            type: r.contentType == "interview" ? .interview : .byte
        )
    }
}

extension PersonResult {
    init(from r: UserSearchResponse) {
        self.init(
            id: r.id,
            username: r.username,
            displayName: r.displayName,
            initials: String(r.displayName.split(separator: " ").compactMap { $0.first }.prefix(2).map { String($0) }.joined()).uppercased(),
            role: "",
            company: "",
            followers: 0,
            avatarVariant: "cyan",
            isFollowing: false
        )
    }
}

extension PersonResult {
    init(from r: PersonResponse) {
        self.init(
            id: r.id,
            username: r.username,
            displayName: r.displayName,
            initials: String(r.displayName.split(separator: " ").compactMap { $0.first }.prefix(2).map { String($0) }.joined()).uppercased(),
            role: r.roleTitle ?? "",
            company: r.company ?? "",
            followers: r.followerCount,
            avatarVariant: "cyan",
            isFollowing: r.isFollowing
        )
    }
}
