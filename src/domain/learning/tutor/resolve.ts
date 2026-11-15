import { localTutor } from './localTutor'
import { normalizeQuestion, screenQuestion } from './screen'
import { TutorContext, TutorResponse, type TutorAdapter } from './schemas'
import { validateTutorText, type RejectReason } from './validate'

export interface TutorResult {
  text: string
  kind: 'hint' | 'redirect'
  /** Who actually wrote the text. */
  source: 'local' | 'remote'
  /** True when a remote adapter failed or its answer was rejected, so the local guide answered instead. */
  offlineFallback: boolean
  fallbackReason?: RejectReason | 'error' | 'timeout'
}

export const STATIC_FALLBACK =
  "I can't read the circuit report right now. Look at the circuit diagnostic below the workbench and trace a loop from the battery and back."

export const DEFAULT_TIMEOUT_MS = 6000

function deepFreeze<T>(v: T): T {
  if (v && typeof v === 'object') {
    Object.values(v as object).forEach(deepFreeze)
    Object.freeze(v)
  }
  return v
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout>
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error('timeout')), ms)
  })
  return Promise.race([p, timeout]).finally(() => clearTimeout(timer))
}

async function askValidated(adapter: TutorAdapter, ctx: TutorContext, question: string | undefined, timeoutMs: number) {
  const parsed = TutorResponse.safeParse(await withTimeout(adapter.getHint(ctx, question), timeoutMs))
  if (!parsed.success) return { ok: false as const, reason: 'schema' as const }
  const checked = validateTutorText(parsed.data.text, ctx)
  return checked.ok ? { ok: true as const, text: checked.text, kind: parsed.data.kind, source: parsed.data.source } : checked
}

/**
 * The one entry point the UI uses. Validates the context, screens the question locally (unsafe or off-topic
 * questions never leave the device), asks `primary`, validates the answer, and falls back to the local guide.
 */
export async function resolveHint(
  primary: TutorAdapter,
  rawContext: unknown,
  rawQuestion?: string,
  options: { local?: TutorAdapter; timeoutMs?: number } = {},
): Promise<TutorResult> {
  const local = options.local ?? localTutor
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS
  const ctx = deepFreeze(TutorContext.parse(structuredClone(rawContext)))
  const question = normalizeQuestion(rawQuestion)
  const useLocalOnly = primary.id === 'local' || screenQuestion(question) !== 'ok'

  let fallbackReason: TutorResult['fallbackReason']
  if (!useLocalOnly) {
    try {
      const r = await askValidated(primary, ctx, question, timeoutMs)
      if (r.ok) return { text: r.text, kind: r.kind, source: 'remote', offlineFallback: false }
      fallbackReason = r.reason
    } catch (e) {
      fallbackReason = e instanceof Error && e.message === 'timeout' ? 'timeout' : 'error'
    }
  }
  const offlineFallback = fallbackReason !== undefined
  try {
    const r = await askValidated(local, ctx, question, timeoutMs)
    if (r.ok) return { text: r.text, kind: r.kind, source: 'local', offlineFallback, fallbackReason }
  } catch {
    // fall through to the static message
  }
  return { text: STATIC_FALLBACK, kind: 'hint', source: 'local', offlineFallback: true, fallbackReason: fallbackReason ?? 'error' }
}
