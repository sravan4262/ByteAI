// Preset Clerk auth state shapes — spread these inside vi.hoisted in test files.
// Cannot import from here inside a vi.mock factory directly (hoisting trap).
//
// Usage pattern in each test file that needs Clerk:
//
//   const mockSignOut = vi.hoisted(() => vi.fn().mockResolvedValue(undefined))
//   const mockUseAuth = vi.hoisted(() => vi.fn())
//   const mockUseUser = vi.hoisted(() => vi.fn())
//
//   vi.mock('@clerk/nextjs', () => ({
//     useAuth:  mockUseAuth,
//     useUser:  mockUseUser,
//     useClerk: vi.fn().mockReturnValue({ client: { activeSessions: [] }, setActive: vi.fn() }),
//     ClerkProvider: ({ children }: { children: React.ReactNode }) => children,
//   }))
//
//   beforeEach(() => {
//     mockUseAuth.mockReturnValue({ ...CLERK_SIGNED_OUT, signOut: mockSignOut, getToken: vi.fn() })
//     mockUseUser.mockReturnValue({ user: null, isLoaded: true })
//   })

export const CLERK_NOT_LOADED = { isLoaded: false, isSignedIn: false }
export const CLERK_SIGNED_OUT = { isLoaded: true,  isSignedIn: false }
export const CLERK_SIGNED_IN  = { isLoaded: true,  isSignedIn: true  }
