import Constants from 'expo-constants';
import {
  Post, Interview, Comment, AppNotification, User,
  PersonResult, AskResult, LikeUser, TechStack,
  SeniorityType, Domain, Badge, SocialLink,
  QuestionComment, InterviewComment, AskByteResult,
} from '../types/models';

// ─── Base URL ──────────────────────────────────────────────────────────────

const BASE_URL: string =
  (Constants.expoConfig?.extra?.apiUrl as string) ?? 'http://127.0.0.1:5239';

// ─── Auth token ────────────────────────────────────────────────────────────

let _token: string | null = null;

export function setApiToken(token: string | null) {
  _token = token;
}

// ─── Notification for 401 ─────────────────────────────────────────────────

type UnauthorizedListener = () => void;
let _unauthorizedListener: UnauthorizedListener | null = null;
export function setUnauthorizedListener(fn: UnauthorizedListener) {
  _unauthorizedListener = fn;
}

// ─── Core fetch ────────────────────────────────────────────────────────────

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
  params?: Record<string, string | number | boolean | undefined | null>;
}

async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, params } = opts;

  let url = `${BASE_URL}${path}`;
  if (params) {
    const qs = Object.entries(params)
      .filter(([, v]) => v != null && v !== '')
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
      .join('&');
    if (qs) url += `?${qs}`;
  }

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (_token) headers['Authorization'] = `Bearer ${_token}`;

  const res = await fetch(url, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401) {
    _unauthorizedListener?.();
    throw new Error('unauthorized');
  }

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`HTTP ${res.status}: ${text}`);
  }

  const text = await res.text();
  if (!text) return undefined as unknown as T;

  const json = JSON.parse(text);
  // Unwrap ApiResponse<T> envelope from the backend
  if (json && typeof json === 'object' && 'data' in json) return json.data as T;
  return json as T;
}

// ─── Response shapes (matching backend DTOs) ───────────────────────────────

interface UserResponse {
  id: string; clerkId: string; username: string; displayName: string;
  initials: string; role?: string; company?: string; bio?: string;
  level: number; xp: number; xpToNextLevel: number;
  followers: number; following: number; bytes: number; reactions: number; streak: number;
  techStack?: string[]; badges?: BadgeResponse[];
  isVerified: boolean; avatarVariant: string; avatarUrl?: string;
}

interface BadgeResponse {
  id: string; badgeTypeId: string; name: string; icon: string; earnedAt?: string;
}

interface PostResponse {
  id: string; title: string; body: string; author: UserResponse; tags: string[];
  likes: number; comments: number; shares: number; bookmarks: number;
  createdAt: string; isLiked: boolean; isBookmarked: boolean;
  codeSnippet?: { language: string; filename?: string; content: string };
  views?: number; type?: string;
}

interface InterviewResponse {
  id: string; title: string; company?: string; role?: string;
  difficulty: string; type: string; createdAt: string;
  questions: {
    id: string; question: string; answer: string; orderIndex: number;
    likeCount: number; commentCount: number; isLiked: boolean;
  }[];
  author: UserResponse;
}

interface CommentResponse {
  id: string; content: string; author: UserResponse; createdAt: string;
  replies: CommentResponse[]; votes: number;
}

interface SearchResponse {
  id: string; title: string; body: string; author: UserResponse;
  tags: string[]; likes: number; comments: number; shares: number;
  bookmarks: number; createdAt: string; isLiked: boolean; isBookmarked: boolean;
  codeSnippet?: { language: string; filename?: string; content: string };
  type?: string;
}

interface UserSearchResponse {
  id: string; username: string; displayName: string; initials: string;
  role?: string; company?: string; followers: number;
  avatarVariant: string; isFollowing: boolean;
}

interface LikeUserResponse {
  id: string; username: string; displayName: string; initials: string;
  avatarVariant: string;
}

// ─── Mappers ───────────────────────────────────────────────────────────────

function mapUser(r: UserResponse): import('../types/models').User {
  return {
    id: r.id, username: r.username, displayName: r.displayName, initials: r.initials,
    role: r.role, company: r.company, bio: r.bio,
    level: r.level ?? 1, xp: r.xp ?? 0, xpToNextLevel: r.xpToNextLevel ?? 1000,
    followers: r.followers ?? 0, following: r.following ?? 0,
    bytes: r.bytes ?? 0, reactions: r.reactions ?? 0, streak: r.streak ?? 0,
    techStack: r.techStack ?? [],
    badges: (r.badges ?? []).map(b => ({
      id: b.id, name: b.name, icon: b.icon, earned: !!b.earnedAt,
    })),
    isVerified: r.isVerified ?? false,
    avatarVariant: (r.avatarVariant as import('../types/models').AvatarVariant) ?? 'cyan',
    avatarUrl: r.avatarUrl,
  };
}

function mapPost(r: PostResponse | SearchResponse): Post {
  return {
    id: r.id, title: r.title, body: r.body,
    author: mapUser(r.author),
    tags: r.tags ?? [],
    likes: r.likes ?? 0, comments: r.comments ?? 0,
    shares: r.shares ?? 0, bookmarks: r.bookmarks ?? 0,
    timestamp: r.createdAt,
    isLiked: r.isLiked ?? false, isBookmarked: r.isBookmarked ?? false,
    code: r.codeSnippet
      ? { language: r.codeSnippet.language, filename: r.codeSnippet.filename, content: r.codeSnippet.content }
      : undefined,
    type: (r.type as 'byte' | 'interview') ?? 'byte',
  };
}

function mapInterview(r: InterviewResponse): Interview {
  return {
    id: r.id, title: r.title, company: r.company, role: r.role,
    difficulty: (r.difficulty as import('../types/models').Difficulty) ?? 'medium',
    type: r.type, createdAt: r.createdAt,
    questions: r.questions.map(q => ({ ...q })),
    author: mapUser(r.author),
  };
}

function mapComment(r: CommentResponse): Comment {
  return {
    id: r.id, content: r.content, author: mapUser(r.author),
    timestamp: r.createdAt, votes: r.votes ?? 0,
    replies: (r.replies ?? []).map(mapComment),
  };
}

// ─── API methods ───────────────────────────────────────────────────────────

export const API = {
  // Feed
  getFeed: async (filter: string, stack?: string, page = 1): Promise<Post[]> => {
    const rows = await request<PostResponse[]>('/api/feed', {
      params: { filter, stack, page, pageSize: 20 },
    });
    return (rows ?? []).map(mapPost);
  },

  getPost: async (id: string): Promise<Post> => {
    const r = await request<PostResponse>(`/api/bytes/${id}`);
    return mapPost(r);
  },

  toggleLike: async (postId: string): Promise<void> => {
    await request(`/api/bytes/${postId}/likes`, { method: 'POST' });
  },

  toggleBookmark: async (postId: string, type: 'byte' | 'interview' = 'byte'): Promise<{ isSaved: boolean }> => {
    const url = type === 'interview'
      ? `/api/interviews/${postId}/bookmarks`
      : `/api/bytes/${postId}/bookmarks`;
    return request(url, { method: 'POST' });
  },

  getLikes: async (postId: string): Promise<LikeUser[]> => {
    const rows = await request<LikeUserResponse[]>(`/api/bytes/${postId}/likes`);
    return (rows ?? []).map(r => ({
      id: r.id, username: r.username, displayName: r.displayName,
      initials: r.initials,
      avatarVariant: (r.avatarVariant as import('../types/models').AvatarVariant) ?? 'cyan',
    }));
  },

  // ─── Comments ──────────────────────────────────────────────────────────

  getComments: async (postId: string): Promise<Comment[]> => {
    const rows = await request<CommentResponse[]>(`/api/bytes/${postId}/comments`);
    return (rows ?? []).map(mapComment);
  },

  addComment: async (postId: string, body: string): Promise<void> => {
    await request(`/api/bytes/${postId}/comments`, { method: 'POST', body: { body } });
  },

  deleteComment: async (commentId: string): Promise<void> => {
    await request(`/api/comments/${commentId}`, { method: 'DELETE' });
  },

  voteComment: async (commentId: string, direction: 'up' | 'down'): Promise<void> => {
    await request(`/api/comments/${commentId}/vote`, { method: 'POST', body: { direction } });
  },

  // ─── Interviews ────────────────────────────────────────────────────────
  getInterviews: async (company?: string, difficulty?: string, page = 1, stack?: string): Promise<Interview[]> => {
    const rows = await request<InterviewResponse[]>('/api/interviews', {
      params: { company, difficulty, stack, page, pageSize: 20 },
    });
    return (rows ?? []).map(mapInterview);
  },

  getInterview: async (id: string): Promise<Interview> => {
    const r = await request<InterviewResponse>(`/api/interviews/${id}`);
    return mapInterview(r);
  },

  likeQuestion: async (questionId: string): Promise<void> => {
    await request(`/api/interviews/questions/${questionId}/likes`, { method: 'POST' });
  },

  unlikeQuestion: async (questionId: string): Promise<void> => {
    await request(`/api/interviews/questions/${questionId}/likes`, { method: 'DELETE' });
  },

  getInterviewComments: async (interviewId: string): Promise<InterviewComment[]> => {
    const r = await request<{ items: InterviewComment[] }>(`/api/interviews/${interviewId}/comments`);
    return r?.items ?? [];
  },

  addInterviewComment: async (interviewId: string, body: string): Promise<void> => {
    await request(`/api/interviews/${interviewId}/comments`, { method: 'POST', body: { body } });
  },

  deleteInterviewComment: async (interviewId: string, commentId: string): Promise<void> => {
    await request(`/api/interviews/${interviewId}/comments/${commentId}`, { method: 'DELETE' });
  },

  getQuestionComments: async (questionId: string): Promise<QuestionComment[]> => {
    const r = await request<{ items: QuestionComment[] }>(`/api/interviews/questions/${questionId}/comments`);
    return r?.items ?? [];
  },

  addQuestionComment: async (questionId: string, body: string): Promise<void> => {
    await request(`/api/interviews/questions/${questionId}/comments`, { method: 'POST', body: { body } });
  },

  // ─── Search ────────────────────────────────────────────────────────────
  search: async (query: string, type: string): Promise<Post[]> => {
    const rows = await request<SearchResponse[]>('/api/search', {
      params: { q: query, type },
    });
    return (rows ?? []).map(mapPost);
  },

  searchPeople: async (query: string): Promise<PersonResult[]> => {
    const rows = await request<UserSearchResponse[]>('/api/search', {
      params: { q: query, type: 'people' },
    });
    return (rows ?? []).map(r => ({
      id: r.id, username: r.username, displayName: r.displayName, initials: r.initials,
      role: r.role, company: r.company, followers: r.followers ?? 0,
      avatarVariant: (r.avatarVariant as import('../types/models').AvatarVariant) ?? 'cyan',
      isFollowing: r.isFollowing ?? false,
    }));
  },

  searchAsk: async (question: string): Promise<AskResult> => {
    return request('/api/search/ask', { method: 'POST', body: { question } });
  },

  // Profile
  getMe: async (): Promise<import('../types/models').User> => {
    const r = await request<UserResponse>('/api/users/me');
    return mapUser(r);
  },

  getProfile: async (username: string): Promise<import('../types/models').User> => {
    const r = await request<UserResponse>(`/api/users/username/${username}`);
    return mapUser(r);
  },

  updateProfile: async (data: {
    displayName?: string; bio?: string; company?: string; roleTitle?: string; techStack?: string[];
  }): Promise<import('../types/models').User> => {
    const r = await request<UserResponse>('/api/users/me/profile', { method: 'PUT', body: data });
    return mapUser(r);
  },

  followUser: async (userId: string): Promise<void> => {
    await request(`/api/users/${userId}/follow`, { method: 'POST' });
  },

  unfollowUser: async (userId: string): Promise<void> => {
    await request(`/api/users/${userId}/follow`, { method: 'DELETE' });
  },

  getMyBytes: async (page = 1): Promise<Post[]> => {
    const rows = await request<PostResponse[]>('/api/me/bytes', { params: { page, pageSize: 20 } });
    return (rows ?? []).map(mapPost);
  },

  getMyBookmarks: async (): Promise<Post[]> => {
    const rows = await request<PostResponse[]>('/api/me/bookmarks');
    return (rows ?? []).map(mapPost);
  },

  deletePost: async (postId: string): Promise<void> => {
    await request(`/api/bytes/${postId}`, { method: 'DELETE' });
  },

  updatePost: async (postId: string, data: { title?: string; body?: string; codeSnippet?: string; language?: string }): Promise<Post> => {
    const r = await request<PostResponse>(`/api/bytes/${postId}`, { method: 'PUT', body: data });
    return mapPost(r);
  },

  getMyInterviews: async (page = 1): Promise<Interview[]> => {
    const rows = await request<InterviewResponse[]>('/api/me/interviews', { params: { page, pageSize: 20 } });
    return (rows ?? []).map(mapInterview);
  },

  deleteMyInterview: async (interviewId: string): Promise<void> => {
    await request(`/api/interviews/${interviewId}`, { method: 'DELETE' });
  },

  getMyInterviewBookmarks: async (): Promise<Interview[]> => {
    const rows = await request<InterviewResponse[]>('/api/me/interview-bookmarks');
    return (rows ?? []).map(mapInterview);
  },

  getReachEstimate: async (content: string, tags: string[]): Promise<number> => {
    try {
      const r = await request<{ reach: number }>('/api/bytes/reach-estimate', { method: 'POST', body: { content, tags } });
      return r?.reach ?? 1200;
    } catch {
      return Math.floor(Math.random() * 5000) + 500;
    }
  },

  saveOnboardingData: async (data: {
    seniority?: string; domain?: string; techStack?: string[];
    bio?: string; company?: string; roleTitle?: string;
  }): Promise<void> => {
    await request('/api/users/me/profile', { method: 'PUT', body: data });
  },

  // ─── AI ────────────────────────────────────────────────────────────────

  askAboutByte: async (byteId: string, question: string): Promise<AskByteResult> => {
    return request(`/api/bytes/${byteId}/ask`, { method: 'POST', body: { question } });
  },

  formatCode: async (code: string, language: string): Promise<string> => {
    const r = await request<{ formatted: string }>('/api/ai/format-code', { method: 'POST', body: { code, language } });
    return r?.formatted ?? code;
  },

  // ─── Profile socials ───────────────────────────────────────────────────

  getMySocials: async (): Promise<SocialLink[]> => {
    try {
      return await request<SocialLink[]>('/api/users/me/socials');
    } catch {
      return [];
    }
  },

  updateMySocials: async (socials: SocialLink[]): Promise<void> => {
    await request('/api/users/me/socials', { method: 'PUT', body: { socials } });
  },

  // ─── Compose ───────────────────────────────────────────────────────────
  createPost: async (data: {
    title: string; body: string; codeSnippet?: { language: string; content: string }; tags: string[];
  }): Promise<{ id: string }> => {
    return request('/api/bytes', { method: 'POST', body: data });
  },

  createInterview: async (data: {
    title: string; company?: string; role?: string; difficulty: string;
    questions: { question: string; answer: string; orderIndex: number }[];
  }): Promise<{ id: string }> => {
    return request('/api/interviews', { method: 'POST', body: data });
  },

  // Notifications
  getNotifications: async (page = 1, unreadOnly = false): Promise<AppNotification[]> => {
    return request('/api/notifications', { params: { page, unreadOnly } });
  },

  getUnreadCount: async (): Promise<number> => {
    const r = await request<{ count: number }>('/api/notifications/unread-count');
    return r?.count ?? 0;
  },

  markRead: async (id: string): Promise<void> => {
    await request(`/api/notifications/${id}/read`, { method: 'PUT' });
  },

  markAllRead: async (): Promise<void> => {
    await request('/api/notifications/read-all', { method: 'PUT' });
  },

  // Lookups
  getTechStacks: async (domainId?: string): Promise<TechStack[]> => {
    return request('/api/lookup/tech-stacks', { params: { domainId } });
  },

  getSeniorityTypes: async (): Promise<SeniorityType[]> => {
    return request('/api/lookup/seniority-types');
  },

  getDomains: async (): Promise<import('../types/models').Domain[]> => {
    return request('/api/lookup/domains');
  },
};
