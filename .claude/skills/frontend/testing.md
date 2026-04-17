---
name: byteai-e2e-testing
description: Playwright E2E testing for ByteAI — test file structure, Page Object Model, ByteAI-specific auth flows, feed/search/compose tests, CI/CD integration, and flaky test strategies.
---

# E2E Testing — ByteAI Frontend

## Test Project Structure

```
UI/tests/
├── e2e/
│   ├── auth/
│   │   ├── login.spec.ts         ← magic link, Google, onboarding
│   │   └── auth-guard.spec.ts    ← redirect to / when unauthenticated
│   ├── feed/
│   │   ├── feed.spec.ts          ← FOR_YOU / FOLLOWING / TRENDING tabs
│   │   └── post-card.spec.ts     ← like, bookmark, share, optimistic update
│   ├── compose/
│   │   └── compose.spec.ts       ← create byte, tags, code snippet
│   ├── search/
│   │   └── search.spec.ts        ← keyword search, result cards
│   └── profile/
│       └── profile.spec.ts       ← view profile, follow/unfollow
├── fixtures/
│   ├── auth.ts                   ← test auth fixture (bypass auth)
│   └── data.ts                   ← seed test bytes/users
├── pages/                        ← Page Object Models
│   ├── FeedPage.ts
│   ├── ComposePage.ts
│   └── SearchPage.ts
├── index.ts
└── mocks/
    └── index.ts
```

---

## Playwright Config for ByteAI

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['junit', { outputFile: 'playwright-results.xml' }],
  ],
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 10_000,
    navigationTimeout: 30_000,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile-chrome', use: { ...devices['Pixel 5'] } },
  ],
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
```

---

## Auth Fixture (Bypass Auth in Tests)

ByteAI uses a cookie `byteai_auth` for client-side guards. Inject it in the auth fixture to skip Supabase auth.

```typescript
// tests/fixtures/auth.ts
import { test as base, expect } from '@playwright/test'

export const test = base.extend({
  // Auto-use: inject auth cookie before every test
  authenticatedPage: async ({ page }, use) => {
    await page.context().addCookies([{
      name: 'byteai_auth',
      value: 'test-user-token',
      domain: 'localhost',
      path: '/',
    }])
    // Also set localStorage
    await page.goto('/')
    await page.evaluate(() => {
      localStorage.setItem('byteai_auth_state', JSON.stringify({
        userId: 'user_test_123',
        displayName: 'Test User',
        username: 'testuser',
      }))
    })
    await use(page)
  },
})

export { expect }
```

---

## Page Object Models

### FeedPage

```typescript
// tests/pages/FeedPage.ts
import { Page, Locator } from '@playwright/test'

export class FeedPage {
  readonly page: Page
  readonly forYouTab: Locator
  readonly followingTab: Locator
  readonly trendingTab: Locator
  readonly postCards: Locator
  readonly searchInput: Locator

  constructor(page: Page) {
    this.page = page
    this.forYouTab = page.getByRole('button', { name: 'FOR YOU' })
    this.followingTab = page.getByRole('button', { name: 'FOLLOWING' })
    this.trendingTab = page.getByRole('button', { name: 'TRENDING' })
    this.postCards = page.locator('[data-testid="post-card"]')
    this.searchInput = page.locator('[data-testid="search-input"]')
  }

  async goto() {
    await this.page.goto('/feed')
    await this.page.waitForLoadState('networkidle')
  }

  async switchToFollowing() {
    await this.followingTab.click()
    await this.page.waitForLoadState('networkidle')
  }

  async likeFirstPost() {
    const likeBtn = this.postCards.first().locator('[data-testid="like-btn"]')
    await likeBtn.click()
  }
}
```

### ComposePage

```typescript
// tests/pages/ComposePage.ts
import { Page, Locator } from '@playwright/test'

export class ComposePage {
  readonly titleInput: Locator
  readonly bodyInput: Locator
  readonly codeSnippetInput: Locator
  readonly tagsInput: Locator
  readonly submitButton: Locator

  constructor(page: Page) {
    this.titleInput = page.locator('[data-testid="compose-title"]')
    this.bodyInput = page.locator('[data-testid="compose-body"]')
    this.codeSnippetInput = page.locator('[data-testid="compose-code"]')
    this.tagsInput = page.locator('[data-testid="compose-tags"]')
    this.submitButton = page.getByRole('button', { name: 'POST' })
  }

  async goto(page: Page) {
    await page.goto('/compose')
  }

  async fillAndSubmit(title: string, body: string, tags: string[] = []) {
    await this.titleInput.fill(title)
    await this.bodyInput.fill(body)
    for (const tag of tags) {
      await this.tagsInput.fill(tag)
      await this.tagsInput.press('Enter')
    }
    await this.submitButton.click()
  }
}
```

---

## ByteAI Test Specs

### Auth Guard

```typescript
// tests/e2e/auth/auth-guard.spec.ts
import { test, expect } from '@playwright/test'

test('unauthenticated user redirected to /', async ({ page }) => {
  // No cookie — proxy.ts should redirect
  await page.goto('/feed')
  await expect(page).toHaveURL('/')
})

test('authenticated user can access feed', async ({ page }) => {
  await page.context().addCookies([{
    name: 'byteai_auth',
    value: 'test-user-token',
    domain: 'localhost',
    path: '/',
  }])
  await page.goto('/feed')
  await expect(page).not.toHaveURL('/')
  await expect(page.locator('[data-testid="feed-screen"]')).toBeVisible()
})
```

### Feed Tabs

```typescript
// tests/e2e/feed/feed.spec.ts
import { test, expect } from '../fixtures/auth'
import { FeedPage } from '../pages/FeedPage'

test.describe('Feed', () => {
  test('FOR_YOU tab loads posts', async ({ authenticatedPage }) => {
    const feed = new FeedPage(authenticatedPage)
    await feed.goto()
    await expect(feed.postCards.first()).toBeVisible()
  })

  test('can switch to FOLLOWING tab', async ({ authenticatedPage }) => {
    const feed = new FeedPage(authenticatedPage)
    await feed.goto()
    await feed.switchToFollowing()
    // Tab is active
    await expect(feed.followingTab).toHaveAttribute('aria-selected', 'true')
  })

  test('like button shows optimistic update', async ({ authenticatedPage }) => {
    const feed = new FeedPage(authenticatedPage)
    await feed.goto()

    const firstCard = feed.postCards.first()
    const likeCount = firstCard.locator('[data-testid="like-count"]')
    const initialCount = parseInt(await likeCount.innerText())

    await feed.likeFirstPost()

    // Optimistic — count changes immediately, no network wait
    await expect(likeCount).toHaveText(String(initialCount + 1))
  })
})
```

### Compose

```typescript
// tests/e2e/compose/compose.spec.ts
import { test, expect } from '../fixtures/auth'
import { ComposePage } from '../pages/ComposePage'

test.describe('Compose', () => {
  test('creates a byte and redirects to feed', async ({ authenticatedPage }) => {
    const compose = new ComposePage(authenticatedPage)
    await compose.goto(authenticatedPage)

    await compose.fillAndSubmit(
      'Test byte from Playwright',
      'This is an automated test post',
      ['testing', 'playwright']
    )

    // Should redirect to feed after post
    await expect(authenticatedPage).toHaveURL('/feed')
    await expect(authenticatedPage.getByText('Test byte from Playwright')).toBeVisible()
  })

  test('shows validation error on empty title', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/compose')
    await authenticatedPage.getByRole('button', { name: 'POST' }).click()

    await expect(authenticatedPage.locator('[data-testid="title-error"]'))
      .toContainText(/required/i)
  })
})
```

### Search

```typescript
// tests/e2e/search/search.spec.ts
import { test, expect } from '../fixtures/auth'

test('search returns results for known query', async ({ authenticatedPage }) => {
  await authenticatedPage.goto('/search')
  await authenticatedPage.locator('[data-testid="search-input"]').fill('react')
  await authenticatedPage.locator('[data-testid="search-input"]').press('Enter')

  await authenticatedPage.waitForResponse(r => r.url().includes('/api/search'))
  await expect(authenticatedPage.locator('[data-testid="search-result"]').first()).toBeVisible()
})

test('shows empty state for no results', async ({ authenticatedPage }) => {
  await authenticatedPage.goto('/search')
  await authenticatedPage.locator('[data-testid="search-input"]').fill('xyznonexistent999')
  await authenticatedPage.locator('[data-testid="search-input"]').press('Enter')

  await expect(authenticatedPage.locator('[data-testid="empty-state"]')).toBeVisible()
})
```

---

## Flaky Test Patterns

### Quarantine

```typescript
test('flaky: feed infinite scroll', async ({ page }) => {
  test.fixme(true, 'Flaky on CI — Issue #45')
})

test.skip(process.env.CI, 'Skip in CI — needs real API')
```

### Common Fixes

```typescript
// BAD: race condition
await page.click('[data-testid="like-btn"]')

// GOOD: wait for element to be ready
await page.locator('[data-testid="like-btn"]').waitFor({ state: 'visible' })
await page.locator('[data-testid="like-btn"]').click()

// BAD: arbitrary timeout
await page.waitForTimeout(3000)

// GOOD: wait for network
await page.waitForResponse(resp => resp.url().includes('/api/bytes'))

// BAD: fragile selector
page.locator('.jsx-123abc .inner div:nth-child(2)')

// GOOD: test-id or role
page.locator('[data-testid="post-card"]')
page.getByRole('button', { name: 'Like' })
```

---

## CI/CD Integration

```yaml
# .github/workflows/e2e.yml
name: E2E Tests
on: [push, pull_request]

jobs:
  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm install -g pnpm && pnpm install
        working-directory: UI
      - run: pnpm exec playwright install --with-deps
        working-directory: UI
      - run: pnpm exec playwright test
        working-directory: UI
        env:
          BASE_URL: ${{ vars.STAGING_URL }}
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: playwright-report
          path: UI/playwright-report/
          retention-days: 30
```

---

## Running Tests

```bash
# All E2E tests
pnpm exec playwright test

# Specific feature
pnpm exec playwright test tests/e2e/feed

# UI mode (interactive)
pnpm exec playwright test --ui

# Debug mode
pnpm exec playwright test --debug tests/e2e/compose/compose.spec.ts

# Check for flakiness
pnpm exec playwright test tests/e2e/feed/feed.spec.ts --repeat-each=10
```
