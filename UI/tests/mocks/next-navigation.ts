// Copy this block into any test file that renders a component importing next/navigation.
// Declare the hoisted refs BEFORE the vi.mock call.
//
//   const mockPush    = vi.hoisted(() => vi.fn())
//   const mockReplace = vi.hoisted(() => vi.fn())
//
//   vi.mock('next/navigation', () => ({
//     useRouter:       () => ({ push: mockPush, replace: mockReplace, back: vi.fn() }),
//     useSearchParams: () => new URLSearchParams(),
//     usePathname:     () => '/',
//   }))
