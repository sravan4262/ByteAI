const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5239'

type TokenProvider = () => Promise<string | null>

let tokenProvider: TokenProvider | null = null

/** Called once from AuthGuard to wire in Clerk's getToken() */
export function setTokenProvider(fn: TokenProvider) {
  tokenProvider = fn
}

export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const token = tokenProvider ? await tokenProvider() : null

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`API ${res.status} ${path}: ${text}`)
  }

  if (res.status === 204) return undefined as T
  return res.json()
}
