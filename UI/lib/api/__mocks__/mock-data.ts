import type { User, Post, Comment, Badge } from './api'

// Mock user data
export const mockCurrentUser: User = {
  id: '1',
  username: 'alex_xu',
  displayName: 'Alex Xu',
  initials: 'AX',
  role: 'SR. FRONTEND ENG',
  company: 'VERCEL',
  bio: 'Building fast UIs for fun and profit. React obsessive, performance nerd, occasional Rust experimenter. Shipped 3 OSS libs you\'ve probably used.',
  level: 9,
  xp: 7240,
  xpToNextLevel: 1240,
  followers: 2100,
  following: 318,
  bytes: 84,
  reactions: 12400,
  streak: 21,
  techStack: ['REACT', 'TYPESCRIPT', 'NODE.JS', 'NEXT.JS', 'RUST'],
  feedPreferences: ['REACT', 'TYPESCRIPT', 'RUST'],
  links: [
    { type: 'github', url: 'https://github.com/alex_xu', label: 'github/alex_xu' },
    { type: 'linkedin', url: 'https://linkedin.com/in/alex_xu', label: 'linkedin' },
    { type: 'website', url: 'https://alexxu.dev', label: 'alexxu.dev' },
  ],
  badges: [
    { id: '1', name: 'FIRST BYTE', icon: '🥇', earned: true },
    { id: '2', name: '100 REACTIONS', icon: '💡', earned: true },
    { id: '3', name: 'CONSISTENT POSTER', icon: '🔥', earned: true },
    { id: '4', name: 'SPEED CODER', icon: '⚡', earned: true },
    { id: '5', name: 'TOP CONTRIBUTOR', icon: '🏆', earned: false },
    { id: '6', name: '1K FOLLOWERS', icon: '🌟', earned: false },
  ],
  isVerified: true,
  isOnline: true,
}

export const mockUsers: User[] = [
  mockCurrentUser,
  {
    id: '2',
    username: 'sarah_conway',
    displayName: 'Sarah Conway',
    initials: 'SC',
    role: 'PRINCIPAL CLOUD ARCH',
    company: 'HYPERION',
    bio: '',
    level: 12,
    xp: 15000,
    xpToNextLevel: 2000,
    followers: 5400,
    following: 120,
    bytes: 156,
    reactions: 28000,
    streak: 45,
    techStack: ['AWS', 'KUBERNETES', 'TERRAFORM'],
    feedPreferences: ['DEVOPS', 'SECURITY'],
    links: [],
    badges: [],
    isVerified: false,
    isOnline: true,
  },
  {
    id: '3',
    username: 'jane_doe',
    displayName: 'Jane Doe',
    initials: 'JD',
    role: 'LEAD ENG',
    company: 'GOOGLE',
    bio: '',
    level: 10,
    xp: 9000,
    xpToNextLevel: 1500,
    followers: 3200,
    following: 89,
    bytes: 92,
    reactions: 18000,
    streak: 12,
    techStack: ['GO', 'PYTHON', 'GRPC'],
    feedPreferences: ['AI / ML', 'ARCHITECTURE'],
    links: [],
    badges: [],
    isVerified: false,
    isOnline: false,
  },
  {
    id: '4',
    username: 'kl_builds',
    displayName: 'KL',
    initials: 'KL',
    role: 'STAFF ENG',
    company: 'SHOPIFY',
    bio: '',
    level: 11,
    xp: 11000,
    xpToNextLevel: 1800,
    followers: 4100,
    following: 156,
    bytes: 124,
    reactions: 22000,
    streak: 33,
    techStack: ['REACT', 'NEXT.JS', 'GRAPHQL'],
    feedPreferences: ['FRONTEND', 'ARCHITECTURE'],
    links: [],
    badges: [],
    isVerified: false,
    isOnline: true,
  },
  {
    id: '5',
    username: 'mia_perez',
    displayName: 'Mia Perez',
    initials: 'MP',
    role: 'FRONTEND LEAD',
    company: 'LINEAR',
    bio: '',
    level: 8,
    xp: 6200,
    xpToNextLevel: 1100,
    followers: 1800,
    following: 210,
    bytes: 67,
    reactions: 9500,
    streak: 8,
    techStack: ['REACT', 'TYPESCRIPT', 'ZUSTAND'],
    feedPreferences: ['FRONTEND', 'STATE MANAGEMENT'],
    links: [],
    badges: [],
    isVerified: false,
    isOnline: false,
  },
  {
    id: '6',
    username: 'dev_marcus',
    displayName: 'Marcus Chen',
    initials: 'MC',
    role: 'BACKEND LEAD',
    company: 'STRIPE',
    bio: '',
    level: 10,
    xp: 9500,
    xpToNextLevel: 1600,
    followers: 3800,
    following: 145,
    bytes: 98,
    reactions: 19000,
    streak: 28,
    techStack: ['GO', 'RUST', 'POSTGRES'],
    feedPreferences: ['BACKEND', 'SYSTEMS'],
    links: [],
    badges: [],
    isVerified: false,
    isOnline: true,
  },
]

// Following users (people the current user follows)
export const mockFollowing: User[] = mockUsers.slice(1)

export const mockPosts: Post[] = [
  {
    id: '1',
    author: mockUsers[0],
    title: 'useCallback vs useMemo: Stop Overusing Both.',
    body: 'Neither hook prevents renders by default. The real win only comes when paired with React.memo — profile first, optimize second.',
    code: {
      language: 'TYPESCRIPT',
      filename: 'hooks.ts',
      content: `const memoized = useMemo(() => expensive(a, b), [a, b]);
const callback = useCallback((x) => doSomething(x, dep), [dep]);
// Neither prevents child renders without React.memo!`,
    },
    tags: ['#REACT', '#HOOKS', '#PERF'],
    reactions: [
      { emoji: '💡', count: 218 },
      { emoji: '❤️', count: 84 },
    ],
    comments: 31,
    likes: 284,
    createdAt: '4m',
    isLiked: false,
    isBookmarked: false,
    views: 1240,
    type: 'byte',
  },
  {
    id: '2',
    author: mockUsers[3],
    title: 'React Server Components: What Nobody Tells You.',
    body: 'RSCs run only on the server — no hydration, no JS bundle. But mixing them with client components requires careful boundary design.',
    code: {
      language: 'TYPESCRIPT',
      filename: 'page.tsx',
      content: `// Server Component - no "use client"
export default async function Page() {
  const data = await db.query(); // Direct DB access!
  return <ClientWrapper data={data} />;
}`,
    },
    tags: ['#REACT', '#RSC', '#NEXT.JS'],
    reactions: [
      { emoji: '💡', count: 312 },
      { emoji: '🔥', count: 156 },
    ],
    comments: 47,
    likes: 468,
    createdAt: '2h',
    isLiked: true,
    isBookmarked: false,
    views: 3420,
    type: 'byte',
  },
  {
    id: '3',
    author: mockUsers[4],
    title: 'Zustand vs Redux Toolkit in 2025.',
    body: 'For most React apps, Zustand wins on simplicity. RTK still wins at scale — devtools, slices, and middleware all mature. Choose based on team size.',
    tags: ['#REACT', '#STATE', '#ZUSTAND'],
    reactions: [
      { emoji: '💡', count: 198 },
      { emoji: '❤️', count: 76 },
    ],
    comments: 22,
    likes: 274,
    createdAt: '5h',
    isLiked: false,
    isBookmarked: false,
    views: 2180,
    type: 'byte',
  },
  {
    id: '4',
    author: mockUsers[1],
    title: 'Kubernetes Pod Security: The Missing Guide',
    body: 'Most K8s deployments ship with default security contexts. Here\'s how to lock down your pods without breaking everything.',
    code: {
      language: 'YAML',
      filename: 'pod-security.yaml',
      content: `securityContext:
  runAsNonRoot: true
  runAsUser: 1000
  readOnlyRootFilesystem: true
  capabilities:
    drop: ["ALL"]`,
    },
    tags: ['#K8S', '#SECURITY', '#DEVOPS'],
    reactions: [
      { emoji: '💡', count: 156 },
      { emoji: '🔥', count: 89 },
    ],
    comments: 18,
    likes: 245,
    createdAt: '8h',
    isLiked: false,
    isBookmarked: false,
    views: 1890,
    type: 'byte',
  },
  {
    id: '5',
    author: mockUsers[5],
    title: 'Rust Error Handling Patterns',
    body: 'The ? operator is just the beginning. Here\'s how to build composable error types that make debugging a breeze.',
    code: {
      language: 'RUST',
      filename: 'errors.rs',
      content: `#[derive(Debug, thiserror::Error)]
pub enum AppError {
    #[error("Database error: {0}")]
    Database(#[from] sqlx::Error),
    #[error("Not found: {0}")]
    NotFound(String),
}`,
    },
    tags: ['#RUST', '#ERRORS', '#PATTERNS'],
    reactions: [
      { emoji: '💡', count: 267 },
      { emoji: '❤️', count: 112 },
    ],
    comments: 34,
    likes: 379,
    createdAt: '12h',
    isLiked: false,
    isBookmarked: false,
    views: 4520,
    type: 'byte',
  },
]

// Trending posts - most viewed in last 24 hours
export const mockTrendingPosts: Post[] = [
  ...mockPosts.sort((a, b) => (b.views || 0) - (a.views || 0)),
  {
    id: '6',
    author: mockUsers[2],
    title: 'AI Code Review: GPT vs Claude vs Gemini',
    body: 'Tested all three on 100 real PRs. The results surprised me. Claude excels at architecture, GPT at bug detection, Gemini at documentation.',
    tags: ['#AI', '#CODE-REVIEW', '#TOOLS'],
    reactions: [
      { emoji: '💡', count: 892 },
      { emoji: '🔥', count: 456 },
    ],
    comments: 127,
    likes: 1348,
    createdAt: '6h',
    isLiked: false,
    isBookmarked: false,
    views: 12400,
    type: 'byte',
  },
]

// Interview posts
export const mockInterviewPosts: Post[] = [
  {
    id: 'int-1',
    author: mockUsers[2],
    title: 'FAANG System Design: Design Twitter',
    body: 'A complete walkthrough of designing Twitter at scale. Covers feed generation, caching strategies, and real-time delivery.',
    code: {
      language: 'TYPESCRIPT',
      filename: 'system-design.ts',
      content: `// Key decisions for Twitter design
interface TweetService {
  // Fan-out on write for users with < 10K followers
  // Fan-out on read for celebrities
  postTweet(userId: string, content: string): Promise<Tweet>;
  getFeed(userId: string): Promise<Tweet[]>;
}`,
    },
    tags: ['#SYSTEM-DESIGN', '#FAANG', '#INTERVIEW'],
    reactions: [
      { emoji: '💡', count: 567 },
      { emoji: '❤️', count: 234 },
    ],
    comments: 89,
    likes: 801,
    createdAt: '1d',
    isLiked: false,
    isBookmarked: false,
    views: 8900,
    type: 'interview',
  },
  {
    id: 'int-2',
    author: mockUsers[3],
    title: 'Top 10 React Interview Questions 2026',
    body: 'Compiled from 50+ actual interviews at top tech companies. Includes the tricky edge cases interviewers love.',
    tags: ['#REACT', '#INTERVIEW', '#FRONTEND'],
    reactions: [
      { emoji: '💡', count: 423 },
      { emoji: '🔥', count: 189 },
    ],
    comments: 56,
    likes: 612,
    createdAt: '2d',
    isLiked: true,
    isBookmarked: false,
    views: 6700,
    type: 'interview',
  },
  {
    id: 'int-3',
    author: mockUsers[5],
    title: 'LeetCode Patterns You Must Know',
    body: 'Stop grinding random problems. These 15 patterns cover 80% of coding interviews. Master these first.',
    code: {
      language: 'PYTHON',
      filename: 'patterns.py',
      content: `# Sliding Window Pattern
def max_subarray_sum(arr, k):
    window_sum = sum(arr[:k])
    max_sum = window_sum
    for i in range(k, len(arr)):
        window_sum += arr[i] - arr[i-k]
        max_sum = max(max_sum, window_sum)
    return max_sum`,
    },
    tags: ['#LEETCODE', '#DSA', '#INTERVIEW'],
    reactions: [
      { emoji: '💡', count: 789 },
      { emoji: '❤️', count: 345 },
    ],
    comments: 112,
    likes: 1134,
    createdAt: '3d',
    isLiked: false,
    isBookmarked: false,
    views: 11200,
    type: 'interview',
  },
  {
    id: 'int-4',
    author: mockUsers[1],
    title: 'AWS Solutions Architect Interview Prep',
    body: 'Everything you need to know for the SA interview. VPC design, multi-region architectures, cost optimization.',
    tags: ['#AWS', '#CLOUD', '#INTERVIEW'],
    reactions: [
      { emoji: '💡', count: 312 },
      { emoji: '🔥', count: 156 },
    ],
    comments: 43,
    likes: 468,
    createdAt: '4d',
    isLiked: false,
    isBookmarked: false,
    views: 5400,
    type: 'interview',
  },
]

// Posts by following users
export const getPostsByUser = (userId: string): Post[] => {
  return mockPosts.filter(p => p.author.id === userId)
}

export const mockComments: Comment[] = [
  {
    id: '1',
    postId: '1',
    author: mockUsers[1],
    content: 'Great point about React.memo. I see this mistake constantly in code reviews. The other thing people miss: useCallback with inline objects still breaks memoization.',
    votes: 42,
    createdAt: '2h ago',
    badge: 'TOP INSIGHT',
  },
  {
    id: '2',
    postId: '1',
    author: mockUsers[2],
    content: 'Profiling first is key. I\'ve seen teams add useMemo everywhere "just in case" and it actually made things slower due to the overhead.',
    votes: 28,
    createdAt: '1h ago',
  },
  {
    id: '3',
    postId: '2',
    author: mockUsers[3],
    content: 'Server components are great when you keep the boundary clean. The hardest part is avoiding client-only state leakage.',
    votes: 19,
    createdAt: '45m ago',
  },
  {
    id: '4',
    postId: '3',
    author: mockUsers[5],
    content: 'Zustand shines for local component state, but for cross-app data I still reach for RTKQuery.',
    votes: 34,
    createdAt: '30m ago',
    badge: 'TOP INSIGHT',
  },
]

export const mockBadges: Badge[] = [
  { id: '1', name: 'FIRST BYTE', icon: '🥇', earned: true },
  { id: '2', name: '100 REACTIONS', icon: '💡', earned: true },
  { id: '3', name: 'CONSISTENT POSTER', icon: '🔥', earned: true },
  { id: '4', name: 'SPEED CODER', icon: '⚡', earned: true },
  { id: '5', name: 'TOP CONTRIBUTOR', icon: '🏆', earned: false },
  { id: '6', name: '1K FOLLOWERS', icon: '🌟', earned: false },
]

export const seniorityLevels = [
  { id: 'junior', label: 'JUNIOR', icon: '🌱' },
  { id: 'mid', label: 'MID', icon: '⚙️' },
  { id: 'senior', label: 'SENIOR', icon: '🏆' },
  { id: 'lead', label: 'LEAD', icon: '🧭' },
  { id: 'arch', label: 'ARCH', icon: '📐' },
  { id: 'staff', label: 'STAFF+', icon: '🎯' },
]

export const domains = [
  { id: 'frontend', label: 'FRONTEND_ENGINEER', icon: '⚡' },
  { id: 'backend', label: 'BACKEND_ENGINEER', icon: '🔧' },
  { id: 'devops', label: 'DEVOPS_/_CLOUD', icon: '☁' },
  { id: 'aiml', label: 'AI_/_ML_ENGINEER', icon: '🤖' },
  { id: 'security', label: 'SECURITY_ENGINEER', icon: '🔒' },
]

export const techStacksByDomain: Record<string, string[]> = {
  frontend: ['REACT', 'VUE', 'ANGULAR', 'NEXT.JS', 'SVELTE', 'TYPESCRIPT', 'TAILWIND', 'WEBGL', 'WASM', 'GRAPHQL'],
  backend: ['NODE.JS', 'GO', 'RUST', 'PYTHON', 'JAVA', 'POSTGRES', 'REDIS', 'KAFKA', 'GRPC', 'GRAPHQL'],
  devops: ['DOCKER', 'KUBERNETES', 'AWS', 'GCP', 'TERRAFORM', 'ANSIBLE', 'PROMETHEUS', 'HELM', 'ARGOCD', 'ISTIO'],
  aiml: ['PYTORCH', 'TENSORFLOW', 'PYTHON', 'LANGCHAIN', 'HUGGING FACE', 'RAG', 'CUDA', 'MLFLOW', 'OPENAI API', 'VECTOR DB'],
  security: ['PENTEST', 'BURP SUITE', 'OWASP', 'ZERO TRUST', 'SIEM', 'CRYPTOGRAPHY', 'IDS/IPS', 'DEVSECOPS', 'PKI', 'COMPLIANCE'],
}

// All available tech stacks for filtering
export const allTechStacks = [
  'REACT', 'TYPESCRIPT', 'RUST', 'GO', 'PYTHON', 'NODE.JS', 'NEXT.JS',
  'VUE', 'ANGULAR', 'SVELTE', 'KUBERNETES', 'AWS', 'DOCKER', 'GRAPHQL',
  'POSTGRES', 'REDIS', 'AI / ML', 'WASM', 'GRPC', 'TERRAFORM'
]

export const feedTabs = [
  { id: 'for_you', label: 'FOR_YOU' },
  { id: 'following', label: 'FOLLOWING' },
  { id: 'trending', label: 'TRENDING' },
]

export const stackFilters = ['ALL', 'REACT', 'RUST', 'NODE', 'AI', 'GO', 'K8S']

export const searchFilters = ['ALL', 'BYTES', 'DEVS', 'TOPICS', 'CODE']

export const themes = [
  { id: 'dark',   label: 'DARK',   color: '#05050e' },
  { id: 'light',  label: 'LIGHT',  color: '#f4f5fb' },
  { id: 'hacker', label: 'HACKER', color: '#001200' },
  { id: 'nord',   label: 'NORD',   color: '#1a1e2e' },
]

export const feedPreferenceOptions = ['RUST', 'AI / ML', 'ARCHITECTURE', 'DEVOPS', 'SECURITY', 'WASM']

export const composeTags = ['#REACT', '#NODE', '#DOCKER', '#RUST', '#ARCH']

export const sortOptions = [
  { id: 'relevant', label: 'MOST RELEVANT' },
  { id: 'newest', label: 'NEWEST FIRST' },
  { id: 'oldest', label: 'OLDEST FIRST' },
]
