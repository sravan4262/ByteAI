// Preset Supabase auth state shapes — spread these when mocking @/hooks/use-auth.
//
// Usage pattern in each test file that needs auth state:
//
//   const mockUseAuth = vi.hoisted(() => vi.fn())
//   vi.mock('@/hooks/use-auth', () => ({ useAuth: mockUseAuth }))
//
//   beforeEach(() => {
//     mockUseAuth.mockReturnValue({ ...SUPABASE_SIGNED_OUT, logout: vi.fn(), getToken: vi.fn() })
//   })

export const SUPABASE_NOT_LOADED  = { auth: { isLoaded: false, isAuthenticated: false }, user: null }
export const SUPABASE_SIGNED_OUT  = { auth: { isLoaded: true,  isAuthenticated: false }, user: null }
export const SUPABASE_SIGNED_IN   = { auth: { isLoaded: true,  isAuthenticated: true  }, user: { id: 'test-user-id', email: 'test@example.com', user_metadata: { avatar_url: null } } }
