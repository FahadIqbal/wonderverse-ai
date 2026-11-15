import { existsSync } from 'node:fs'
import { defineConfig } from '@playwright/test'

const PORT = 4173
const CI = !!process.env.CI
/** When set (e.g. a deployed URL), tests run against it and no local server is started. */
const REMOTE = process.env.E2E_BASE_URL

/**
 * Browser choice: bundled Chromium (what `playwright install chromium` provides, used in CI).
 * Locally, installed Google Chrome is used when present so no download is needed. Override with E2E_CHANNEL
 * (`chrome`, `msedge`, or `chromium` to force the bundled build).
 */
const chromeInstalled = [
  '/Applications/Google Chrome.app',
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
].some(p => existsSync(p))
const requested = process.env.E2E_CHANNEL
const channel = requested ? (requested === 'chromium' ? undefined : requested) : !CI && chromeInstalled ? 'chrome' : undefined

// Software GL so WebGL exists on machines and CI runners without a GPU.
const launchOptions = {
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
}

const use = { channel, launchOptions }

export default defineConfig({
  testDir: './e2e',
  outputDir: './test-results',
  fullyParallel: true,
  forbidOnly: CI,
  retries: CI ? 1 : 0,
  workers: CI ? 2 : undefined,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: CI ? [['list'], ['html', { open: 'never' }]] : [['list']],
  webServer: REMOTE ? undefined : {
    // Serves the production build, so E2E runs against what ships.
    command: `npm run build && npx vite preview --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !CI,
    timeout: 240_000,
  },
  use: {
    baseURL: REMOTE ?? `http://localhost:${PORT}`,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    serviceWorkers: 'block',
  },
  projects: [
    { name: 'desktop', use: { ...use, viewport: { width: 1280, height: 800 } } },
    {
      name: 'tablet',
      use: { ...use, viewport: { width: 820, height: 1180 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 },
    },
    {
      name: 'mobile',
      use: { ...use, viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 3 },
    },
  ],
})
