import Foundation

// MARK: - API Client
// Mirrors /UI/lib/api/http.ts + client.ts
// Base URL is sourced from AppConfig.apiBaseURL.

// File-scope helper used by `request(...)` to detect the backend's structured
// 400 response shape `{ error: "INVALID_CONTENT", reason: "…" }`. Lifted to file
// scope because generic functions can't host nested Decodable types.
private struct InvalidContentShape: Decodable {
    let error: String?
    let reason: String?
}

// File-scope helper for the new 422 moderation envelope:
//   { "error": "CONTENT_REJECTED", "severity": "...", "reasons": [{ code, message }] }
// We intentionally ignore `severity` per UX direction — only reason rows are shown.
private struct ContentRejectedShape: Decodable {
    struct ReasonShape: Decodable { let code: String?; let message: String? }
    let error: String?
    let reasons: [ReasonShape]?
}

actor APIClient {
    static let shared = APIClient()

    private let baseURL: URL = AppConfig.apiBaseURL
    private var authToken: String?

    private init() {}

    func setToken(_ token: String?) {
        authToken = token
    }

    var token: String? { authToken }

    // MARK: - Generic request (mirrors apiFetch)

    private func request<T: Decodable>(
        _ path: String,
        method: String = "GET",
        body: (any Encodable)? = nil
    ) async throws -> T {
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
                await MainActor.run {
                    NotificationCenter.default.post(name: .apiDidReceiveUnauthorized, object: nil)
                }
                throw APIError.unauthorized
            }
            if !(200..<300).contains(http.statusCode) {
                let reason = Self.decodeErrorReason(data: data)
                // New moderation envelope (HTTP 422). Decoded into a ContentRejection
                // and surfaced as a typed `APIError.contentRejected(...)` so call
                // sites can pattern-match without re-parsing the body.
                if http.statusCode == 422 {
                    if let body = try? JSONDecoder().decode(ContentRejectedShape.self, from: data),
                       body.error == "CONTENT_REJECTED" {
                        let reasons = (body.reasons ?? []).compactMap { r -> ContentRejection.Reason? in
                            guard let code = r.code, !code.isEmpty else { return nil }
                            return ContentRejection.Reason(code: code, message: r.message ?? "")
                        }
                        if !reasons.isEmpty {
                            throw APIError.contentRejected(ContentRejection(reasons: reasons))
                        }
                    }
                }
                if http.statusCode == 400 {
                    if let body = try? JSONDecoder().decode(InvalidContentShape.self, from: data),
                       body.error == "INVALID_CONTENT" {
                        throw APIError.invalidContent(body.reason ?? reason)
                    }
                }
                throw APIError.http(http.statusCode, reason)
            }
        }

        return try JSONDecoder().decode(T.self, from: data)
    }

    // Probes the three error shapes the backend can emit:
    //   • { reason, error }            (legacy ApiResponse error envelope)
    //   • { message }                  (controller-caught domain errors)
    //   • { detail, title }            (ProblemDetails — middleware fallback)
    // Falls back to raw body text if none of those decode. Web parity: UI/lib/api/http.ts.
    private static func decodeErrorReason(data: Data) -> String {
        let raw = String(data: data, encoding: .utf8) ?? ""
        struct Shape: Decodable {
            let reason: String?
            let message: String?
            let detail: String?
            let title: String?
        }
        if let s = try? JSONDecoder().decode(Shape.self, from: data) {
            if let r = s.reason,  !r.isEmpty { return r }
            if let d = s.detail,  !d.isEmpty { return d }
            if let m = s.message, !m.isEmpty { return m }
            if let t = s.title,   !t.isEmpty { return t }
        }
        return raw
    }

    // Unwraps the { data: T } envelope the backend always returns
    fileprivate func fetch<T: Decodable>(_ path: String, method: String = "GET", body: (any Encodable)? = nil) async throws -> T {
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

    /// Bytes authored by a given user. Web parity (UI/lib/api/client.ts:getUserBytes) —
    /// hits /api/bytes?authorId=… (NOT /api/feed). Used for the public profile bytes tab.
    func getUserBytes(userId: String, page: Int = 1, pageSize: Int = 30) async throws -> [Post] {
        var comps = URLComponents()
        comps.queryItems = [
            URLQueryItem(name: "authorId", value: userId),
            URLQueryItem(name: "page", value: "\(page)"),
            URLQueryItem(name: "pageSize", value: "\(pageSize)"),
        ]
        let qs = comps.percentEncodedQuery ?? ""
        let paged: PagedResponse<ByteResponse> = try await fetch("/api/bytes?\(qs)")
        return paged.items.map { Post(from: $0) }
    }

    func recordView(postId: String, dwellMs: Int) async throws {
        struct B: Encodable { let dwellMs: Int }
        let _: EmptyResponse = try await fetch("/api/bytes/\(postId)/view", method: "POST", body: B(dwellMs: dwellMs))
    }

    // MARK: - Reactions

    func toggleLike(postId: String) async throws -> Bool {
        struct B: Encodable { let type: String }
        struct R: Decodable { let byteId: String; let userId: String; let isLiked: Bool }
        let r: R = try await fetch("/api/bytes/\(postId)/reactions", method: "POST", body: B(type: "like"))
        return r.isLiked
    }

    func toggleBookmark(postId: String, type: String = "byte") async throws -> Bool {
        struct R: Decodable { let isSaved: Bool }
        let path = type == "interview"
            ? "/api/interviews/\(postId)/bookmarks"
            : "/api/bytes/\(postId)/bookmarks"
        let r: R = try await fetch(path, method: "POST")
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

    /// Web parity (UI/lib/api/client.ts): supports company / role / location / stack /
    /// difficulty / authorId filters.
    func getInterviews(
        company: String? = nil,
        role: String? = nil,
        location: String? = nil,
        stack: String? = nil,
        difficulty: String? = nil,
        authorId: String? = nil,
        page: Int = 1,
        pageSize: Int = 20
    ) async throws -> [Interview] {
        var items: [URLQueryItem] = [
            URLQueryItem(name: "page", value: "\(page)"),
            URLQueryItem(name: "pageSize", value: "\(pageSize)"),
        ]
        if let company    { items.append(.init(name: "company",    value: company)) }
        if let role       { items.append(.init(name: "role",       value: role)) }
        if let location   { items.append(.init(name: "location",   value: location)) }
        if let stack      { items.append(.init(name: "stack",      value: stack)) }
        if let difficulty { items.append(.init(name: "difficulty", value: difficulty)) }
        if let authorId   { items.append(.init(name: "authorId",   value: authorId)) }
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

    /// NDJSON streaming variant of searchAsk. First emits `.sources([...])`, then a
    /// burst of `.chunk(text)` events as Gemini tokens arrive, and finally `.done`.
    /// Web parity: UI/lib/api/client.ts:searchAskStream + UI/lib/api/http.ts:apiFetchStream.
    enum AskStreamEvent {
        case sources([SearchAskSource])
        case chunk(String)
        case done
    }

    func searchAskStream(question: String, type: String? = nil) -> AsyncThrowingStream<AskStreamEvent, Error> {
        // Capture actor-isolated state up front so the detached Task closure doesn't
        // need to hop back to the actor on every property read.
        let url = URL(string: baseURL.absoluteString + "/api/ai/search-ask-stream")
        let token = authToken
        return AsyncThrowingStream { continuation in
            let task = Task {
                do {
                    guard let url else { throw URLError(.badURL) }
                    var req = URLRequest(url: url)
                    req.httpMethod = "POST"
                    req.setValue("application/json", forHTTPHeaderField: "Content-Type")
                    if let token {
                        req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
                    }
                    struct Body: Encodable { let question: String; let type: String? }
                    req.httpBody = try JSONEncoder().encode(Body(question: question, type: type))
                    req.timeoutInterval = 60

                    let (bytes, response) = try await URLSession.shared.bytes(for: req)
                    if let http = response as? HTTPURLResponse, !(200..<300).contains(http.statusCode) {
                        throw APIError.http(http.statusCode, "Stream request failed.")
                    }

                    struct Line: Decodable {
                        let type: String?
                        let sources: [SearchAskSource]?
                        let text: String?
                    }

                    for try await rawLine in bytes.lines {
                        let line = rawLine.trimmingCharacters(in: .whitespacesAndNewlines)
                        if line.isEmpty { continue }
                        guard let data = line.data(using: .utf8),
                              let parsed = try? JSONDecoder().decode(Line.self, from: data) else { continue }
                        switch parsed.type {
                        case "sources":
                            if let s = parsed.sources { continuation.yield(.sources(s)) }
                        case "chunk":
                            if let t = parsed.text { continuation.yield(.chunk(t)) }
                        case "done":
                            continuation.yield(.done)
                        default:
                            break
                        }
                    }
                    continuation.finish()
                } catch {
                    continuation.finish(throwing: error)
                }
            }
            continuation.onTermination = { _ in task.cancel() }
        }
    }

    // MARK: - Profile

    func getProfileById(userId: String) async throws -> User {
        let r: UserResponse = try await fetch("/api/users/\(userId)")
        return User(from: r)
    }

    func getProfile(username: String) async throws -> User {
        let r: UserResponse = try await fetch("/api/users/username/\(username)")
        return User(from: r)
    }

    func getMe() async throws -> User {
        let r: UserResponse = try await fetch("/api/users/me")
        return User(from: r)
    }

    func provisionUser(displayName: String, email: String?, avatarUrl: String?) async throws -> Bool {
        struct B: Encodable { let displayName: String; let email: String?; let avatarUrl: String? }
        struct R: Decodable { let userId: String; let username: String; let isOnboarded: Bool }
        let r: R = try await fetch("/api/auth/provision", method: "POST",
                                   body: B(displayName: displayName, email: email, avatarUrl: avatarUrl))
        return r.isOnboarded
    }

    func deleteAccount() async throws {
        let _: EmptyResponse = try await fetch("/api/auth/account", method: "DELETE")
    }

    func followUser(userId: String) async throws {
        let _: EmptyResponse = try await fetch("/api/users/\(userId)/follow", method: "POST")
    }

    func unfollowUser(userId: String) async throws {
        let _: EmptyResponse = try await fetch("/api/users/\(userId)/follow", method: "DELETE")
    }

    func uploadAvatar(_ imageData: Data, mimeType: String = "image/jpeg") async throws -> String {
        let boundary = "Boundary-\(UUID().uuidString)"
        guard let url = URL(string: baseURL.absoluteString + "/api/users/me/avatar") else {
            throw URLError(.badURL)
        }
        var req = URLRequest(url: url)
        req.httpMethod = "POST"
        req.setValue("multipart/form-data; boundary=\(boundary)", forHTTPHeaderField: "Content-Type")
        if let token = authToken {
            req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }

        var body = Data()
        body.append("--\(boundary)\r\n".data(using: .utf8)!)
        body.append("Content-Disposition: form-data; name=\"file\"; filename=\"avatar.jpg\"\r\n".data(using: .utf8)!)
        body.append("Content-Type: \(mimeType)\r\n\r\n".data(using: .utf8)!)
        body.append(imageData)
        body.append("\r\n--\(boundary)--\r\n".data(using: .utf8)!)
        req.httpBody = body
        req.timeoutInterval = 30

        let (data, response) = try await URLSession.shared.data(for: req)
        guard let http = response as? HTTPURLResponse, (200..<300).contains(http.statusCode) else {
            let code = (response as? HTTPURLResponse)?.statusCode ?? 0
            throw APIError.http(code, Self.decodeErrorReason(data: data))
        }
        struct R: Decodable { let avatarUrl: String }
        let env = try JSONDecoder().decode(APIEnvelope<R>.self, from: data)
        return env.data.avatarUrl
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

    /// Web parity (UI/lib/api/client.ts:deleteNotification) — DELETE /api/notifications/{id}.
    func deleteNotification(notificationId: String) async throws {
        let _: EmptyResponse = try await fetch("/api/notifications/\(notificationId)", method: "DELETE")
    }

    // MARK: - Devices (push)

    func registerDevice(apnsToken: String) async throws {
        // Backend contract (DevicesController): { platform: "ios", token: "<hex>" }.
        // The iOS-facing parameter still says `apnsToken` for clarity at call
        // sites, but the wire payload uses the generic `token` field so the
        // same endpoint serves Android/web in the future.
        struct B: Encodable { let platform: String; let token: String }
        let _: EmptyResponse = try await fetch("/api/users/me/devices", method: "POST",
                                               body: B(platform: "ios", token: apnsToken))
    }

    func unregisterDevice(apnsToken: String) async throws {
        let _: EmptyResponse = try await fetch("/api/users/me/devices/\(apnsToken)", method: "DELETE")
    }

    // MARK: - Compose

    func createPost(title: String, content: String, code: CodeSnippet?, techStackNames: [String]) async throws -> String {
        // Web parity: POST /api/bytes accepts `techStackNames` (not free-form tags).
        struct B: Encodable {
            let title: String
            let body: String
            let codeSnippet: String?
            let language: String?
            let type: String
            let techStackNames: [String]
        }
        struct R: Decodable { let id: String }
        let r: R = try await fetch("/api/bytes", method: "POST", body: B(
            title: title, body: content,
            codeSnippet: code?.content, language: code?.language,
            type: "byte",
            techStackNames: techStackNames
        ))
        return r.id
    }

    func createInterview(
        title: String,
        company: String?,
        role: String?,
        location: String?,
        difficulty: String,
        questions: [InterviewQuestion],
        isAnonymous: Bool
    ) async throws -> String {
        struct Q: Encodable { let question: String; let answer: String }
        struct B: Encodable {
            let title: String
            let company: String?
            let role: String?
            let location: String?
            let difficulty: String
            let questions: [Q]
            let isAnonymous: Bool
        }
        struct R: Decodable { let id: String }
        let r: R = try await fetch("/api/interviews/with-questions", method: "POST", body: B(
            title: title,
            company: company, role: role, location: location,
            difficulty: difficulty,
            questions: questions.map { Q(question: $0.question, answer: $0.answer) },
            isAnonymous: isAnonymous
        ))
        return r.id
    }

    func getInterviewLocations() async throws -> [String] {
        let items: [String] = try await fetch("/api/interviews/locations")
        return items
    }

    func getInterviewCompanies() async throws -> [String] {
        let items: [String] = try await fetch("/api/interviews/companies")
        return items
    }

    func getInterviewRoles() async throws -> [String] {
        let items: [String] = try await fetch("/api/interviews/roles")
        return items
    }

    /// Show Similar Bytes — semantic similarity using stored byte embedding.
    /// Mirrors UI/lib/api/client.ts getSimilarBytes.
    func getSimilarBytes(byteId: String, limit: Int = 10) async throws -> [SimilarByte] {
        let items: [SimilarByteResponse] = try await fetch("/api/bytes/\(byteId)/similar?limit=\(limit)")
        return items.map { SimilarByte(from: $0) }
    }

    // MARK: - User preferences (theme + notification toggles)

    func getMyPreferences() async throws -> UserPreferences {
        let p: UserPreferences = try await fetch("/api/users/me/preferences")
        return p
    }

    func updatePreferences(_ patch: UserPreferences) async throws -> UserPreferences {
        let p: UserPreferences = try await fetch("/api/users/me/preferences", method: "PUT", body: patch)
        return p
    }

    // MARK: - Follower / Following lists

    func getFollowers(userId: String) async throws -> [PersonResult] {
        let paged: PagedResponse<UserResponse> = try await fetch("/api/users/\(userId)/followers")
        return paged.items.map { PersonResult(from: $0) }
    }

    func getFollowing(userId: String) async throws -> [PersonResult] {
        let paged: PagedResponse<UserResponse> = try await fetch("/api/users/\(userId)/following")
        return paged.items.map { PersonResult(from: $0) }
    }

    func getReachEstimate(content: String, tags: [String]) async throws -> Int {
        struct B: Encodable { let content: String; let tags: [String] }
        struct R: Decodable { let reach: Int }
        let r: R = try await fetch("/api/bytes/reach-estimate", method: "POST", body: B(content: content, tags: tags))
        return r.reach
    }

    func updatePost(id: String, title: String? = nil, body: String? = nil, codeSnippet: String? = nil, language: String? = nil) async throws -> Post {
        struct B: Encodable { let title: String?; let body: String?; let codeSnippet: String?; let language: String? }
        let r: ByteResponse = try await fetch("/api/bytes/\(id)", method: "PUT", body: B(title: title, body: body, codeSnippet: codeSnippet, language: language))
        return Post(from: r)
    }

    func deleteComment(commentId: String) async throws {
        let _: EmptyResponse = try await fetch("/api/comments/\(commentId)", method: "DELETE")
    }

    func voteComment(commentId: String, direction: String) async throws {
        struct B: Encodable { let direction: String }
        let _: EmptyResponse = try await fetch("/api/comments/\(commentId)/vote", method: "POST", body: B(direction: direction))
    }

    func getInterviewComments(interviewId: String) async throws -> [InterviewComment] {
        struct R: Decodable { let items: [InterviewComment] }
        let r: R = try await fetch("/api/interviews/\(interviewId)/comments")
        return r.items
    }

    func addInterviewComment(interviewId: String, body: String) async throws {
        struct B: Encodable { let body: String }
        let _: EmptyResponse = try await fetch("/api/interviews/\(interviewId)/comments", method: "POST", body: B(body: body))
    }

    func deleteInterviewComment(interviewId: String, commentId: String) async throws {
        let _: EmptyResponse = try await fetch("/api/interviews/\(interviewId)/comments/\(commentId)", method: "DELETE")
    }

    func getQuestionComments(questionId: String) async throws -> [QuestionComment] {
        struct R: Decodable { let items: [QuestionComment] }
        let r: R = try await fetch("/api/interviews/questions/\(questionId)/comments")
        return r.items
    }

    func addQuestionComment(questionId: String, body: String) async throws -> QuestionComment {
        struct B: Encodable { let body: String }
        return try await fetch("/api/interviews/questions/\(questionId)/comments", method: "POST", body: B(body: body))
    }

    func deleteQuestionComment(commentId: String) async throws {
        let _: EmptyResponse = try await fetch("/api/interviews/questions/comments/\(commentId)", method: "DELETE")
    }

    func askAboutByte(byteId: String, question: String) async throws -> AskByteResult {
        struct B: Encodable { let question: String }
        return try await fetch("/api/bytes/\(byteId)/ask", method: "POST", body: B(question: question))
    }

    func formatCode(code: String, language: String) async throws -> String {
        struct B: Encodable { let code: String; let language: String }
        struct R: Decodable { let formatted: String }
        let r: R = try await fetch("/api/ai/format-code", method: "POST", body: B(code: code, language: language))
        return r.formatted
    }

    func getMySocials() async throws -> [SocialLink] {
        return try await fetch("/api/users/me/socials")
    }

    func updateMySocials(_ socials: [SocialLink]) async throws {
        struct B: Encodable { let socials: [SocialLink] }
        let _: EmptyResponse = try await fetch("/api/users/me/socials", method: "PUT", body: B(socials: socials))
    }

    func saveOnboardingData(seniority: String, domain: String, techStack: [String], bio: String?, company: String?, roleTitle: String?) async throws {
        struct B: Encodable { let seniority: String; let domain: String; let techStack: [String]; let bio: String?; let company: String?; let roleTitle: String? }
        let _: EmptyResponse = try await fetch("/api/users/me/profile", method: "PUT", body: B(seniority: seniority, domain: domain, techStack: techStack, bio: bio, company: company, roleTitle: roleTitle))
    }

    func getMyBookmarks() async throws -> [Post] {
        let paged: PagedResponse<ByteResponse> = try await fetch("/api/me/bookmarks")
        // Every result is definitionally a bookmark, so force `isBookmarked = true`
        // even if the projection omits it. Without this, the save toggle on a
        // detail view opened from this list shows the unsaved state until the
        // next refresh.
        return paged.items.map { byte in
            var post = Post(from: byte)
            post.isBookmarked = true
            return post
        }
    }

    func getMyBytes(page: Int = 1) async throws -> [Post] {
        let paged: PagedResponse<ByteResponse> = try await fetch("/api/me/bytes?page=\(page)&pageSize=20")
        return paged.items.map { Post(from: $0) }
    }

    func getMyInterviews(page: Int = 1) async throws -> [Interview] {
        let paged: PagedResponse<InterviewResponse> = try await fetch("/api/me/interviews?page=\(page)&pageSize=20")
        return paged.items.map { Interview(from: $0) }
    }

    func deleteMyInterview(interviewId: String) async throws {
        let _: EmptyResponse = try await fetch("/api/interviews/\(interviewId)", method: "DELETE")
    }

    func getMyInterviewBookmarks() async throws -> [Interview] {
        let paged: PagedResponse<InterviewResponse> = try await fetch("/api/me/interview-bookmarks")
        return paged.items.map { Interview(from: $0) }
    }

    func deletePost(postId: String) async throws {
        let _: EmptyResponse = try await fetch("/api/bytes/\(postId)", method: "DELETE")
    }

    func getLikes(postId: String) async throws -> [LikeUser] {
        let items: [LikeUserResponse] = try await fetch("/api/bytes/\(postId)/likes")
        return items.map { LikeUser(id: $0.userId, displayName: $0.displayName, username: $0.username, avatarVariant: "cyan") }
    }

    func updateProfile(
        username: String? = nil,
        displayName: String? = nil,
        bio: String? = nil,
        company: String? = nil,
        roleTitle: String? = nil,
        techStack: [String]? = nil,
        avatarVariant: String? = nil,
        links: [SocialLink]? = nil
    ) async throws -> User {
        struct LinkBody: Encodable {
            let platform: String
            let url: String
            let label: String?
        }
        struct B: Encodable {
            let username: String?
            let displayName: String?
            let bio: String?
            let company: String?
            let roleTitle: String?
            let techStack: [String]?
            let avatarVariant: String?
            let links: [LinkBody]?
        }
        let r: UserResponse = try await fetch("/api/users/me/profile", method: "PUT", body: B(
            username: username,
            displayName: displayName,
            bio: bio,
            company: company,
            roleTitle: roleTitle,
            techStack: techStack,
            avatarVariant: avatarVariant,
            links: links?.map { LinkBody(platform: $0.platform, url: $0.url, label: $0.label) }
        ))
        return User(from: r)
    }

    // MARK: - Drafts

    func getMyDrafts() async throws -> [Draft] {
        let paged: PagedResponse<Draft> = try await fetch("/api/me/drafts")
        return paged.items
    }

    func saveDraft(id: String?, title: String?, body: String?, codeSnippet: String?, language: String?, tags: [String]) async throws -> String {
        struct B: Encodable { let title: String?; let body: String?; let codeSnippet: String?; let language: String?; let tags: [String] }
        struct R: Decodable { let id: String }
        let path = id.map { "/api/me/drafts/\($0)" } ?? "/api/me/drafts"
        let method = id == nil ? "POST" : "PUT"
        let r: R = try await fetch(path, method: method, body: B(title: title, body: body, codeSnippet: codeSnippet, language: language, tags: tags))
        return r.id
    }

    func deleteDraft(id: String) async throws {
        let _: EmptyResponse = try await fetch("/api/me/drafts/\(id)", method: "DELETE")
    }

    // MARK: - Feature flags

    func getEnabledFeatureFlags() async throws -> [String: Bool] {
        // Backend returns { data: { "chat": true, "ai-search-ask": true, ... } } — a dict
        // keyed by flag name. Earlier shape (list of {key, enabled}) silently failed to
        // decode and left every flag check returning false.
        let dict: [String: Bool] = try await fetch("/api/feature-flags")
        return dict
    }

    // MARK: - Chat (REST history)

    func getConversations() async throws -> [ConversationDto] {
        return try await fetch("/api/conversations")
    }

    func getMessages(conversationId: String, before: String? = nil) async throws -> [MessageDto] {
        var path = "/api/conversations/\(conversationId)/messages"
        if let before, let encoded = before.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) {
            path += "?cursor=\(encoded)"
        }
        let wire: [MessageWire] = try await fetch(path)
        return wire.map { MessageDto(from: $0, conversationId: conversationId) }
    }

    /// Mirrors web `getOrCreateConversation`: backend returns `{conversationId, canMessage}`.
    /// We re-fetch the conversation list to hand callers a fully-populated DTO, since they
    /// navigate directly into the thread.
    func getOrCreateConversation(otherUserId: String) async throws -> ConversationDto {
        struct B: Encodable { let recipientId: String }
        struct R: Decodable { let conversationId: String; let canMessage: Bool }
        let r: R = try await fetch("/api/conversations", method: "POST", body: B(recipientId: otherUserId))
        let all = try await getConversations()
        if let dto = all.first(where: { $0.id == r.conversationId }) { return dto }
        throw APIError.http(500, "Conversation \(r.conversationId) not found after create")
    }

    func getMutualFollows() async throws -> [PersonResult] {
        let items: [MutualFollowResponse] = try await fetch("/api/conversations/messageable")
        return items.map { PersonResult(from: $0) }
    }

    // MARK: - Lookups

    func getSeniorityTypes() async throws -> [SeniorityType] {
        let items: [SeniorityTypeResponse] = try await fetch("/api/lookup/seniority-types")
        return items.map { SeniorityType(id: $0.id, name: $0.name, label: $0.label, icon: $0.icon) }
    }

    func getDomains() async throws -> [Domain] {
        let items: [DomainResponse] = try await fetch("/api/lookup/domains")
        return items.map { Domain(id: $0.id, name: $0.name, label: $0.label, icon: $0.icon) }
    }

    func getTechStacks(domainId: String? = nil) async throws -> [TechStack] {
        let qs = domainId.map { "domainId=\($0)" } ?? ""
        let items: [TechStackResponse] = try await fetch("/api/lookup/tech-stacks?\(qs)")
        return items.map { TechStack(id: $0.id, name: $0.name, label: $0.label, subdomainId: $0.subdomainId) }
    }

    func getBadgeTypes() async throws -> [BadgeType] {
        struct R: Decodable { let id: String; let name: String; let label: String; let icon: String; let description: String? }
        let items: [R] = try await fetch("/api/lookup/badge-types")
        return items.map { BadgeType(id: $0.id, name: $0.name, label: $0.label, icon: $0.icon, description: $0.description) }
    }

    // MARK: - Support feedback (terminal widget — web parity: /api/support/feedback)

    func submitFeedback(type: String, message: String, pageContext: String? = nil) async throws -> FeedbackEntry {
        struct B: Encodable { let type: String; let message: String; let pageContext: String? }
        let r: FeedbackEntry = try await fetch("/api/support/feedback", method: "POST",
                                               body: B(type: type, message: message, pageContext: pageContext))
        return r
    }

    func getMyFeedbackHistory() async throws -> [FeedbackEntry] {
        let items: [FeedbackEntry] = try await fetch("/api/support/feedback/history")
        return items
    }

    // MARK: - User content reports (terminal "report" command)

    struct ReportResponse: Decodable { let id: String; let status: String }

    func reportContent(contentType: String, contentId: String, message: String?) async throws -> ReportResponse {
        struct B: Encodable { let contentType: String; let contentId: String; let reasonCode: String; let message: String? }
        struct Wrapper: Decodable { let data: ReportResponse }
        let w: Wrapper = try await fetch("/api/moderation/reports", method: "POST",
                                         body: B(contentType: contentType, contentId: contentId,
                                                 reasonCode: "USER_REPORT", message: message))
        return w.data
    }
}

// MARK: - API Error

enum APIError: LocalizedError {
    case http(Int, String)
    case unauthorized
    case invalidContent(String)
    case contentRejected(ContentRejection)

    var errorDescription: String? { APIError.userMessage(from: self) }

    /// Convenience: extract the typed rejection from any error, regardless of
    /// whether it surfaced as the new 422 envelope or the legacy 400. Returns
    /// nil for non-moderation errors. Also handles non-APIError sources (e.g.
    /// SignalR HubException) by scanning the localized description for a
    /// CONTENT_REJECTED JSON envelope. Used by call sites that want to drive
    /// `ContentRejectedModal` uniformly.
    static func rejection(from error: Error) -> ContentRejection? {
        if let api = error as? APIError {
            switch api {
            case .contentRejected(let r):    return r
            case .invalidContent(let reason): return .legacy(reason)
            default:                         break
            }
        }
        // Fallback: SignalR / arbitrary errors whose `localizedDescription`
        // embeds the backend's CONTENT_REJECTED JSON. We slice from the first
        // `{` to the matching last `}` and try to decode the moderation shape.
        let text = error.localizedDescription
        if text.contains("CONTENT_REJECTED"),
           let start = text.firstIndex(of: "{"),
           let end = text.lastIndex(of: "}") {
            let slice = String(text[start...end])
            if let data = slice.data(using: .utf8),
               let decoded = try? JSONDecoder().decode(ContentRejectedShape.self, from: data),
               decoded.error == "CONTENT_REJECTED" {
                let reasons = (decoded.reasons ?? []).compactMap { r -> ContentRejection.Reason? in
                    guard let code = r.code, !code.isEmpty else { return nil }
                    return ContentRejection.Reason(code: code, message: r.message ?? "")
                }
                if !reasons.isEmpty {
                    return ContentRejection(reasons: reasons)
                }
            }
        }
        return nil
    }

    static func userMessage(from error: Error) -> String {
        if let api = error as? APIError {
            switch api {
            case .unauthorized:
                return "Session expired — please sign in again"
            case .invalidContent(let reason):
                return reason.isEmpty ? "Content not valid for ByteAI" : reason
            case .contentRejected(let r):
                // Compact fallback string for callers that don't render the modal
                // (e.g. logging, generic toasts). Surfaces are expected to
                // intercept .contentRejected and show the rich modal/banner.
                let msg = r.reasons.first?.message
                return (msg?.isEmpty == false ? msg! : "Content rejected by moderation")
            case .http(422, let msg) where !msg.isEmpty && msg != "Stream request failed.":
                return msg
            case .http(400, let msg): return msg.isEmpty ? "Bad request — check your input" : msg
            case .http(401, _): return "Session expired — please sign in again"
            case .http(403, _): return "You don't have permission to do that"
            case .http(404, _): return "That content no longer exists"
            case .http(409, _): return "Conflict — someone else made a change"
            case .http(429, _): return "Too many requests — slow down a moment"
            case .http(let code, _) where code >= 500:
                return "Server error — please try again"
            case .http(_, let msg): return msg.isEmpty ? "Something went wrong" : msg
            }
        }
        if let url = error as? URLError {
            switch url.code {
            case .timedOut:              return "Request timed out — check your connection"
            case .notConnectedToInternet: return "No internet connection"
            case .networkConnectionLost: return "Connection lost — check your network"
            default:                     return "Network error — check your connection"
            }
        }
        return error.localizedDescription
    }
}

extension Notification.Name {
    static let apiDidReceiveUnauthorized = Notification.Name("APIClientDidReceiveUnauthorized")

    /// Posted when a user's avatar changes (own upload, or learned from a refresh).
    /// userInfo: ["userId": String, "avatarUrl": String?]. Already-mounted views
    /// (post cards, mini profiles, comment compose, notification rows) listen
    /// and replace cached images without waiting for the next list refresh.
    static let avatarChanged = Notification.Name("ByteAIAvatarChanged")

    /// Posted when the comment list for a post is mutated (added or removed).
    /// userInfo: ["postId": String, "delta": Int]. Lets PostDetailView and feed
    /// rows update the post's comment counter without re-fetching the byte.
    static let postCommentsChanged = Notification.Name("ByteAIPostCommentsChanged")

    /// Posted when the AppDelegate receives an APNs payload while the app is
    /// in the foreground. userInfo carries the original APNs payload (`type`,
    /// `byteId`, `conversationId`, etc.) so listeners — chiefly the
    /// notifications panel and bell badge — can update their state without
    /// hitting the server. A single `getUnreadCount` reconciliation on next
    /// foreground transition is the safety net for any pushes APNs dropped.
    static let pushReceived = Notification.Name("ByteAIPushReceived")

    /// Posted after markRead or markAllRead succeeds. userInfo: ["delta": Int]
    /// (negative number = how many were marked read). NotificationBadgeVM listens
    /// and decrements its count immediately so the tab badge stays in sync.
    static let notificationsMarkedRead = Notification.Name("ByteAINotificationsMarkedRead")

    /// Posted when the signed-in user updates their tech-stack preferences from
    /// the profile screen. userInfo: ["userId": String, "techStack": [String]].
    /// FeedViewModel mirrors the For-You filter to the new list immediately so
    /// the feed reflects the change without remounting.
    static let techStackChanged = Notification.Name("ByteAITechStackChanged")
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

// MARK: - Wire Envelope / Response Types

struct APIEnvelope<T: Decodable>: Decodable { let data: T }
struct PagedResponse<T: Decodable>: Decodable {
    let items: [T]; let total: Int; let page: Int; let pageSize: Int
}
struct EmptyResponse: Decodable {}

struct ByteResponse: Decodable {
    let id: String
    let authorId: String
    let authorUsername: String?
    let authorDisplayName: String?
    let authorAvatarUrl: String?
    let title: String
    let body: String
    let codeSnippet: String?
    let language: String?
    let tags: [String]?
    let type: String
    let createdAt: String
    let commentCount: Int
    let likeCount: Int
    let isLiked: Bool?
    let isBookmarked: Bool?
}

struct UserResponse: Decodable {
    let id: String
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
    let isOnboarded: Bool
    let badges: [BadgeResponse]
    let avatarUrl: String?
    // Optional projections — the backend sends these from /api/users/{id} and
    // /api/users/username/{name} but not from embedded objects (e.g. byte.author).
    let bytesCount: Int?
    let followersCount: Int?
    let followingCount: Int?
    let isFollowedByMe: Bool?
    let techStack: [String]?
}

struct BadgeResponse: Decodable {
    let name: String
    let label: String
    let icon: String
    let earnedAt: String?
}

struct CommentAuthorSummary: Decodable {
    let id: String
    let username: String
    let displayName: String
    let initials: String
    let avatarUrl: String?
}

struct CommentResponse: Decodable {
    let id: String
    let body: String
    let voteCount: Int
    let createdAt: String
    let parentId: String?
    let author: CommentAuthorSummary
}

struct InterviewResponse: Decodable {
    let id: String
    let authorId: String
    let title: String
    let company: String?
    let role: String?
    let location: String?
    let difficulty: String
    let type: String
    let createdAt: String
    let commentCount: Int?
    let questions: [InterviewQuestionResponse]
    let authorUsername: String?
    let authorDisplayName: String?
    let authorAvatarUrl: String?
    let authorRole: String?
    let authorCompany: String?
    let isBookmarked: Bool?
    let isAnonymous: Bool?
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
    let actorUsername: String?
    let actorDisplayName: String?
    let actorAvatarUrl: String?
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

// Mirrors backend MutualFollowDto — the shape returned by /api/conversations/messageable.
struct MutualFollowResponse: Decodable {
    let id: String
    let username: String
    let displayName: String
    let avatarUrl: String?
}

struct SeniorityTypeResponse: Decodable { let id: String; let name: String; let label: String; let icon: String }
struct DomainResponse: Decodable { let id: String; let name: String; let label: String; let icon: String }
struct TechStackResponse: Decodable { let id: String; let subdomainId: String?; let name: String; let label: String }

struct SearchResponse: Decodable {
    let id: String
    let authorId: String
    let authorUsername: String?
    let authorDisplayName: String?
    let authorAvatarUrl: String?
    let authorRoleTitle: String?
    let authorCompany: String?
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

// Similar bytes — mirrors Service/ByteAI.Api/ViewModels/AiViewModels.cs SimilarByteResponse.
// Backend payload includes author profile fields (avatar, role, company) but NOT
// like / comment counts. The earlier iOS decoder demanded those counts, which
// caused the entire request to fail with the user seeing "Couldn't load".
struct SimilarByteResponse: Decodable {
    let id: String
    let authorId: String
    let authorUsername: String
    let authorAvatarUrl: String?
    let authorRoleTitle: String?
    let authorCompany: String?
    let title: String
    let body: String
    let codeSnippet: String?
    let language: String?
    let type: String
    let createdAt: String
    let tags: [String]
}

struct SimilarByte: Identifiable {
    let id: String
    let authorId: String
    let authorUsername: String
    let authorAvatarUrl: String?
    let authorRoleTitle: String?
    let authorCompany: String?
    let title: String
    let body: String
    let codeSnippet: String?
    let language: String?
    let type: String
    let createdAt: String
    let tags: [String]

    init(from r: SimilarByteResponse) {
        self.id = r.id
        self.authorId = r.authorId
        self.authorUsername = r.authorUsername
        self.authorAvatarUrl = r.authorAvatarUrl
        self.authorRoleTitle = r.authorRoleTitle
        self.authorCompany = r.authorCompany
        self.title = r.title
        self.body = r.body
        self.codeSnippet = r.codeSnippet
        self.language = r.language
        self.type = r.type
        self.createdAt = r.createdAt
        self.tags = r.tags
    }
}

struct UserSearchResponse: Decodable {
    let id: String
    let username: String
    let displayName: String
    let bio: String?
    let avatarUrl: String?
    let isVerified: Bool
}

// MARK: - Drafts / Chat DTOs

struct Draft: Decodable, Identifiable, Hashable {
    let id: String
    let title: String?
    let body: String?
    let codeSnippet: String?
    let language: String?
    let tags: [String]?
    let updatedAt: String
}

struct ConversationDto: Decodable, Identifiable, Hashable {
    let id: String
    let otherUserId: String
    let otherUsername: String
    let otherDisplayName: String
    let otherAvatarUrl: String?
    var lastMessage: String?
    var lastMessageAt: String?
    var hasUnread: Bool
    /// False once the relationship is no longer mutual. UI greys out the send input;
    /// server enforces this on SignalR send too. Defaults to true for legacy payloads
    /// from older servers that don't emit the field.
    var canMessage: Bool = true

    private enum CodingKeys: String, CodingKey {
        case id, otherUserId, otherUsername, otherDisplayName, otherAvatarUrl
        case lastMessage, lastMessageAt, hasUnread, canMessage
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        self.id = try c.decode(String.self, forKey: .id)
        self.otherUserId = try c.decode(String.self, forKey: .otherUserId)
        self.otherUsername = try c.decode(String.self, forKey: .otherUsername)
        self.otherDisplayName = try c.decode(String.self, forKey: .otherDisplayName)
        self.otherAvatarUrl = try c.decodeIfPresent(String.self, forKey: .otherAvatarUrl)
        self.lastMessage = try c.decodeIfPresent(String.self, forKey: .lastMessage)
        self.lastMessageAt = try c.decodeIfPresent(String.self, forKey: .lastMessageAt)
        self.hasUnread = try c.decode(Bool.self, forKey: .hasUnread)
        self.canMessage = try c.decodeIfPresent(Bool.self, forKey: .canMessage) ?? true
    }
}

struct MessageDto: Decodable, Identifiable, Hashable {
    let id: String
    let conversationId: String
    let senderId: String
    let content: String
    let sentAt: String
    let readAt: String?
}

/// Wire shape returned by `GET /api/conversations/{id}/messages`. The backend's MessageDto
/// omits `conversationId` (it's already in the URL), so we inject it during mapping.
private struct MessageWire: Decodable {
    let id: String
    let senderId: String
    let content: String
    let sentAt: String
    let readAt: String?
}

private extension MessageDto {
    init(from wire: MessageWire, conversationId: String) {
        self.id = wire.id
        self.conversationId = conversationId
        self.senderId = wire.senderId
        self.content = wire.content
        self.sentAt = wire.sentAt
        self.readAt = wire.readAt
    }
}

// MARK: - Domain model initialisers from API responses

extension Post {
    init(from b: ByteResponse) {
        let displayName = b.authorDisplayName ?? b.authorUsername ?? "User"
        let username = b.authorUsername ?? "user"
        let initials = Self.initials(from: displayName)
        let author = User(
            id: b.authorId,
            username: username,
            displayName: displayName,
            initials: initials,
            role: "", company: "", bio: "",
            level: 1, xp: 0, xpToNextLevel: 1000,
            followers: 0, following: 0, bytes: 0, reactions: 0, streak: 0,
            techStack: [], feedPreferences: [], links: [], badges: [],
            isVerified: false, isOnline: false,
            avatarVariant: "cyan", avatarUrl: b.authorAvatarUrl,
            isSystem: b.authorId == BYTEAI_SYSTEM_USER_ID
        )
        self.init(
            id: b.id,
            title: b.title,
            body: b.body,
            author: author,
            tags: b.tags ?? [],
            likes: b.likeCount,
            comments: b.commentCount,
            shares: 0,
            bookmarks: 0,
            timestamp: Self.relativeTime(from: b.createdAt),
            isLiked: b.isLiked ?? false,
            isBookmarked: b.isBookmarked ?? false,
            code: b.codeSnippet.map { CodeSnippet(language: b.language ?? "text", filename: "snippet", content: $0) },
            views: nil,
            type: b.type == "interview" ? .interview : .byte
        )
    }

    fileprivate static func initials(from displayName: String) -> String {
        let trimmed = displayName.split(separator: " ").compactMap { $0.first }
        let first = trimmed.prefix(2).map(String.init).joined().uppercased()
        return first.isEmpty ? "U" : first
    }

    static func relativeTime(from iso: String) -> String {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        let date = formatter.date(from: iso)
            ?? ISO8601DateFormatter().date(from: iso)
        guard let date else { return iso }
        let diff = Date().timeIntervalSince(date)
        switch diff {
        case ..<60:    return "just now"
        case ..<3600:  return "\(Int(diff/60))m ago"
        case ..<86400: return "\(Int(diff/3600))h ago"
        default:       return "\(Int(diff/86400))d ago"
        }
    }
}

extension User {
    static func placeholder(id: String, username: String = "user", displayName: String = "User", avatarUrl: String? = nil) -> User {
        let initials = displayName.split(separator: " ").compactMap { $0.first }
            .prefix(2).map(String.init).joined().uppercased()
        return User(
            id: id, username: username, displayName: displayName,
            initials: initials.isEmpty ? "U" : initials,
            role: "", company: "", bio: "",
            level: 1, xp: 0, xpToNextLevel: 1000,
            followers: 0, following: 0, bytes: 0, reactions: 0, streak: 0,
            techStack: [], feedPreferences: [], links: [], badges: [],
            isVerified: false, isOnline: false,
            avatarVariant: "cyan", avatarUrl: avatarUrl
        )
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
            followers: r.followersCount ?? 0,
            following: r.followingCount ?? 0,
            bytes: r.bytesCount ?? 0,
            reactions: 0,
            streak: r.streak,
            techStack: r.techStack ?? [],
            feedPreferences: [],
            links: [],
            badges: r.badges.map { Badge(id: $0.name, name: $0.name, icon: $0.icon, earned: true) },
            isVerified: r.isVerified,
            isOnline: false,
            avatarVariant: "cyan",
            avatarUrl: r.avatarUrl,
            isOnboarded: r.isOnboarded,
            isFollowedByMe: r.isFollowedByMe
        )
    }
}

extension Comment {
    init(from r: CommentResponse) {
        self.init(
            id: r.id,
            content: r.body,
            author: User.placeholder(id: r.author.id, username: r.author.username, displayName: r.author.displayName, avatarUrl: r.author.avatarUrl),
            timestamp: Post.relativeTime(from: r.createdAt),
            replies: [],
            votes: r.voteCount
        )
    }
}

extension Interview {
    init(from r: InterviewResponse) {
        // Build author from rich fields when present; fall back to placeholder.
        let author: User = {
            guard let username = r.authorUsername, !username.isEmpty else {
                return User.placeholder(id: r.authorId)
            }
            let displayName = r.authorDisplayName?.isEmpty == false ? r.authorDisplayName! : username
            let initials = String(displayName.prefix(1)).uppercased()
            return User(
                id: r.authorId,
                username: username,
                displayName: displayName,
                initials: initials,
                role: r.authorRole ?? "",
                company: r.authorCompany ?? "",
                bio: "",
                level: 1, xp: 0, xpToNextLevel: 1000,
                followers: 0, following: 0, bytes: 0, reactions: 0, streak: 0,
                techStack: [], feedPreferences: [], links: [], badges: [],
                isVerified: false, isOnline: false,
                avatarVariant: "purple",
                avatarUrl: r.authorAvatarUrl
            )
        }()

        self.init(
            id: r.id,
            title: r.title,
            company: r.company,
            role: r.role,
            location: r.location,
            difficulty: Difficulty(rawValue: r.difficulty) ?? .medium,
            type: r.type,
            createdAt: r.createdAt,
            questions: r.questions.map { InterviewQuestion(from: $0) },
            author: author,
            commentCount: r.commentCount ?? 0,
            isAnonymous: r.isAnonymous ?? false,
            isBookmarked: r.isBookmarked ?? false
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
            actorUsername: r.actorUsername,
            actorDisplayName: r.actorDisplayName,
            actorAvatarUrl: r.actorAvatarUrl,
            read: r.read,
            createdAt: r.createdAt
        )
    }
}

extension Post {
    init(from r: SearchResponse) {
        let username = r.authorUsername ?? String(r.authorId.prefix(8))
        let displayName = r.authorDisplayName ?? username
        let initials = Self.initials(from: displayName)
        let author = User(
            id: r.authorId,
            username: username,
            displayName: displayName,
            initials: initials,
            role: r.authorRoleTitle ?? "",
            company: r.authorCompany ?? "",
            bio: "",
            level: 1, xp: 0, xpToNextLevel: 1000,
            followers: 0, following: 0, bytes: 0, reactions: 0, streak: 0,
            techStack: [], feedPreferences: [], links: [], badges: [],
            isVerified: false, isOnline: false,
            avatarVariant: "cyan", avatarUrl: r.authorAvatarUrl,
            isSystem: r.authorId == BYTEAI_SYSTEM_USER_ID
        )
        self.init(
            id: r.id,
            title: r.title,
            body: r.body,
            author: author,
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

    init(from r: UserResponse) {
        let initials = String(r.displayName.split(separator: " ")
            .compactMap { $0.first }.prefix(2).map { String($0) }.joined()).uppercased()
        self.init(
            id: r.id,
            username: r.username,
            displayName: r.displayName,
            initials: initials,
            role: r.roleTitle ?? "",
            company: r.company ?? "",
            followers: r.followersCount ?? 0,
            avatarVariant: "cyan",
            isFollowing: r.isFollowedByMe ?? false
        )
    }

    init(from r: MutualFollowResponse) {
        let initials = String(r.displayName.split(separator: " ")
            .compactMap { $0.first }.prefix(2).map { String($0) }.joined()).uppercased()
        self.init(
            id: r.id,
            username: r.username,
            displayName: r.displayName,
            initials: initials,
            role: "",
            company: "",
            followers: 0,
            avatarVariant: "cyan",
            isFollowing: true
        )
    }
}
