# Meta Frameworks — Seed Reference

## Seed Config
subdomain: meta_frameworks
domain: frontend
tech_stacks: [nextjs, nuxtjs, sveltekit, astro, remix, tanstack_start]
byte_type_default: article

## Topics to Seed

1. Architecture & Structure — file-based routing as architecture, route-level colocation of loader/error/loading
2. Component Design — Server Components vs Client Components, push use client to the leaves
3. State Management — URL as state for filters/pagination, server state in loaders not useState
4. Performance — SSG vs SSR vs ISR decision matrix, parallel data fetching in loaders
5. Data Fetching — route loaders fetch before render, eliminate waterfall, no fetch inside components
6. Forms — Server Actions, progressive enhancement, form validation on server boundary
7. TypeScript — typed route params, typed loaders, typed search params with Zod
8. Error Handling — error.tsx / +error.svelte per route segment, notFound(), redirect()
9. Testing — test loaders and actions in isolation, Playwright for full route flows
10. Security — Server Actions as trust boundary, validate all input, env var separation
11. Code Quality — route segment conventions, consistent loader/action naming
12. Routing — file-based routing patterns, dynamic segments, catch-all, intercepting routes, parallel routes
13. Internationalization — i18n routing strategies, locale in URL vs cookie, server-side locale detection
14. Web Vitals — image optimization with framework Image component, font loading, LCP via priority flag
15. Memory Leaks — streaming with Suspense, abort signals in loaders, cleanup on navigation
16. Real-time & WebSockets — server-sent events from route handlers, combining with client state
17. Environment & Config — NEXT_PUBLIC_ vs private vars, validate at startup, never expose secrets
18. API Layer — route handlers for public APIs, Server Actions for mutations, middleware for auth
19. Animation — page transition patterns, View Transitions API, layout persistence across navigations
20. Global UI Patterns — layout-level toast/modal, shared loading UI in layout segment
21. Bundle & Asset Optimization — automatic code splitting per route, dynamic imports, bundle analysis
22. Dev Tooling & Quality Gates — framework CLI, preview deployments, type-check route params
23. Monitoring in Production — edge function logs, server-side Sentry, Web Vitals from RUM
24. Middleware — run at the edge before render, auth guards, A/B testing, geolocation, rate limiting
