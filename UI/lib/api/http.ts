const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5239'

type TokenProvider = () => Promise<string | null>

let tokenProvider: TokenProvider | null = null

/** Called once from AuthGuard to wire in Supabase session token getter */
export function setTokenProvider(fn: TokenProvider) {
  tokenProvider = fn
}

/** Structured error thrown by apiFetch for non-2xx responses. */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly errorCode: string,
    public readonly reason: string,
  ) {
    super(`${errorCode}: ${reason}`)
    this.name = 'ApiError'
  }
}

export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const token = tokenProvider ? await tokenProvider() : null

  const isFormData = options?.body instanceof FormData
  const headers: Record<string, string> = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    if (res.status === 502) {
      throw new ApiError(502, 'SERVICE_UNAVAILABLE', 'Service is temporarily unavailable. Please try again.')
    }
    if (res.status === 503) {
      throw new ApiError(503, 'AI_QUOTA_EXHAUSTED', 'AI services are temporarily overloaded. Please try again in a few minutes.')
    }
    try {
      // Server uses three error shapes: ProblemDetails (middleware fallback),
      // { message } (controller-caught domain errors), and the legacy { error, reason }.
      // Probe each so the human-readable reason actually reaches the toast.
      const body = JSON.parse(text)
      const reason = body.reason ?? body.detail ?? body.message ?? text
      const code = body.error ?? body.title ?? 'API_ERROR'
      throw new ApiError(res.status, code, reason)
    } catch (e) {
      if (e instanceof ApiError) throw e
      throw new ApiError(res.status, 'API_ERROR', text || 'An unexpected error occurred.')
    }
  }

  if (res.status === 204) return undefined as T
  return res.json()
}

/**
 * NDJSON streaming POST. Reads the response line-by-line, parsing each line as JSON, and dispatches
 * to onMessage. Used by /api/ai/search-ask-stream so the RAG answer renders token-by-token instead
 * of waiting for the full Gemini round-trip.
 */
export async function apiFetchStream(
  path: string,
  body: unknown,
  onMessage: (msg: unknown) => void,
  signal?: AbortSignal,
): Promise<void> {
  const token = tokenProvider ? await tokenProvider() : null
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
    signal,
  })

  if (!res.ok) {
    if (res.status === 503) throw new ApiError(503, 'AI_QUOTA_EXHAUSTED', 'AI services are temporarily overloaded. Please try again in a few minutes.')
    const text = await res.text().catch(() => '')
    throw new ApiError(res.status, 'API_ERROR', text || 'Stream request failed.')
  }
  if (!res.body) throw new ApiError(500, 'API_ERROR', 'No response body to stream.')

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  for (;;) {
    const { value, done } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })

    let nl = buffer.indexOf('\n')
    while (nl >= 0) {
      const line = buffer.slice(0, nl).trim()
      buffer = buffer.slice(nl + 1)
      nl = buffer.indexOf('\n')
      if (!line) continue
      try { onMessage(JSON.parse(line)) }
      catch { /* skip malformed line */ }
    }
  }

  // Flush any tail line (server should always end with \n, but be defensive)
  const tail = buffer.trim()
  if (tail) {
    try { onMessage(JSON.parse(tail)) } catch { /* ignore */ }
  }
}
