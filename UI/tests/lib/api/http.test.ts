import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { ApiError, apiFetch, setTokenProvider } from '@/lib/api/http'

function mockFetch(status: number, body: unknown, ok = status >= 200 && status < 300) {
  const bodyText = typeof body === 'string' ? body : JSON.stringify(body)
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    ok,
    status,
    text: () => Promise.resolve(bodyText),
    json: () => Promise.resolve(body),
  }))
}

beforeEach(() => {
  // Wire a token provider so Authorization header is always set
  setTokenProvider(() => Promise.resolve('test-token'))
})

afterEach(() => {
  vi.unstubAllGlobals()
  // Reset token provider
  setTokenProvider(() => Promise.resolve(null))
})

describe('ApiError', () => {
  it('extends Error and sets name to ApiError', () => {
    const err = new ApiError(404, 'NOT_FOUND', 'Resource not found')
    expect(err).toBeInstanceOf(Error)
    expect(err).toBeInstanceOf(ApiError)
    expect(err.name).toBe('ApiError')
  })
  it('sets status, errorCode, reason correctly', () => {
    const err = new ApiError(500, 'SERVER_ERROR', 'Something went wrong')
    expect(err.status).toBe(500)
    expect(err.errorCode).toBe('SERVER_ERROR')
    expect(err.reason).toBe('Something went wrong')
  })
  it('message is formatted as "errorCode: reason"', () => {
    const err = new ApiError(400, 'INVALID', 'Bad input')
    expect(err.message).toBe('INVALID: Bad input')
  })
})

describe('apiFetch', () => {
  it('calls fetch with the correct URL and Authorization header', async () => {
    mockFetch(200, { data: 'ok' })
    await apiFetch('/api/test')
    const fetchMock = vi.mocked(fetch)
    expect(fetchMock).toHaveBeenCalledOnce()
    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit & { headers: Record<string, string> }]
    expect(url).toMatch(/\/api\/test$/)
    expect(options.headers['Authorization']).toBe('Bearer test-token')
    expect(options.headers['Content-Type']).toBe('application/json')
  })

  it('returns parsed JSON on 200', async () => {
    mockFetch(200, { name: 'ByteAI' })
    const result = await apiFetch<{ name: string }>('/api/test')
    expect(result.name).toBe('ByteAI')
  })

  it('returns undefined on 204 No Content', async () => {
    mockFetch(204, '', true)
    const result = await apiFetch('/api/test')
    expect(result).toBeUndefined()
  })

  it('throws ApiError with AI_QUOTA_EXHAUSTED on 503', async () => {
    mockFetch(503, 'overloaded', false)
    await expect(apiFetch('/api/test')).rejects.toMatchObject({
      status: 503,
      errorCode: 'AI_QUOTA_EXHAUSTED',
    })
  })

  it('throws ApiError with JSON body fields on structured error response', async () => {
    mockFetch(404, { error: 'NOT_FOUND', reason: 'Byte missing' }, false)
    await expect(apiFetch('/api/test')).rejects.toMatchObject({
      status: 404,
      errorCode: 'NOT_FOUND',
      reason: 'Byte missing',
    })
  })

  it('throws ApiError with raw text when response is not JSON', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: () => Promise.resolve('Internal Server Error'),
      json: () => Promise.reject(new Error('not json')),
    }))
    await expect(apiFetch('/api/test')).rejects.toMatchObject({
      status: 500,
      errorCode: 'API_ERROR',
      reason: 'Internal Server Error',
    })
  })

  it('does not set Authorization header when no token provider returns null', async () => {
    setTokenProvider(() => Promise.resolve(null))
    mockFetch(200, { ok: true })
    await apiFetch('/api/test')
    const fetchMock = vi.mocked(fetch)
    const [, options] = fetchMock.mock.calls[0] as [string, RequestInit & { headers: Record<string, string> }]
    expect(options.headers['Authorization']).toBeUndefined()
  })
})
