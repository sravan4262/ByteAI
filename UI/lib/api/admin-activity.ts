import { apiFetch } from './http'

export interface ActivityUser {
  userId:      string
  displayName: string
  username:    string
  avatarUrl:   string | null
  email:       string
  activityAt:  string
}

export interface ActivityPagedResult {
  items:      ActivityUser[]
  totalCount: number
  page:       number
  pageSize:   number
}

export interface UserActivityResponse {
  loggedInToday:     ActivityPagedResult
  currentlyLoggedIn: ActivityPagedResult
}

export async function getUserActivity(page = 1, pageSize = 20): Promise<UserActivityResponse> {
  const res = await apiFetch<{ data: UserActivityResponse }>(
    `/api/admin/users/activity?page=${page}&pageSize=${pageSize}`
  )
  return res.data
}
