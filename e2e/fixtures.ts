import { test as base, expect, type ConsoleMessage, type Page } from '@playwright/test'

/**
 * Known, harmless messages from the software-GL browser and from three.js / R3F. Each entry says why it is allowed.
 * Anything else logged as an error, a pageerror or a warning fails the test.
 */
export const CONSOLE_ALLOWLIST: { pattern: RegExp; why: string }[] = [
  { pattern: /GPU stall due to ReadPixels|GL_CLOSE_PATH_NV/, why: 'SwiftShader software renderer performance notice' },
  { pattern: /Automatic fallback to software WebGL has been deprecated/, why: 'Chrome notice when GL runs on SwiftShader' },
  { pattern: /THREE\.Clock: This module has been deprecated/, why: 'three.js deprecation raised inside @react-three/fiber 8' },
  { pattern: /WEBGL_lose_context extension not supported/, why: 'three.js warning when a lost context is disposed' },
]

export interface ConsoleProblem {
  kind: 'console.error' | 'console.warning' | 'pageerror'
  text: string
}

function isAllowed(text: string): boolean {
  return CONSOLE_ALLOWLIST.some(a => a.pattern.test(text))
}

/**
 * Every test gets a fresh browser context from Playwright (no stored state). The auto fixture below records
 * console errors, warnings and uncaught page errors, and fails the test at the end if any are not allowlisted.
 * A test that expects a message calls `expectConsole(/pattern/)` first.
 */
export const test = base.extend<{ consoleGuard: { expectConsole: (p: RegExp) => void } }>({
  consoleGuard: [
    async ({ page }, use) => {
      const problems: ConsoleProblem[] = []
      const expected: RegExp[] = []
      const onConsole = (msg: ConsoleMessage) => {
        const type = msg.type()
        if (type !== 'error' && type !== 'warning') return
        problems.push({ kind: type === 'error' ? 'console.error' : 'console.warning', text: msg.text() })
      }
      page.on('console', onConsole)
      page.on('pageerror', err => problems.push({ kind: 'pageerror', text: err.message }))
      await use({ expectConsole: p => void expected.push(p) })
      const unexpected = problems.filter(p => !isAllowed(p.text) && !expected.some(e => e.test(p.text)))
      expect(unexpected, 'unexpected console output').toEqual([])
    },
    { auto: true },
  ],
})

export { expect }

/** Makes WebGL unavailable before any page script runs, the way a locked-down browser would. */
export async function disableWebGL(page: Page) {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, type: string, ...rest: unknown[]) {
      if (/webgl/i.test(type) || type === 'experimental-webgl') return null
      return (original as (...a: unknown[]) => unknown).call(this, type, ...rest)
    } as typeof original
  })
}
