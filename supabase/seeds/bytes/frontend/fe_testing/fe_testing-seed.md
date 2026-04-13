# Frontend Testing — Seed Reference

## Seed Config
subdomain: fe_testing
domain: frontend
tech_stacks: [playwright, cypress, vitest, jest, storybook]
byte_type_default: article

## Topics to Seed

1. Testing Strategy — unit vs integration vs E2E pyramid, what to test at each level
2. Test Behaviour Not Implementation — Testing Library philosophy, query by role not by class
3. Component Testing — rendering, user interaction, asserting on visible output
4. Unit Testing — pure functions, custom hooks with renderHook
5. Integration Testing — testing multiple components together, mocking at the right boundary
6. E2E Testing — full user flows, critical paths only (auth, onboarding, core feature)
7. Mocking — MSW for API mocking, when to mock vs use real dependencies
8. Async Testing — waitFor, findBy queries, handling promises and fake timers
9. Snapshot Testing — when it helps vs when it becomes noise
10. Visual Regression — Chromatic with Storybook, screenshot diffing in CI
11. Accessibility Testing — axe-core integration, automated a11y checks in tests
12. Test Data Management — factories, fixtures, seeding test state
13. CI Integration — parallelizing tests, caching, fail-fast strategies
14. Vitest-specific — vite-native speed, compatible Jest API, in-source testing
15. Playwright-specific — multi-browser, trace viewer, network interception
16. Cypress-specific — cy.intercept, component testing mode
17. Storybook — component documentation, interaction testing, story-driven development
18. Code Coverage — what it tells you and what it doesn't, avoiding coverage theater
