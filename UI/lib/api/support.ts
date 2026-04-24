import { apiFetch } from './http'

export interface FeedbackResponse {
  id: string
  type: 'good' | 'bad' | 'idea'
  message: string
  pageContext?: string | null
  status: 'open' | 'reviewed' | 'closed'
  adminNote?: string | null
  createdAt: string
}

export interface AdminFeedbackResponse extends FeedbackResponse {
  username?: string | null
  userId?: string | null
  updatedAt: string
}

interface ApiResponse<T> {
  data: T
}

interface PagedData<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
}

export async function submitFeedback(data: {
  type: string
  message: string
  pageContext?: string
}): Promise<FeedbackResponse | null> {
  try {
    const res = await apiFetch<ApiResponse<FeedbackResponse>>('/api/support/feedback', {
      method: 'POST',
      body: JSON.stringify(data),
    })
    return res.data
  } catch {
    return null
  }
}

export async function getMyFeedbackHistory(): Promise<FeedbackResponse[]> {
  try {
    const res = await apiFetch<ApiResponse<FeedbackResponse[]>>('/api/support/feedback/history')
    return res.data
  } catch {
    return []
  }
}

export async function getAllFeedback(params: {
  type?: string
  status?: string
  page?: number
  pageSize?: number
}): Promise<PagedData<AdminFeedbackResponse>> {
  const query = new URLSearchParams()
  if (params.type)     query.set('type', params.type)
  if (params.status)   query.set('status', params.status)
  if (params.page)     query.set('page', String(params.page))
  if (params.pageSize) query.set('pageSize', String(params.pageSize))

  try {
    const res = await apiFetch<ApiResponse<PagedData<AdminFeedbackResponse>>>(
      `/api/admin/feedback?${query.toString()}`
    )
    return res.data
  } catch {
    return { items: [], total: 0, page: 1, pageSize: 20 }
  }
}

export async function updateFeedbackStatus(
  feedbackId: string,
  status: string,
  adminNote?: string
): Promise<AdminFeedbackResponse | null> {
  try {
    const res = await apiFetch<ApiResponse<AdminFeedbackResponse>>(
      `/api/admin/feedback/${feedbackId}`,
      {
        method: 'PUT',
        body: JSON.stringify({ status, adminNote }),
      }
    )
    return res.data
  } catch {
    return null
  }
}
