import { test, expect } from '@playwright/test'

// ── Login page ────────────────────────────────────────────────────────────────

test('login page renders ByteAI branding', async ({ page }) => {
  const jsErrors: string[] = []
  page.on('pageerror', e => jsErrors.push(e.message))

  await page.goto('/')
  await page.waitForLoadState('load')

  // React app mounted and branding is visible
  await expect(page.getByText('ByteAI').first()).toBeVisible()

  expect(jsErrors, `JS runtime errors:\n${jsErrors.join('\n')}`).toHaveLength(0)
})

test('login page renders sign-in buttons', async ({ page }) => {
  await page.goto('/')
  await page.waitForLoadState('load')

  await expect(page.getByText('Continue with Google')).toBeVisible()
  await expect(page.getByText('Continue with Apple')).toBeVisible()
})

// ── Auth guard ────────────────────────────────────────────────────────────────

test('protected route redirects unauthenticated user to login', async ({ page }) => {
  await page.goto('/feed')

  // AuthGuard detects no session and calls router.replace('/') client-side
  await expect(page).toHaveURL('/', { timeout: 10_000 })
  await expect(page.getByText('ByteAI').first()).toBeVisible()
})

// ── Public pages ──────────────────────────────────────────────────────────────

test('privacy page renders without JS errors', async ({ page }) => {
  const jsErrors: string[] = []
  page.on('pageerror', e => jsErrors.push(e.message))

  await page.goto('/privacy')
  await page.waitForLoadState('load')

  expect(jsErrors, `JS runtime errors:\n${jsErrors.join('\n')}`).toHaveLength(0)
  await expect(page.locator('body')).not.toBeEmpty()
})

test('cookies page renders without JS errors', async ({ page }) => {
  const jsErrors: string[] = []
  page.on('pageerror', e => jsErrors.push(e.message))

  await page.goto('/cookies')
  await page.waitForLoadState('load')

  expect(jsErrors, `JS runtime errors:\n${jsErrors.join('\n')}`).toHaveLength(0)
  await expect(page.locator('body')).not.toBeEmpty()
})
