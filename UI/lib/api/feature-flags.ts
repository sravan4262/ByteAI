import { apiFetch } from './http'

export interface FeatureFlag {
  id: string
  key: string
  name: string
  description?: string
  globalOpen: boolean
  createdAt: string
  updatedAt: string
}

// ── Public Endpoint ─────────────────────────────────────────────────────────

export async function getEnabledFeatureFlags(): Promise<Record<string, boolean>> {
  try {
    const res = await apiFetch<{ data: Record<string, boolean> }>('/api/feature-flags')
    return res.data || {}
  } catch {
    return {}
  }
}

// ── Admin Endpoints ─────────────────────────────────────────────────────────

export async function getAllFeatureFlags(): Promise<FeatureFlag[]> {
  try {
    const res = await apiFetch<{ data: FeatureFlag[] }>('/api/admin/feature-flags')
    return res.data || []
  } catch {
    return []
  }
}

export async function upsertFeatureFlag(data: { key: string; name: string; description?: string; globalOpen: boolean }): Promise<FeatureFlag | null> {
  try {
    const res = await apiFetch<{ data: FeatureFlag }>('/api/admin/feature-flags', {
      method: 'POST',
      body: JSON.stringify(data),
    })
    return res.data
  } catch {
    return null
  }
}

export async function toggleFeatureFlag(key: string, globalOpen: boolean): Promise<FeatureFlag | null> {
  try {
    const res = await apiFetch<{ data: FeatureFlag }>(`/api/admin/feature-flags/${encodeURIComponent(key)}`, {
      method: 'PUT',
      body: JSON.stringify({ globalOpen }),
    })
    return res.data
  } catch {
    return null
  }
}

export async function deleteFeatureFlag(key: string): Promise<boolean> {
  try {
    await apiFetch(`/api/admin/feature-flags/${encodeURIComponent(key)}`, {
      method: 'DELETE',
    })
    return true
  } catch {
    return false
  }
}
