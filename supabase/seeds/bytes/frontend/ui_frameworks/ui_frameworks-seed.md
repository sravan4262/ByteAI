# UI Frameworks — Seed Reference

## Seed Config
subdomain: ui_frameworks
domain: frontend
tech_stacks: [react, vue, angular, svelte, solidjs, qwik]
byte_type_default: article

## Topics to Seed

1. Architecture & Structure — feature-based folder structure, colocation, barrel exports
2. Component Design — single responsibility, 150-line rule, presentation vs logic separation
3. State Management — local vs lifted vs context vs external store, when to use each
4. Performance — memoization (useMemo/useCallback/computed), when it helps vs hurts
5. Data Fetching — server state vs client state, TanStack Query patterns
6. Forms — controlled vs uncontrolled, React Hook Form + Zod pattern
7. TypeScript — prop typing, discriminated unions for variants, no any
8. Error Handling — error boundaries per route, handle loading/error/empty states
9. Testing — test behaviour not implementation, Testing Library philosophy
10. Security — dangerouslySetInnerHTML, token storage, input sanitization
11. Code Quality — ESLint react-hooks plugin, naming conventions, 50-line rule
12. Accessibility — semantic HTML first, focus management, ARIA only when HTML falls short
13. Internationalization — never hardcode strings, react-i18next, Intl API for dates/numbers
14. Web Vitals — LCP, CLS, INP and how component patterns affect each
15. Memory Leaks — cleanup in useEffect/onUnmounted/onDestroy, AbortController, removeEventListener
16. Real-time & WebSockets — singleton connection, reconnection logic, optimistic UI on send
17. Environment & Config — never hardcode URLs or keys, validate env vars at startup with Zod
18. API Layer — single HTTP client instance, interceptors for auth/retry, never raw fetch in components
19. Animation — CSS for simple states, Framer Motion for complex, prefers-reduced-motion
20. Global UI Patterns — toast system at app root, modal management, confirmation dialogs as hooks
21. Bundle & Asset Optimization — tree-shaking, lazy-load heavy components, analyze bundle
22. Dev Tooling & Quality Gates — Prettier, Husky + lint-staged, tsc --noEmit in CI
23. Monitoring in Production — Sentry for errors, Web Vitals reporting, source maps
24. Reactivity Models — how React, Vue, Svelte, and Solid each decide what re-runs on state change
