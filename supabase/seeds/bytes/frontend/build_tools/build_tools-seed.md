# Build Tools — Seed Reference

## Seed Config
subdomain: build_tools
domain: frontend
tech_stacks: [vite, webpack, esbuild, turbopack, rollup]
byte_type_default: article

## Topics to Seed

1. Project Setup & Config — zero-config vs explicit config, config file structure
2. Dev Server — HMR, proxy setup, HTTPS in dev
3. Code Splitting — manual chunks, dynamic imports, route-based splitting
4. Tree Shaking — how it works, why side effects matter, marking packages as pure
5. Bundle Analysis — visualizing size, finding bloat, setting size budgets in CI
6. Asset Handling — images, fonts, SVGs, hashing for cache busting
7. Environment Variables — .env files, build-time vs runtime, define plugin
8. Source Maps — types, trade-offs in production
9. TypeScript — transpile-only vs type-check, speed vs safety trade-off
10. CSS Processing — PostCSS, CSS Modules, preprocessor support
11. Aliasing & Path Resolution — @ aliases, module resolution config
12. Performance — build speed, caching, parallel processing, incremental builds
13. Production Optimization — minification, compression (gzip/brotli), dead code elimination
14. Plugin System — how plugins extend the build pipeline
15. Vite-specific — native ESM in dev, esbuild pre-bundling, Rollup in prod
16. Webpack-specific — loaders vs plugins, module federation
17. Monorepo Support — workspace packages, shared configs, turborepo integration
18. Dev Tooling — config sharing, extending base configs, CI build caching
19. Monitoring — build time tracking, bundle size regression alerts in CI
