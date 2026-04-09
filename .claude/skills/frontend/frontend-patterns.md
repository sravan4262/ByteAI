---
name: frontend-patterns
description: ByteAI frontend patterns — Next.js 16, React 19, Tailwind v4, shadcn/ui. Project structure, auth, API layer, forms, coding standards, and general React/Next.js patterns.
origin: ByteAI (extended from ECC)
---

# Frontend Development Patterns

Next.js 16 · React 19 · TypeScript · Tailwind v4 · shadcn/ui · Lucide React · Sonner

---

## ByteAI Project Structure

```
UI/
├── app/
│   ├── (auth)/          ← unauthenticated routes (no sidebar, no AuthGuard)
│   ├── (app)/           ← authenticated routes (AppShell + AuthGuard in layout.tsx)
│   ├── globals.css
│   └── layout.tsx       ← root layout: ThemeProvider, Toaster
├── components/
│   ├── features/        ← one subfolder per domain, owns its screen + subcomponents
│   ├── layout/          ← structural primitives shared across routes
│   └── ui/              ← shadcn/ui primitives + reusable custom components
├── hooks/               ← custom hooks (state/browser APIs only — no business logic)
├── lib/                 ← api.ts, schemas.ts, mock-data.ts, utils.ts
└── proxy.ts             ← Next.js 16 middleware (cookie-based auth guard)
```

### Route Groups

```
app/(auth)/              ← no AppShell, no AuthGuard
  page.tsx               ← / → AuthScreen
  onboarding/page.tsx
  layout.tsx

app/(app)/               ← AppShell + AuthGuard
  layout.tsx             ← mounts <AppShell><AuthGuard>{children}</AuthGuard></AppShell>
  feed/page.tsx + loading.tsx
  search/page.tsx + loading.tsx
  profile/page.tsx + loading.tsx
  interviews/page.tsx + loading.tsx
  compose/page.tsx
  post/[id]/page.tsx          ← use `await params` — Next.js 16 async params
  post/[id]/comments/page.tsx
```

**Rule:** Never import from `(auth)` into `(app)` or vice versa. Route groups are isolation boundaries.

### Component Layers

**`components/features/`** — Domain screens. Each feature folder owns its screen + all subcomponents for that domain. Nothing in `features/` is reused cross-domain.

```
features/feed/
  feed-screen.tsx     ← top-level screen, holds state, wires subcomponents
  feed-header.tsx
  feed-filters.tsx    ← FOR_YOU / FOLLOWING tabs + SearchableDropdown
  post-card.tsx       ← like/bookmark/share callbacks from parent
  following-list.tsx

features/auth/
  auth-screen.tsx
  login-form.tsx      ← Zod + react-hook-form
  signup-form.tsx
  google-icon.tsx     ← SVG, auth-specific only
```

**`components/layout/`** — Structural primitives shared across all authenticated routes. Never hold domain data.

```
app-shell.tsx         ← sidebar nav + bottom nav, uses usePathname()
auth-guard.tsx        ← client-side auth check, redirects to / if unauthenticated
avatar.tsx
byteai-logo.tsx       ← animated shimmer logo, sizes: sm | md | lg
phone-frame.tsx
```

**`components/ui/`** — shadcn/ui primitives (do not modify) + project-wide custom components.

Custom additions:
- `searchable-dropdown.tsx` — reusable searchable select, `colorVariant: 'accent' | 'cyan' | 'green' | 'purple'`

---

## Auth Pattern

### `proxy.ts` (Next.js 16 Middleware)

Named export `proxy` (not `middleware`) per Next.js 16 API. Checks `byteai_auth` cookie → redirects to `/` if missing.

### `hooks/use-auth.ts`

```typescript
const { user, isAuthenticated, login, logout } = useAuth()
// login()  → sets byteai_auth cookie + localStorage byteai_auth_state
// logout() → clears both, redirects to /
```

Persists to both `localStorage` and cookies. Syncs on mount to prevent stale cookie bypass after clearing storage.

### AuthGuard

```typescript
// (app)/layout.tsx
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell>
      <AuthGuard>{children}</AuthGuard>
    </AppShell>
  )
}
```

---

## API Layer (`lib/api.ts`)

All HTTP calls go through `lib/api.ts`. Components never call `fetch` directly. Functions are typed, return domain types, and throw on error. Currently all return mock data — replace the body when wiring to real endpoints.

```typescript
export async function getBytes(params: GetBytesParams): Promise<PagedResponse<BytePost>> {
  // TODO: replace with real fetch
  return mockBytes
}

export async function createByte(payload: CreateBytePayload): Promise<BytePost> {
  const res = await fetch('/api/bytes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}
```

---

## ByteAI Form Pattern (Zod + react-hook-form)

Schemas live in `lib/schemas.ts`:

```typescript
export const loginEmailSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Min 8 characters'),
})
export type LoginEmailForm = z.infer<typeof loginEmailSchema>
```

Forms use `zodResolver`. Display field-level errors inline — no `alert()`:

```typescript
const form = useForm<LoginEmailForm>({ resolver: zodResolver(loginEmailSchema) })

const onSubmit = async (data: LoginEmailForm) => {
  try {
    await login(data)
    toast.success('Welcome back')
    router.push('/feed')
  } catch {
    toast.error('Invalid credentials')
  }
}
```

---

## Toast Feedback (Sonner)

All user-triggered actions show a toast. Required on: like, bookmark, share, post, draft save, login, logout, ESC clear.

```typescript
import { toast } from 'sonner'

toast.success('Bookmarked')
toast.error('Something went wrong')
toast('Draft saved', { description: 'You can resume from Compose.' })
```

---

## PostCard Interaction Pattern (Optimistic Updates)

State lives in the screen component. PostCard receives a post + callbacks. Mutate local state first, call API second. No loading spinner on social actions.

```typescript
const handleLike = async (postId: string) => {
  setPosts(prev => prev.map(p =>
    p.id === postId ? { ...p, likes: p.isLiked ? p.likes - 1 : p.likes + 1, isLiked: !p.isLiked } : p
  ))
  toast.success('Liked')
  await api.toggleReaction(postId).catch(() => {
    setPosts(prev => prev.map(p =>
      p.id === postId ? { ...p, likes: p.isLiked ? p.likes - 1 : p.likes + 1, isLiked: !p.isLiked } : p
    ))
    toast.error('Failed to like')
  })
}
```

---

## Navigation

All screens use `useRouter()` and `usePathname()` from `next/navigation`. No `onNavigate` prop drilling.

---

## Icons

Lucide React throughout. No emojis, no custom SVG icon components (except `GoogleIcon` which is auth-specific):

```typescript
import { Heart, MessageSquare, Bookmark, Share2, BadgeCheck } from 'lucide-react'
```

---

## Loading States

Each authenticated route has a `loading.tsx` beside its `page.tsx`. Use shadcn `Skeleton`:

```typescript
export default function FeedLoading() {
  return (
    <div className="space-y-4 p-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-32 w-full rounded-xl" />
      ))}
    </div>
  )
}
```

---

## Tailwind Conventions

- Font size floor: `text-[10px]` minimum for labels, `text-sm` for inputs
- Z-index discipline: filter bars `relative z-20` to render above post cards (backdrop-filter creates stacking context)
- Dark-first: all colors use `dark:` variants — app ships dark mode by default
- Prefer Tailwind scale over arbitrary spacing values

---

## Coding Standards

### Core Principles

| Principle | Rule |
|-----------|------|
| **Readability** | Self-documenting names > comments. Comment the *why*, never the *what*. |
| **KISS** | Simplest solution that works. No premature abstractions. |
| **DRY** | Extract repeated logic — but only when used 3+ times. |
| **YAGNI** | Don't build for hypothetical future requirements. |
| **50-line limit** | Functions over 50 lines must be split. |

### Naming

```typescript
// GOOD — descriptive, verb-noun
const feedSearchQuery = 'react'
const isUserAuthenticated = true
async function fetchFeedPosts(userId: string) {}
function isValidUsername(username: string): boolean {}

// BAD
const q = 'react'
const flag = true
async function feed(id: string) {}
```

File naming: `kebab-case` for all files (`post-card.tsx`, `use-auth.ts`, `feed-screen.tsx`).

### Immutability (Critical)

```typescript
// GOOD — always spread
const updatedPost = { ...post, likes: post.likes + 1 }
const updatedPosts = [...posts, newPost]
setPosts(prev => prev.map(p => p.id === id ? { ...p, isLiked: true } : p))

// BAD — never mutate
post.likes++
posts.push(newPost)
```

### TypeScript — No `any`

```typescript
// GOOD
interface BytePost {
  id: string
  title: string
  status: 'draft' | 'published'
  createdAt: Date
}
function getPost(id: string): Promise<BytePost> {}

// BAD
function getPost(id: any): Promise<any> {}
```

### State Updates

```typescript
// GOOD — functional update prevents stale closure
setCount(prev => prev + 1)

// BAD
setCount(count + 1)  // stale in async context
```

### Async/Await

```typescript
// GOOD — parallel when independent
const [posts, profile] = await Promise.all([fetchFeed(userId), fetchProfile(userId)])

// BAD — unnecessary sequential
const posts = await fetchFeed(userId)
const profile = await fetchProfile(userId)
```

### Conditional Rendering

```typescript
// GOOD — flat conditions
{isLoading && <Skeleton className="h-32 w-full" />}
{error && <p className="text-destructive text-sm">{error}</p>}
{data && <PostCard post={data} />}

// BAD — ternary hell
{isLoading ? <Skeleton /> : error ? <p>{error}</p> : data ? <PostCard post={data} /> : null}
```

### Early Returns Over Deep Nesting

```typescript
// GOOD
if (!user) return null
if (!user.isAuthenticated) return <Redirect to="/" />
if (!post) return <NotFound />
return <PostDetail post={post} user={user} />

// BAD
if (user) {
  if (user.isAuthenticated) {
    if (post) { return <PostDetail post={post} user={user} /> }
  }
}
```

### Named Constants

```typescript
// GOOD
const DEBOUNCE_DELAY_MS = 500
const MAX_POST_LENGTH = 300
const FEED_PAGE_SIZE = 20

// BAD
setTimeout(search, 500)
if (content.length > 300) {}
```

---

## Dev Commands (Next.js 16 + Turbopack)

```bash
# Start dev server — Turbopack by default (faster HMR, FS caching)
pnpm dev

# Production build
pnpm build

# Start production server
pnpm start

# Type check
pnpm tsc --noEmit

# Lint
pnpm lint
```

**Turbopack notes:**
- Default since Next.js 16 — `next dev` uses Turbopack automatically
- Incremental bundler in Rust — 5–14× faster cold start on large apps
- FS caching under `.next/` — restarts reuse prior work
- Fall back to webpack only if a plugin is incompatible: `next dev --no-turbopack`
- Bundle analysis (Next.js 16.1+): check Next.js docs for `@next/bundle-analyzer` config

---

## When to Activate

- Building React components (composition, props, rendering)
- Managing state (useState, useReducer, Zustand, Context)
- Implementing data fetching (SWR, React Query, server components)
- Optimizing performance (memoization, virtualization, code splitting)
- Working with forms (validation, controlled inputs, Zod schemas)
- Handling client-side routing and navigation
- Building accessible, responsive UI patterns

## Component Patterns

### Composition Over Inheritance

```typescript
// PASS: GOOD: Component composition
interface CardProps {
  children: React.ReactNode
  variant?: 'default' | 'outlined'
}

export function Card({ children, variant = 'default' }: CardProps) {
  return <div className={`card card-${variant}`}>{children}</div>
}

export function CardHeader({ children }: { children: React.ReactNode }) {
  return <div className="card-header">{children}</div>
}

export function CardBody({ children }: { children: React.ReactNode }) {
  return <div className="card-body">{children}</div>
}

// Usage
<Card>
  <CardHeader>Title</CardHeader>
  <CardBody>Content</CardBody>
</Card>
```

### Compound Components

```typescript
interface TabsContextValue {
  activeTab: string
  setActiveTab: (tab: string) => void
}

const TabsContext = createContext<TabsContextValue | undefined>(undefined)

export function Tabs({ children, defaultTab }: {
  children: React.ReactNode
  defaultTab: string
}) {
  const [activeTab, setActiveTab] = useState(defaultTab)

  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab }}>
      {children}
    </TabsContext.Provider>
  )
}

export function TabList({ children }: { children: React.ReactNode }) {
  return <div className="tab-list">{children}</div>
}

export function Tab({ id, children }: { id: string, children: React.ReactNode }) {
  const context = useContext(TabsContext)
  if (!context) throw new Error('Tab must be used within Tabs')

  return (
    <button
      className={context.activeTab === id ? 'active' : ''}
      onClick={() => context.setActiveTab(id)}
    >
      {children}
    </button>
  )
}

// Usage
<Tabs defaultTab="overview">
  <TabList>
    <Tab id="overview">Overview</Tab>
    <Tab id="details">Details</Tab>
  </TabList>
</Tabs>
```

### Render Props Pattern

```typescript
interface DataLoaderProps<T> {
  url: string
  children: (data: T | null, loading: boolean, error: Error | null) => React.ReactNode
}

export function DataLoader<T>({ url, children }: DataLoaderProps<T>) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    fetch(url)
      .then(res => res.json())
      .then(setData)
      .catch(setError)
      .finally(() => setLoading(false))
  }, [url])

  return <>{children(data, loading, error)}</>
}

// Usage
<DataLoader<Market[]> url="/api/markets">
  {(markets, loading, error) => {
    if (loading) return <Spinner />
    if (error) return <Error error={error} />
    return <MarketList markets={markets!} />
  }}
</DataLoader>
```

## Custom Hooks Patterns

### State Management Hook

```typescript
export function useToggle(initialValue = false): [boolean, () => void] {
  const [value, setValue] = useState(initialValue)

  const toggle = useCallback(() => {
    setValue(v => !v)
  }, [])

  return [value, toggle]
}

// Usage
const [isOpen, toggleOpen] = useToggle()
```

### Async Data Fetching Hook

```typescript
interface UseQueryOptions<T> {
  onSuccess?: (data: T) => void
  onError?: (error: Error) => void
  enabled?: boolean
}

export function useQuery<T>(
  key: string,
  fetcher: () => Promise<T>,
  options?: UseQueryOptions<T>
) {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<Error | null>(null)
  const [loading, setLoading] = useState(false)

  const refetch = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const result = await fetcher()
      setData(result)
      options?.onSuccess?.(result)
    } catch (err) {
      const error = err as Error
      setError(error)
      options?.onError?.(error)
    } finally {
      setLoading(false)
    }
  }, [fetcher, options])

  useEffect(() => {
    if (options?.enabled !== false) {
      refetch()
    }
  }, [key, refetch, options?.enabled])

  return { data, error, loading, refetch }
}

// Usage
const { data: markets, loading, error, refetch } = useQuery(
  'markets',
  () => fetch('/api/markets').then(r => r.json()),
  {
    onSuccess: data => console.log('Fetched', data.length, 'markets'),
    onError: err => console.error('Failed:', err)
  }
)
```

### Debounce Hook

```typescript
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => clearTimeout(handler)
  }, [value, delay])

  return debouncedValue
}

// Usage
const [searchQuery, setSearchQuery] = useState('')
const debouncedQuery = useDebounce(searchQuery, 500)

useEffect(() => {
  if (debouncedQuery) {
    performSearch(debouncedQuery)
  }
}, [debouncedQuery])
```

## State Management Patterns

### Context + Reducer Pattern

```typescript
interface State {
  markets: Market[]
  selectedMarket: Market | null
  loading: boolean
}

type Action =
  | { type: 'SET_MARKETS'; payload: Market[] }
  | { type: 'SELECT_MARKET'; payload: Market }
  | { type: 'SET_LOADING'; payload: boolean }

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'SET_MARKETS':
      return { ...state, markets: action.payload }
    case 'SELECT_MARKET':
      return { ...state, selectedMarket: action.payload }
    case 'SET_LOADING':
      return { ...state, loading: action.payload }
    default:
      return state
  }
}

const MarketContext = createContext<{
  state: State
  dispatch: Dispatch<Action>
} | undefined>(undefined)

export function MarketProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, {
    markets: [],
    selectedMarket: null,
    loading: false
  })

  return (
    <MarketContext.Provider value={{ state, dispatch }}>
      {children}
    </MarketContext.Provider>
  )
}

export function useMarkets() {
  const context = useContext(MarketContext)
  if (!context) throw new Error('useMarkets must be used within MarketProvider')
  return context
}
```

## Performance Optimization

### Memoization

```typescript
// PASS: useMemo for expensive computations
const sortedMarkets = useMemo(() => {
  return markets.sort((a, b) => b.volume - a.volume)
}, [markets])

// PASS: useCallback for functions passed to children
const handleSearch = useCallback((query: string) => {
  setSearchQuery(query)
}, [])

// PASS: React.memo for pure components
export const MarketCard = React.memo<MarketCardProps>(({ market }) => {
  return (
    <div className="market-card">
      <h3>{market.name}</h3>
      <p>{market.description}</p>
    </div>
  )
})
```

### Code Splitting & Lazy Loading

```typescript
import { lazy, Suspense } from 'react'

// PASS: Lazy load heavy components
const HeavyChart = lazy(() => import('./HeavyChart'))
const ThreeJsBackground = lazy(() => import('./ThreeJsBackground'))

export function Dashboard() {
  return (
    <div>
      <Suspense fallback={<ChartSkeleton />}>
        <HeavyChart data={data} />
      </Suspense>

      <Suspense fallback={null}>
        <ThreeJsBackground />
      </Suspense>
    </div>
  )
}
```

### Virtualization for Long Lists

```typescript
import { useVirtualizer } from '@tanstack/react-virtual'

export function VirtualMarketList({ markets }: { markets: Market[] }) {
  const parentRef = useRef<HTMLDivElement>(null)

  const virtualizer = useVirtualizer({
    count: markets.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 100,  // Estimated row height
    overscan: 5  // Extra items to render
  })

  return (
    <div ref={parentRef} style={{ height: '600px', overflow: 'auto' }}>
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          position: 'relative'
        }}
      >
        {virtualizer.getVirtualItems().map(virtualRow => (
          <div
            key={virtualRow.index}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: `${virtualRow.size}px`,
              transform: `translateY(${virtualRow.start}px)`
            }}
          >
            <MarketCard market={markets[virtualRow.index]} />
          </div>
        ))}
      </div>
    </div>
  )
}
```

## Form Handling Patterns

### Controlled Form with Validation

```typescript
interface FormData {
  name: string
  description: string
  endDate: string
}

interface FormErrors {
  name?: string
  description?: string
  endDate?: string
}

export function CreateMarketForm() {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    description: '',
    endDate: ''
  })

  const [errors, setErrors] = useState<FormErrors>({})

  const validate = (): boolean => {
    const newErrors: FormErrors = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required'
    } else if (formData.name.length > 200) {
      newErrors.name = 'Name must be under 200 characters'
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required'
    }

    if (!formData.endDate) {
      newErrors.endDate = 'End date is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validate()) return

    try {
      await createMarket(formData)
      // Success handling
    } catch (error) {
      // Error handling
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <input
        value={formData.name}
        onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
        placeholder="Market name"
      />
      {errors.name && <span className="error">{errors.name}</span>}

      {/* Other fields */}

      <button type="submit">Create Market</button>
    </form>
  )
}
```

## Error Boundary Pattern

```typescript
interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = {
    hasError: false,
    error: null
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error boundary caught:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-fallback">
          <h2>Something went wrong</h2>
          <p>{this.state.error?.message}</p>
          <button onClick={() => this.setState({ hasError: false })}>
            Try again
          </button>
        </div>
      )
    }

    return this.props.children
  }
}

// Usage
<ErrorBoundary>
  <App />
</ErrorBoundary>
```

## Animation Patterns

### Framer Motion Animations

```typescript
import { motion, AnimatePresence } from 'framer-motion'

// PASS: List animations
export function AnimatedMarketList({ markets }: { markets: Market[] }) {
  return (
    <AnimatePresence>
      {markets.map(market => (
        <motion.div
          key={market.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
        >
          <MarketCard market={market} />
        </motion.div>
      ))}
    </AnimatePresence>
  )
}

// PASS: Modal animations
export function Modal({ isOpen, onClose, children }: ModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="modal-content"
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
          >
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
```

## Accessibility Patterns

### Keyboard Navigation

```typescript
export function Dropdown({ options, onSelect }: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setActiveIndex(i => Math.min(i + 1, options.length - 1))
        break
      case 'ArrowUp':
        e.preventDefault()
        setActiveIndex(i => Math.max(i - 1, 0))
        break
      case 'Enter':
        e.preventDefault()
        onSelect(options[activeIndex])
        setIsOpen(false)
        break
      case 'Escape':
        setIsOpen(false)
        break
    }
  }

  return (
    <div
      role="combobox"
      aria-expanded={isOpen}
      aria-haspopup="listbox"
      onKeyDown={handleKeyDown}
    >
      {/* Dropdown implementation */}
    </div>
  )
}
```

### Focus Management

```typescript
export function Modal({ isOpen, onClose, children }: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (isOpen) {
      // Save currently focused element
      previousFocusRef.current = document.activeElement as HTMLElement

      // Focus modal
      modalRef.current?.focus()
    } else {
      // Restore focus when closing
      previousFocusRef.current?.focus()
    }
  }, [isOpen])

  return isOpen ? (
    <div
      ref={modalRef}
      role="dialog"
      aria-modal="true"
      tabIndex={-1}
      onKeyDown={e => e.key === 'Escape' && onClose()}
    >
      {children}
    </div>
  ) : null
}
```

**Remember**: Modern frontend patterns enable maintainable, performant user interfaces. Choose patterns that fit your project complexity.
