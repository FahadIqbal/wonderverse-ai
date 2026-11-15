import { afterEach, beforeEach, vi } from 'vitest'

/**
 * Fails any test that logs to console.error or console.warn without saying so.
 *
 * Known noise that is allowed everywhere is listed below, each with the reason. A test that deliberately
 * triggers an error (for example an error boundary test) calls `allowConsole(/pattern/)` for that test only.
 */
const GLOBAL_ALLOW: { pattern: RegExp; why: string }[] = [
  // jsdom has no canvas; our WebGL detection probes getContext and handles the null result.
  { pattern: /Not implemented: HTMLCanvasElement(\.prototype)?\.getContext/, why: 'jsdom lacks canvas; isWebGLAvailable() copes' },
]

let testAllow: RegExp[] = []
let unexpected: string[] = []

export function allowConsole(...patterns: RegExp[]): void {
  testAllow.push(...patterns)
}

function format(args: unknown[]): string {
  return args.map(a => (a instanceof Error ? `${a.name}: ${a.message}` : String(a))).join(' ')
}

export function installConsoleGuard(): void {
  beforeEach(() => {
    testAllow = []
    unexpected = []
    for (const method of ['error', 'warn'] as const) {
      vi.spyOn(console, method).mockImplementation((...args: unknown[]) => {
        const text = format(args)
        if (GLOBAL_ALLOW.some(a => a.pattern.test(text)) || testAllow.some(p => p.test(text))) return
        unexpected.push(`console.${method}: ${text.slice(0, 400)}`)
      })
    }
  })
  afterEach(() => {
    const found = unexpected
    unexpected = []
    testAllow = []
    vi.restoreAllMocks()
    if (found.length > 0) throw new Error(`Unexpected console output during test:\n${found.join('\n')}`)
  })
}
