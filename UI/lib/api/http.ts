const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5239'

function getDevToken(): string | null {
  if (process.env.NODE_ENV === 'development') {
    return null;
  }
  if (typeof window === 'undefined') {
    try {
      const { cookies } = require('next/headers')
      return cookies().get('byteai_auth_token')?.value ?? null
    } catch {
      return null
    }
  }
  try {
    const raw = localStorage.getItem('byteai_auth_token')
    return raw ?? null
  } catch {
    return null
  }
}

export async function apiFetch<T>(
  path: string,
  options?: RequestInit & { token?: string }
): Promise<T> {
  const token = options?.token ?? getDevToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
  const { token: _token, ...fetchOptions } = options ?? {}
  const res = await fetch(`${BASE_URL}${path}`, { ...fetchOptions, headers })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`API ${res.status} ${path}: ${text}`)
  }
  if (res.status === 204) return undefined as T
  return res.json()
}

export function setAuthToken(token: string) {
  if (typeof window === 'undefined') return
  localStorage.setItem('byteai_auth_token', token)
}

export function clearAuthToken() {
  if (typeof window === 'undefined') return
  localStorage.removeItem('byteai_auth_token')
}
