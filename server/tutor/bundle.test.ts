// @vitest-environment node
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
// @ts-expect-error plain .mjs build script without type declarations
import { bundleHint } from '../../scripts/build-api.mjs'

const root = resolve(__dirname, '../..')

describe('api/hint.js (the file Vercel runs)', () => {
  it('is up to date with server/tutor (run `npm run build:api` if this fails)', async () => {
    expect(readFileSync(resolve(root, 'api/hint.js'), 'utf8')).toBe(await bundleHint())
  })

  it('loads under plain Node ESM with no relative imports, answers 405 for GET and 503 without a key', () => {
    const source = readFileSync(resolve(root, 'api/hint.js'), 'utf8')
    expect(source).not.toMatch(/from\s*["']\.{1,2}\//)
    const script = `
      import h from './api/hint.js'
      const get = await h.fetch(new Request('https://wonderverse-ai.vercel.app/api/hint'))
      const ctx = JSON.stringify({ context: {} })
      const bad = await h.fetch(new Request('https://wonderverse-ai.vercel.app/api/hint', { method: 'POST', body: ctx }))
      console.log(JSON.stringify([get.status, bad.status]))
    `
    const env = { ...process.env }
    for (const k of ['TUTOR_PROVIDER', 'TUTOR_MODEL', 'TUTOR_API_KEY', 'TUTOR_ALLOWED_ORIGINS']) delete env[k]
    const out = execFileSync(process.execPath, ['--input-type=module', '-e', script], { cwd: root, env }).toString().trim()
    expect(JSON.parse(out)).toEqual([405, 422])
  })
})
