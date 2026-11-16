import { z } from 'zod'
import { normalizeQuestion, screenQuestion, TUTOR_LIMITS, TutorContext, validateTutorText } from '../../src/domain/learning/tutor'
import { allowedOrigins, LIMITS, providerSettings, rateLimitFrom, type Env } from './config'
import { buildUserMessage, SYSTEM_PROMPT } from './prompt'
import { buildProviderRequest, parseProviderReply } from './providers'
import { createRateLimiter, type RateLimiter } from './rateLimit'

/**
 * POST /api/hint. Request: { context: TutorContext, question?: string }. Response: { text, source: 'ai' }.
 * Errors are { error: <code> } only. Question text, context and provider bodies are never logged or echoed.
 */
const HintRequest = z.object({ context: TutorContext, question: z.string().max(TUTOR_LIMITS.maxQuestion).optional() }).strict()

export interface HintHandlerOptions {
  env: Env
  fetchImpl?: typeof fetch
  now?: () => number
  timeoutMs?: number
  maxBodyBytes?: number
  rateLimiter?: RateLimiter
}

function reply(status: number, body: unknown, extra: Record<string, string> = {}): Response {
  return new Response(status === 204 ? null : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...extra },
  })
}

function clientKey(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  return forwarded || req.headers.get('x-real-ip')?.trim() || 'unknown'
}

/** The body as text, or null when it is larger than `max` bytes. Stops reading as soon as the cap is crossed. */
async function readCapped(req: Request, max: number): Promise<string | null> {
  const declared = req.headers.get('content-length')
  if (declared !== null && (!/^\d+$/.test(declared) || Number(declared) > max)) return null
  if (!req.body) return ''
  const reader = req.body.getReader()
  const chunks: Uint8Array[] = []
  let total = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    total += value.byteLength
    if (total > max) {
      await reader.cancel().catch(() => undefined)
      return null
    }
    chunks.push(value)
  }
  const all = new Uint8Array(total)
  let at = 0
  for (const c of chunks) {
    all.set(c, at)
    at += c.byteLength
  }
  return new TextDecoder().decode(all)
}

export function createHintHandler(options: HintHandlerOptions): (req: Request) => Promise<Response> {
  const { env } = options
  const doFetch = options.fetchImpl ?? ((input, init) => fetch(input, init))
  const timeoutMs = options.timeoutMs ?? LIMITS.timeoutMs
  const maxBody = options.maxBodyBytes ?? LIMITS.maxBodyBytes
  const limiter = options.rateLimiter ?? createRateLimiter(rateLimitFrom(env), LIMITS.rateWindowMs, options.now)

  return async function handle(req) {
    const origins = allowedOrigins(env)
    const origin = req.headers.get('origin')
    const originAllowed = origin !== null && origins.includes(origin)
    const cors: Record<string, string> = originAllowed ? { 'Access-Control-Allow-Origin': origin, Vary: 'Origin' } : {}

    if (req.method === 'OPTIONS' && originAllowed) {
      return reply(204, null, { ...cors, 'Access-Control-Allow-Methods': 'POST', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Max-Age': '600' })
    }
    if (req.method !== 'POST') return reply(405, { error: 'method_not_allowed' }, { Allow: 'POST' })
    // A browser always sends Origin on a cross-site POST. A request with no Origin is a non-browser client, which
    // can set any header anyway; the rate limit and size caps are what protect the endpoint from those.
    if (origin !== null && !originAllowed) return reply(403, { error: 'origin_not_allowed' })
    if (!limiter.allow(clientKey(req))) return reply(429, { error: 'rate_limited' }, { ...cors, 'Retry-After': String(Math.ceil(LIMITS.rateWindowMs / 1000)) })

    const raw = await readCapped(req, maxBody)
    if (raw === null) return reply(413, { error: 'payload_too_large' }, cors)
    let json: unknown
    try {
      json = JSON.parse(raw)
    } catch {
      return reply(422, { error: 'invalid_request' }, cors)
    }
    const parsed = HintRequest.safeParse(json)
    if (!parsed.success) return reply(422, { error: 'invalid_request' }, cors)
    const { context } = parsed.data
    const question = normalizeQuestion(parsed.data.question)
    // Same rules as the browser: real-world electricity, prompt injection and off-topic questions never reach a model.
    if (screenQuestion(question) !== 'ok') return reply(422, { error: 'question_not_allowed' }, cors)

    const settings = providerSettings(env)
    if (!settings) return reply(503, { error: 'tutor_unavailable' }, cors)

    const request = buildProviderRequest(settings, SYSTEM_PROMPT, buildUserMessage(context, question), LIMITS.maxOutputTokens)
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    let text: string | null
    try {
      const res = await doFetch(request.url, { ...request.init, signal: controller.signal })
      if (!res.ok) return reply(502, { error: 'tutor_upstream_error' }, cors)
      text = parseProviderReply(settings.provider, await res.json())
    } catch {
      return controller.signal.aborted ? reply(504, { error: 'tutor_timeout' }, cors) : reply(502, { error: 'tutor_upstream_error' }, cors)
    } finally {
      clearTimeout(timer)
    }
    // Defence in depth: the browser validates again, but a bad reply should not leave the server.
    const checked = validateTutorText(text, context)
    if (!checked.ok) return reply(502, { error: 'tutor_bad_reply' }, cors)
    return reply(200, { text: checked.text, source: 'ai' }, cors)
  }
}
