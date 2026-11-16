import { z } from 'zod'
import { localTutor, TutorContext, TutorQuestion, type TutorAdapter, type TutorResponse } from '../../domain/learning'

/** Longer than the function's own 8 s provider timeout, so the server answers (or times out) first. */
export const REMOTE_TIMEOUT_MS = 9000
/** Base path of the Vercel function. The adapter posts to `${base}/hint`. */
export const SAME_ORIGIN_GATEWAY = '/api'

const GatewayReply = z.object({ text: z.string() })

export interface RemoteTutorOptions {
  /** Gateway base URL or same-origin path, e.g. https://tutor.example.org or /api. The adapter posts to `${url}/hint`. */
  url: string
  timeoutMs?: number
  fetchImpl?: typeof fetch
}

/**
 * Talks to the optional gateway. It sends only the validated context and the question. It throws on any
 * failure; `resolveHint` turns that into a local fallback, so this adapter never has to be trusted.
 */
export function createRemoteTutor({ url, timeoutMs = REMOTE_TIMEOUT_MS, fetchImpl }: RemoteTutorOptions): TutorAdapter {
  const endpoint = `${url.replace(/\/+$/, '')}/hint`
  return {
    id: 'remote',
    async getHint(context, learnerQuestion): Promise<TutorResponse> {
      const body = JSON.stringify({
        context: TutorContext.parse(context),
        ...(learnerQuestion ? { question: TutorQuestion.parse(learnerQuestion) } : {}),
      })
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), timeoutMs)
      try {
        const res = await (fetchImpl ?? fetch)(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body,
          signal: controller.signal,
          credentials: 'omit',
          referrerPolicy: 'no-referrer',
        })
        if (!res.ok) throw new Error(`gateway status ${res.status}`)
        const reply = GatewayReply.parse(await res.json())
        return { text: reply.text, kind: 'hint', source: 'remote' }
      } finally {
        clearTimeout(timer)
      }
    },
  }
}

/** Valid http(s) URL or undefined. */
export function parseTutorUrl(value: string | undefined): string | undefined {
  if (!value) return undefined
  try {
    const u = new URL(value)
    return u.protocol === 'https:' || u.protocol === 'http:' ? u.toString() : undefined
  } catch {
    return undefined
  }
}

/**
 * The adapter the app uses. Remote when VITE_TUTOR_URL is a valid URL (the optional FastAPI gateway), or when
 * VITE_TUTOR_MODE is `remote` (the same-origin Vercel function at /api/hint). Otherwise the local guide.
 * Either way, every reply is validated and a failure falls back to the local guide.
 */
export function getConfiguredTutor(
  url: string | undefined = import.meta.env.VITE_TUTOR_URL,
  mode: string | undefined = import.meta.env.VITE_TUTOR_MODE,
): TutorAdapter {
  const parsed = parseTutorUrl(url)
  if (parsed) return createRemoteTutor({ url: parsed })
  return mode === 'remote' ? createRemoteTutor({ url: SAME_ORIGIN_GATEWAY }) : localTutor
}
