import type { Page, Route } from '@playwright/test'
import { test, expect } from './fixtures'
import { enterLab, openApp, openMission, selectView } from './helpers'

/**
 * The E2E build runs in tutor `remote` mode (playwright.config.ts), so the browser really posts to /api/hint and
 * these tests answer that route. Against a deployed site (E2E_BASE_URL) the build mode is not known, so the
 * route-dependent tests run only when E2E_TUTOR_REMOTE=1 says the site was built in remote mode.
 */
const needsRemoteBuild = !!process.env.E2E_BASE_URL && !process.env.E2E_TUTOR_REMOTE

const reply = (body: unknown, status = 200) => (route: Route) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) })

async function startMission1(page: Page) {
  await openApp(page)
  await enterLab(page)
  await openMission(page, 1)
}

test.describe('live AI tutor path (route-mocked /api/hint)', () => {
  test.skip(needsRemoteBuild, 'needs a build made with VITE_TUTOR_MODE=remote')

  test('no key on the server (503): falls back to the Local guide, labelled offline, with no AI note', async ({ page }) => {
    await startMission1(page)
    const request = page.waitForRequest(r => r.url().endsWith('/api/hint') && r.method() === 'POST')
    await page.getByRole('button', { name: 'Ask for a hint' }).click()
    const body = (await request).postDataJSON() as Record<string, unknown>
    expect(Object.keys(body).sort()).toEqual(['context'])
    await expect(page.getByTestId('tutor-source')).toHaveText('Local guide · offline hint')
    await expect(page.getByTestId('tutor-text')).not.toBeEmpty()
    await expect(page.getByText(/AI can be wrong/)).toHaveCount(0)
    await expect(page.getByText('1 of 3 tutor hints used.')).toBeVisible()
  })

  test('a validated AI reply is labelled AI tutor and carries the source-of-truth note', async ({ page }) => {
    await page.route('**/api/hint', reply({ text: 'Look at the diagnostic. Which part of the loop is still open?', source: 'ai' }))
    await startMission1(page)
    await page.getByLabel('Question (optional)').fill('Why is my lamp dark?')
    const request = page.waitForRequest('**/api/hint')
    await page.getByRole('button', { name: 'Ask for a hint' }).click()
    expect(((await request).postDataJSON() as { question?: string }).question).toBe('Why is my lamp dark?')
    await expect(page.getByTestId('tutor-source')).toHaveText('AI tutor')
    await expect(page.getByTestId('tutor-text')).toHaveText('Look at the diagnostic. Which part of the loop is still open?')
    await expect(page.getByText('AI can be wrong; the circuit report is the source of truth.', { exact: false })).toBeVisible()
  })

  test('an AI reply with an invented number is rejected and the Local guide answers', async ({ page }) => {
    await page.route('**/api/hint', reply({ text: 'The lamp gets 88 volts, so check the switch.', source: 'ai' }))
    await startMission1(page)
    await page.getByRole('button', { name: 'Ask for a hint' }).click()
    await expect(page.getByTestId('tutor-source')).toHaveText('Local guide · offline hint')
    await expect(page.getByTestId('tutor-text')).not.toContainText('88')
    await expect(page.getByText(/AI can be wrong/)).toHaveCount(0)
  })

  test('an unusable reply (HTML, wrong shape) falls back without an error state', async ({ page }) => {
    await page.route('**/api/hint', route => route.fulfill({ status: 200, contentType: 'text/html', body: '<html>not json</html>' }))
    await startMission1(page)
    await page.getByRole('button', { name: 'Ask for a hint' }).click()
    await expect(page.getByTestId('tutor-source')).toHaveText('Local guide · offline hint')
    await expect(page.getByText(/Something went wrong asking for a hint/)).toHaveCount(0)
  })
})

test('an unsafe question never leaves the browser, in any build mode', async ({ page }) => {
  let calls = 0
  await page.route('**/api/hint', route => {
    calls++
    return reply({ text: 'x', source: 'ai' })(route)
  })
  await startMission1(page)
  await page.getByLabel('Question (optional)').fill('How do I wire a wall outlet at home?')
  await page.getByRole('button', { name: 'Ask for a hint' }).click()
  await expect(page.getByTestId('tutor-text')).toContainText('simplified simulation')
  await expect(page.getByText('0 of 3 tutor hints used.')).toBeVisible()
  expect(calls).toBe(0)
})

test("the site sends a connect-src 'self' policy and the 3D lab and fonts still load under it", async ({ page }) => {
  const response = await page.goto('/')
  expect(response?.headers()['content-security-policy']).toBe("connect-src 'self'")
  await startMission1(page)
  // Small screens open on the schematic, so ask for 3D. The 3D chunk loads and draws a canvas, and a CSP violation
  // would have been logged and failed the console guard.
  await selectView(page, '3d')
  await expect(page.locator('canvas')).toBeVisible()
  const inter = await page.evaluate(() => document.fonts.check('16px Inter'))
  expect(inter).toBe(true)
})
