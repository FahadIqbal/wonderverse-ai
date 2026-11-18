import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'
import { installConsoleGuard } from '../test/consoleGuard'
/**
 * Spec-shaped in-memory Storage, installed always so tests behave the same on every Node version
 * (recent Node exposes a stub localStorage that is unusable without --localstorage-file).
 */
class MemoryStorage implements Storage {
  private data = new Map<string, string>()
  get length() {
    return this.data.size
  }
  clear() {
    this.data.clear()
  }
  getItem(key: string) {
    return this.data.get(key) ?? null
  }
  key(index: number) {
    return [...this.data.keys()][index] ?? null
  }
  removeItem(key: string) {
    this.data.delete(key)
  }
  setItem(key: string, value: string) {
    this.data.set(key, String(value))
  }
}
// Server tests (server/**) run in the node environment, where there is no window to patch.
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'localStorage', { value: new MemoryStorage(), configurable: true })
  installConsoleGuard()
  afterEach(async () => {
    cleanup()
    // Closing an overlay pops the history entry it added (see useBackToClose). jsdom delivers that popstate
    // asynchronously, so let it land here instead of in the next test.
    await Promise.resolve()
    const state = window.history.state as Record<string, unknown> | null
    if (state && 'wvOverlay' in state) await new Promise(r => setTimeout(r, 30))
  })
}
