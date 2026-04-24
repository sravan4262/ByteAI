import { apiFetch } from './http'

export interface ConversationDto {
  id: string
  otherUserId: string
  otherUsername: string
  otherDisplayName: string
  otherAvatarUrl: string | null
  lastMessage: string | null
  lastMessageAt: string
  hasUnread: boolean
}

export interface MessageDto {
  id: string
  senderId: string
  content: string
  sentAt: string
  readAt: string | null
}

export async function getConversations(): Promise<ConversationDto[]> {
  const res = await apiFetch<{ data: ConversationDto[] }>('/api/conversations')
  return res.data ?? []
}

export async function getMessages(conversationId: string, cursor?: string, limit = 50): Promise<MessageDto[]> {
  const params = new URLSearchParams({ limit: String(limit) })
  if (cursor) params.set('cursor', cursor)
  const res = await apiFetch<{ data: MessageDto[] }>(`/api/conversations/${conversationId}/messages?${params}`)
  return res.data ?? []
}

export async function getOrCreateConversation(recipientId: string): Promise<string> {
  const res = await apiFetch<{ data: { conversationId: string } }>('/api/conversations', {
    method: 'POST',
    body: JSON.stringify({ recipientId }),
  })
  return res.data.conversationId
}

export interface MutualFollowDto {
  id: string
  username: string
  displayName: string
  avatarUrl: string | null
}

export async function getMutualFollows(search?: string): Promise<MutualFollowDto[]> {
  const params = search ? `?search=${encodeURIComponent(search)}` : ''
  const res = await apiFetch<{ data: MutualFollowDto[] }>(`/api/conversations/messageable${params}`)
  return res.data ?? []
}
