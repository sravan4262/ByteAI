import Foundation

// MARK: - Mock data (mirrors UI/lib/mock-data.ts)

enum MockData {

    static let users: [User] = [
        User(
            id: "u1",
            username: "alexchen",
            displayName: "Alex Chen",
            initials: "AC",
            role: "SR. FRONTEND ENG",
            company: "VERCEL",
            bio: "Building the future of the web. Obsessed with performance and DX.",
            level: 8,
            xp: 4200,
            xpToNextLevel: 5000,
            followers: 1247,
            following: 312,
            bytes: 89,
            reactions: 3456,
            streak: 14,
            techStack: ["REACT", "TYPESCRIPT", "NEXT.JS", "RUST"],
            feedPreferences: ["react", "performance", "typescript"],
            links: [
                SocialLink(type: "github", url: "https://github.com/alexchen", label: "alexchen"),
                SocialLink(type: "linkedin", url: "https://linkedin.com/in/alexchen", label: "alexchen")
            ],
            badges: MockData.badges,
            isVerified: true,
            isOnline: true,
            avatarVariant: "cyan",
            avatarUrl: nil
        ),
        User(
            id: "u2",
            username: "priyasharma",
            displayName: "Priya Sharma",
            initials: "PS",
            role: "STAFF ENGINEER",
            company: "STRIPE",
            bio: "Distributed systems, databases, and developer advocacy.",
            level: 11,
            xp: 9100,
            xpToNextLevel: 10000,
            followers: 4210,
            following: 198,
            bytes: 203,
            reactions: 12800,
            streak: 42,
            techStack: ["GO", "POSTGRESQL", "KAFKA", "K8S"],
            feedPreferences: ["distributed-systems", "databases"],
            links: [],
            badges: MockData.badges,
            isVerified: true,
            isOnline: false,
            avatarVariant: "purple",
            avatarUrl: nil
        )
    ]

    static let badges: [Badge] = [
        Badge(id: "b1", name: "First Byte",       icon: "⚡",  earned: true),
        Badge(id: "b2", name: "Trending Author",  icon: "🔥",  earned: true),
        Badge(id: "b3", name: "Code Wizard",      icon: "🧙",  earned: false),
        Badge(id: "b4", name: "30-Day Streak",    icon: "📅",  earned: true),
        Badge(id: "b5", name: "1K Followers",     icon: "🎯",  earned: false),
    ]

    static let posts: [Post] = [
        Post(
            id: "p1",
            title: "Why React 19 Concurrent Mode changes everything",
            body: "Concurrent rendering is the biggest paradigm shift since hooks. Here's what you need to know about Suspense boundaries, transitions, and the new use() hook that replaces most useEffect patterns.",
            author: users[0],
            tags: ["react", "performance", "javascript"],
            likes: 247,
            comments: 32,
            shares: 18,
            bookmarks: 89,
            timestamp: "2h ago",
            isLiked: false,
            isBookmarked: false,
            code: CodeSnippet(
                language: "typescript",
                filename: "use-data.ts",
                content: """
                // New use() hook replaces many useEffect patterns
                function UserProfile({ id }: { id: string }) {
                  const user = use(fetchUser(id)); // suspends automatically
                  return <Profile data={user} />;
                }
                """
            ),
            views: 4821,
            type: .byte
        ),
        Post(
            id: "p2",
            title: "PostgreSQL EXPLAIN ANALYZE — read it like a pro",
            body: "Most engineers ignore query plans until production is on fire. A Seq Scan on a 10M row table kills your p99. Here's the 5-node types you must understand before touching indexes.",
            author: users[1],
            tags: ["postgresql", "databases", "performance"],
            likes: 512,
            comments: 47,
            shares: 94,
            bookmarks: 231,
            timestamp: "5h ago",
            isLiked: true,
            isBookmarked: true,
            code: CodeSnippet(
                language: "sql",
                filename: "explain.sql",
                content: """
                EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
                  SELECT u.*, COUNT(p.id) AS post_count
                  FROM users u
                  LEFT JOIN posts p ON p.user_id = u.id
                  WHERE u.created_at > NOW() - INTERVAL '30 days'
                  GROUP BY u.id;
                """
            ),
            views: 9203,
            type: .byte
        ),
        Post(
            id: "p3",
            title: "Rust ownership in 90 seconds",
            body: "Ownership is not about memory management — it's about reasoning. Every value has exactly one owner. When the owner goes out of scope, the value is dropped. Borrowing lets you reference without owning.",
            author: users[0],
            tags: ["rust", "systems", "memory"],
            likes: 189,
            comments: 14,
            shares: 33,
            bookmarks: 67,
            timestamp: "1d ago",
            isLiked: false,
            isBookmarked: false,
            code: nil,
            views: 2441,
            type: .byte
        )
    ]

    static let interviews: [Interview] = [
        Interview(
            id: "i1",
            title: "Meta Frontend Interview Experience — L5",
            company: "META",
            role: "Frontend Engineer L5",
            difficulty: .hard,
            type: "Technical",
            createdAt: "3d ago",
            questions: [
                InterviewQuestion(
                    id: "q1",
                    question: "Design a virtualized list component for a feed with 100K items",
                    answer: "Use a windowing technique — only render items in the visible viewport plus a small buffer. Track scrollOffset and compute startIndex/endIndex from itemHeight. React-window and react-virtual are reference implementations. Key challenges: variable heights, dynamic loading, smooth scroll.",
                    orderIndex: 1,
                    likeCount: 89,
                    commentCount: 12,
                    isLiked: false
                ),
                InterviewQuestion(
                    id: "q2",
                    question: "Implement debounce from scratch",
                    answer: "Debounce delays invoking a function until after N ms have elapsed since the last invocation. Store a timer ref, clear it on each call, set a new one. Return a cancel method for cleanup. Key edge case: immediate invocation on leading edge.",
                    orderIndex: 2,
                    likeCount: 134,
                    commentCount: 8,
                    isLiked: true
                )
            ],
            author: users[0]
        ),
        Interview(
            id: "i2",
            title: "Stripe Backend Systems Design — Staff",
            company: "STRIPE",
            role: "Staff Engineer",
            difficulty: .medium,
            type: "System Design",
            createdAt: "1w ago",
            questions: [
                InterviewQuestion(
                    id: "q3",
                    question: "Design an idempotent payment processing system",
                    answer: "Use an idempotency key (UUID per request) stored in a Redis/DB table with TTL. On duplicate key, return the cached response. State machine: PENDING → PROCESSING → SUCCEEDED/FAILED. Use distributed locks (Redlock) for in-flight deduplication.",
                    orderIndex: 1,
                    likeCount: 203,
                    commentCount: 21,
                    isLiked: false
                )
            ],
            author: users[1]
        )
    ]

    static let notifications: [AppNotification] = [
        AppNotification(
            id: "n1",
            userId: "u1",
            type: .like,
            payload: NotificationPayload(
                byteId: "p1",
                actorId: "u2",
                actorUsername: "priyasharma",
                preview: "Why React 19 Concurrent Mode..."
            ),
            read: false,
            createdAt: "10m ago"
        ),
        AppNotification(
            id: "n2",
            userId: "u1",
            type: .follow,
            payload: NotificationPayload(
                byteId: nil,
                actorId: "u2",
                actorUsername: "priyasharma",
                preview: nil
            ),
            read: false,
            createdAt: "1h ago"
        ),
        AppNotification(
            id: "n3",
            userId: "u1",
            type: .badge,
            payload: NotificationPayload(
                byteId: nil,
                actorId: nil,
                actorUsername: nil,
                preview: "You earned the Trending Author badge!"
            ),
            read: true,
            createdAt: "2d ago"
        )
    ]
}
