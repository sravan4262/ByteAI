export * from './supabase-auth'

// framer-motion mock — apply in any test rendering UserMiniProfile or motion components.
// Without this, jsdom crashes on spring animations.
//
//   vi.mock('framer-motion', () => ({
//     motion: {
//       div: ({ children, ...p }: React.HTMLAttributes<HTMLDivElement>) => <div {...p}>{children}</div>,
//     },
//     AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
//   }))

// sonner mock — use in tests that assert toast calls:
//
//   const mockToastSuccess = vi.hoisted(() => vi.fn())
//   const mockToastError   = vi.hoisted(() => vi.fn())
//   vi.mock('sonner', () => ({ toast: { success: mockToastSuccess, error: mockToastError } }))
