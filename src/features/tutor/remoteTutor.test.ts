import { describe, expect, it, vi } from 'vitest'
import { buildTutorContext, localTutor, resolveHint, mission1, solveCircuitForTest } from './testSupport'
import { createRemoteTutor, getConfiguredTutor, parseTutorUrl, SAME_ORIGIN_GATEWAY } from './remoteTutor'

const ctx = buildTutorContext(solveCircuitForTest(mission1.setupGraph, mission1))
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

describe('RemoteTutor', () => {
  it('posts only the context and question to /hint with no credentials', async () => {
    const fetchImpl = vi.fn(async () => json({ text: 'Which wire is missing?' }))
    const r = await resolveHint(createRemoteTutor({ url: 'https://tutor.test/', fetchImpl }), ctx, 'why is it dark?')
    expect(r).toMatchObject({ source: 'remote', offlineFallback: false })
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('https://tutor.test/hint')
    expect(init.credentials).toBe('omit')
    expect(Object.keys(JSON.parse(init.body as string)).sort()).toEqual(['context', 'question'])
    expect(init.headers).not.toHaveProperty('Authorization')
  })
  it('falls back to the local guide on HTTP 503, network error, bad JSON shape and timeout', async () => {
    const cases: Array<typeof fetch> = [
      async () => json({ detail: 'no key' }, 503),
      async () => Promise.reject(new TypeError('network')),
      async () => json({ unexpected: true }),
      (_u, init) => new Promise((_res, rej) => init?.signal?.addEventListener('abort', () => rej(new DOMException('aborted', 'AbortError')))),
    ]
    for (const fetchImpl of cases) {
      const r = await resolveHint(createRemoteTutor({ url: 'https://tutor.test', fetchImpl, timeoutMs: 20 }), ctx)
      expect(r).toMatchObject({ source: 'local', offlineFallback: true })
      expect(r.text.length).toBeGreaterThan(0)
    }
  })
  it('rejects an ungrounded remote answer', async () => {
    const r = await resolveHint(createRemoteTutor({ url: 'https://tutor.test', fetchImpl: async () => json({ text: 'It draws 77 A.' }) }), ctx)
    expect(r).toMatchObject({ source: 'local', offlineFallback: true, fallbackReason: 'ungrounded' })
  })
})

describe('configuration', () => {
  it('posts to the same-origin /api/hint when the mode is remote, and VITE_TUTOR_URL still wins', async () => {
    const fetchImpl = vi.fn(async () => json({ text: 'Which wire is missing?', source: 'ai' }))
    const r = await resolveHint(createRemoteTutor({ url: SAME_ORIGIN_GATEWAY, fetchImpl }), ctx)
    expect(r).toMatchObject({ source: 'remote', offlineFallback: false })
    expect((fetchImpl.mock.calls[0] as unknown as [string])[0]).toBe('/api/hint')
    expect(getConfiguredTutor(undefined, 'remote').id).toBe('remote')
    expect(getConfiguredTutor(undefined, 'local')).toBe(localTutor)
    expect(getConfiguredTutor(undefined, undefined)).toBe(localTutor)
    expect(getConfiguredTutor('https://tutor.test', 'local').id).toBe('remote')
  })
  it('rejects an AI reply that quotes a number the circuit report does not contain', async () => {
    const fetchImpl = async () => json({ text: 'The lamp gets 88 volts right now.', source: 'ai' })
    const r = await resolveHint(createRemoteTutor({ url: SAME_ORIGIN_GATEWAY, fetchImpl }), ctx)
    expect(r).toMatchObject({ source: 'local', offlineFallback: true, fallbackReason: 'ungrounded' })
  })
  it('uses the local guide unless VITE_TUTOR_URL is a valid http(s) URL', () => {
    expect(getConfiguredTutor(undefined)).toBe(localTutor)
    expect(getConfiguredTutor('')).toBe(localTutor)
    expect(getConfiguredTutor('javascript:alert(1)')).toBe(localTutor)
    expect(getConfiguredTutor('not a url')).toBe(localTutor)
    expect(getConfiguredTutor('https://tutor.test').id).toBe('remote')
    expect(parseTutorUrl('ftp://x')).toBeUndefined()
  })
})
