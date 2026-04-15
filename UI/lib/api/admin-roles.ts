import { apiFetch } from './http'

export interface RoleType {
  id: string
  name: string
  label: string
  description?: string | null
}

interface ApiResponse<T> {
  data: T
}

export async function getAllRoles(): Promise<RoleType[]> {
  try {
    const res = await apiFetch<ApiResponse<RoleType[]>>('/api/admin/roles')
    return res.data
  } catch {
    return []
  }
}

export async function createRole(data: {
  name: string
  label: string
  description?: string
}): Promise<RoleType | null> {
  try {
    const res = await apiFetch<ApiResponse<RoleType>>('/api/admin/roles', {
      method: 'POST',
      body: JSON.stringify(data),
    })
    return res.data
  } catch {
    return null
  }
}

export async function getUserRoles(userId: string): Promise<RoleType[]> {
  try {
    const res = await apiFetch<ApiResponse<RoleType[]>>(`/api/admin/users/${userId}/roles`)
    return res.data
  } catch {
    return []
  }
}

export async function assignRoleToUser(userId: string, roleId: string): Promise<boolean> {
  try {
    await apiFetch(`/api/admin/users/${userId}/roles/${roleId}`, { method: 'POST' })
    return true
  } catch {
    return false
  }
}

export async function revokeRoleFromUser(userId: string, roleId: string): Promise<boolean> {
  try {
    await apiFetch(`/api/admin/users/${userId}/roles/${roleId}`, { method: 'DELETE' })
    return true
  } catch {
    return false
  }
}
