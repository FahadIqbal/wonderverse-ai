import { readFileSync } from 'node:fs'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// The browser calls the same-origin /api/hint function only when the build knows a tutor key exists on the server
// (Vercel exposes project environment variables to the build). Only the word `remote` is embedded, never the key.
// Set VITE_TUTOR_MODE=local to force the offline guide, or VITE_TUTOR_MODE=remote to force the function call.
process.env.VITE_TUTOR_MODE ??= process.env.TUTOR_API_KEY ? 'remote' : 'local'

// `vite preview` does not read vercel.json, so serve the same site-wide headers (including the Content-Security-Policy)
// there. That way the E2E run, which uses `vite preview`, exercises the policy that Vercel will send.
const vercel = JSON.parse(readFileSync(new URL('./vercel.json', import.meta.url), 'utf8')) as {
  headers: { source: string; headers: { key: string; value: string }[] }[]
}
const siteHeaders = Object.fromEntries((vercel.headers.find(h => h.source === '/(.*)')?.headers ?? []).map(h => [h.key, h.value]))

export default defineConfig({
  plugins: [react()],
  preview: { headers: siteHeaders },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/__tests__/setup.ts'],
    include: ['src/**/*.{test,spec}.{js,ts,jsx,tsx}'],
  },
})
