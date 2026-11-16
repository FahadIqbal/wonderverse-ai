/** Server-only configuration for the Vercel tutor function. Nothing here is ever imported by `src/`. */
export const PROVIDER_IDS = ['openai', 'anthropic', 'gemini', 'openrouter'] as const
export type ProviderId = (typeof PROVIDER_IDS)[number]

/** Production site. Used as the only allowed browser origin when TUTOR_ALLOWED_ORIGINS is unset. */
export const DEFAULT_ALLOWED_ORIGIN = 'https://wonderverse-ai.vercel.app'

export const LIMITS = {
  maxBodyBytes: 8192,
  /** Wall-clock budget for the provider call. vercel.json gives the function a larger maxDuration. */
  timeoutMs: 8000,
  rateLimit: 20,
  rateWindowMs: 60_000,
  maxOutputTokens: 400,
  /** Distinct client keys kept in memory before the oldest is dropped. */
  maxRateKeys: 2000,
} as const

export interface ProviderSettings {
  provider: ProviderId
  model: string
  apiKey: string
}

export type Env = Readonly<Record<string, string | undefined>>

/** Exact origins only. A wildcard is ignored on purpose. */
export function allowedOrigins(env: Env): string[] {
  const list = (env.TUTOR_ALLOWED_ORIGINS ?? '')
    .split(',')
    .map(o => o.trim().replace(/\/+$/, ''))
    .filter(o => o.length > 0 && o !== '*')
  return list.length > 0 ? list : [DEFAULT_ALLOWED_ORIGIN]
}

/** Model ids look like `gpt-x`, `claude-x`, `gemini-x` or `vendor/model:tag`. Anything else is refused (it ends up in a URL for Gemini). */
const MODEL_ID = /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,99}$/

/**
 * The provider, model and key, or null when any of them is missing or invalid. There is deliberately no default
 * model: model names change, and a wrong default would fail silently in production.
 */
export function providerSettings(env: Env): ProviderSettings | null {
  const provider = (env.TUTOR_PROVIDER ?? '').trim().toLowerCase()
  const model = (env.TUTOR_MODEL ?? '').trim()
  const apiKey = (env.TUTOR_API_KEY ?? '').trim()
  if (!(PROVIDER_IDS as readonly string[]).includes(provider)) return null
  if (!MODEL_ID.test(model) || apiKey.length === 0) return null
  return { provider: provider as ProviderId, model, apiKey }
}

export function rateLimitFrom(env: Env): number {
  const n = Number(env.TUTOR_RATE_LIMIT)
  return Number.isInteger(n) && n >= 1 && n <= 1000 ? n : LIMITS.rateLimit
}
