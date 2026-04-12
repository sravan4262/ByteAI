// ─── Social link ───────────────────────────────────────────────────────────

export interface SocialLink {
  platform: string; // 'github' | 'linkedin' | 'twitter' | 'website'
  url: string;
  label?: string;
}

// ─── User ──────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  username: string;
  displayName: string;
  initials: string;
  role?: string;
  company?: string;
  bio?: string;
  seniority?: string;
  domain?: string;
  level: number;
  xp: number;
  xpToNextLevel: number;
  followers: number;
  following: number;
  bytes: number;
  reactions: number;
  streak: number;
  techStack: string[];
  badges: Badge[];
  isVerified: boolean;
  avatarVariant: AvatarVariant;
  avatarUrl?: string;
  socials?: SocialLink[];
}

export type AvatarVariant = 'cyan' | 'purple' | 'green' | 'orange';

// ─── Post / Byte ───────────────────────────────────────────────────────────

export interface CodeSnippet {
  language: string;
  filename?: string;
  content: string;
}

export interface Post {
  id: string;
  title: string;
  body: string;
  author: User;
  tags: string[];
  likes: number;
  comments: number;
  shares: number;
  bookmarks: number;
  timestamp: string;
  isLiked: boolean;
  isBookmarked: boolean;
  code?: CodeSnippet;
  views?: number;
  type: 'byte' | 'interview';
}

// ─── Interview ─────────────────────────────────────────────────────────────

export type Difficulty = 'easy' | 'medium' | 'hard';

export interface InterviewQuestion {
  id: string;
  question: string;
  answer: string;
  orderIndex: number;
  likeCount: number;
  commentCount: number;
  isLiked: boolean;
}

export interface Interview {
  id: string;
  title: string;
  company?: string;
  role?: string;
  difficulty: Difficulty;
  type: string;
  createdAt: string;
  questions: InterviewQuestion[];
  author: User;
}

// ─── Comment ───────────────────────────────────────────────────────────────

export interface Comment {
  id: string;
  content: string;
  author: User;
  timestamp: string;
  replies: Comment[];
  votes: number;
}

export interface QuestionComment {
  id: string;
  body: string;
  authorId: string;
  authorUsername: string;
  voteCount: number;
  createdAt: string;
  parentId?: string;
}

export interface InterviewComment {
  id: string;
  body: string;
  authorId: string;
  voteCount: number;
  createdAt: string;
  parentId?: string;
}

export interface AskByteResult {
  answer: string;
  sourceId: string;
  sourceTitle: string;
}

// ─── Notification ──────────────────────────────────────────────────────────

export type NotificationType = 'like' | 'comment' | 'follow' | 'badge' | 'system';

export interface AppNotification {
  id: string;
  userId: string;
  type: NotificationType;
  payload?: {
    byteId?: string;
    actorId?: string;
    actorUsername?: string;
    preview?: string;
  };
  read: boolean;
  createdAt: string;
}

// ─── Search ────────────────────────────────────────────────────────────────

export interface PersonResult {
  id: string;
  username: string;
  displayName: string;
  initials: string;
  role?: string;
  company?: string;
  followers: number;
  avatarVariant: AvatarVariant;
  isFollowing: boolean;
}

export interface AskResult {
  answer: string;
  sources: Post[];
}

export interface LikeUser {
  id: string;
  username: string;
  displayName: string;
  initials: string;
  avatarVariant: AvatarVariant;
}

// ─── Lookup ────────────────────────────────────────────────────────────────

export interface SeniorityType { id: string; name: string; }
export interface Domain { id: string; name: string; }
export interface TechStack { id: string; name: string; domainId?: string; }

// ─── Badge ─────────────────────────────────────────────────────────────────

export interface Badge {
  id: string;
  name: string;
  icon: string;
  earned: boolean;
}

// ─── Feed filter ───────────────────────────────────────────────────────────

export type FeedFilter = 'for_you' | 'trending' | 'following' | 'newest';

export const FEED_FILTERS: { key: FeedFilter; label: string }[] = [
  { key: 'for_you',   label: 'BYTES' },
  { key: 'trending',  label: 'TRENDING' },
  { key: 'following', label: 'FOLLOWING' },
  { key: 'newest',    label: 'NEWEST' },
];

export type SearchType = 'bytes' | 'interviews' | 'people';
