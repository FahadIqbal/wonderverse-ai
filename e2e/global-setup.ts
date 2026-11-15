import { readdirSync } from 'node:fs'
import { join } from 'node:path'

/**
 * Warm-up for the local preview server, run once before any test.
 * Playwright's webServer only waits for the index page. The first tests then pay for the first request of every
 * hashed asset, including the lazy ~933 kB 3D chunk. This requests each file in dist/assets once so no test
 * carries that cost. It does not start a browser, and it never fails the run: a miss only means a colder first test.
 * Skipped when E2E_BASE_URL points at a deployed site.
 */
export default async function globalSetup() {
  if (process.env.E2E_BASE_URL) return
  const base = 'http://localhost:4173'
  const started = Date.now()
  let files: string[] = []
  try {
    files = readdirSync(join(process.cwd(), 'dist', 'assets'))
  } catch {
    return
  }
  const urls = ['/', ...files.map(f => `/assets/${f}`)]
  const results = await Promise.allSettled(
    urls.map(async u => {
      const res = await fetch(base + u)
      await res.arrayBuffer()
      if (!res.ok) throw new Error(`${u} ${res.status}`)
    }),
  )
  const failed = results.filter(r => r.status === 'rejected').length
  console.log(`[global-setup] warmed ${urls.length - failed}/${urls.length} files in ${Date.now() - started} ms`)
}
