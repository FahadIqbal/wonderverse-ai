import type { ProviderSettings } from './config'

/** Endpoints and request shapes come from each provider's official reference. See docs/12-DECISION-LOG.md. */
export const ENDPOINTS = {
  openai: 'https://api.openai.com/v1/chat/completions',
  anthropic: 'https://api.anthropic.com/v1/messages',
  openrouter: 'https://openrouter.ai/api/v1/chat/completions',
  gemini: (model: string) => `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
} as const

/** Anthropic requires an explicit API version header. */
export const ANTHROPIC_VERSION = '2023-06-01'

export interface ProviderRequest {
  url: string
  init: { method: 'POST'; headers: Record<string, string>; body: string }
}

export function buildProviderRequest(s: ProviderSettings, system: string, user: string, maxOutputTokens: number): ProviderRequest {
  const json = { 'Content-Type': 'application/json' }
  switch (s.provider) {
    case 'openai':
      return {
        url: ENDPOINTS.openai,
        init: {
          method: 'POST',
          headers: { ...json, Authorization: `Bearer ${s.apiKey}` },
          body: JSON.stringify({
            model: s.model,
            messages: [
              { role: 'developer', content: system },
              { role: 'user', content: user },
            ],
            max_completion_tokens: maxOutputTokens,
          }),
        },
      }
    case 'openrouter':
      return {
        url: ENDPOINTS.openrouter,
        init: {
          method: 'POST',
          headers: { ...json, Authorization: `Bearer ${s.apiKey}` },
          body: JSON.stringify({
            model: s.model,
            messages: [
              { role: 'system', content: system },
              { role: 'user', content: user },
            ],
            max_tokens: maxOutputTokens,
          }),
        },
      }
    case 'anthropic':
      return {
        url: ENDPOINTS.anthropic,
        init: {
          method: 'POST',
          headers: { ...json, 'x-api-key': s.apiKey, 'anthropic-version': ANTHROPIC_VERSION },
          body: JSON.stringify({
            model: s.model,
            max_tokens: maxOutputTokens,
            system,
            messages: [{ role: 'user', content: user }],
          }),
        },
      }
    case 'gemini':
      return {
        url: ENDPOINTS.gemini(s.model),
        init: {
          method: 'POST',
          headers: { ...json, 'x-goog-api-key': s.apiKey },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: system }] },
            contents: [{ role: 'user', parts: [{ text: user }] }],
            generationConfig: { maxOutputTokens },
          }),
        },
      }
  }
}

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null

/** The reply text, or null when the response does not have the documented shape. Never throws. */
export function parseProviderReply(provider: ProviderSettings['provider'], body: unknown): string | null {
  if (!isObject(body)) return null
  if (provider === 'openai' || provider === 'openrouter') {
    const first = Array.isArray(body.choices) ? body.choices[0] : undefined
    const content = isObject(first) && isObject(first.message) ? first.message.content : undefined
    return typeof content === 'string' ? content : null
  }
  if (provider === 'anthropic') {
    if (!Array.isArray(body.content)) return null
    const texts = body.content.flatMap(b => (isObject(b) && b.type === 'text' && typeof b.text === 'string' ? [b.text] : []))
    return texts.length > 0 ? texts.join(' ') : null
  }
  const first = Array.isArray(body.candidates) ? body.candidates[0] : undefined
  const parts = isObject(first) && isObject(first.content) && Array.isArray(first.content.parts) ? first.content.parts : null
  if (!parts) return null
  const texts = parts.flatMap(p => (isObject(p) && p.thought !== true && typeof p.text === 'string' ? [p.text] : []))
  return texts.length > 0 ? texts.join(' ') : null
}
