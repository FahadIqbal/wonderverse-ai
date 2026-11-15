import { SAFETY_COPY } from './screen'
import { TUTOR_LIMITS, type TutorContext } from './schemas'

export type RejectReason = 'schema' | 'empty' | 'too_long' | 'active_markup' | 'blocked' | 'ungrounded'
export type ValidationResult = { ok: true; text: string } | { ok: false; reason: RejectReason }

const NUMBER = /\d+(?:\.\d+)?/g
const NUMBER_WORD = /\b(one|two|three|four|five|six|seven|eight|nine|ten|twelve|hundred|thousand|half)\s+(amps?|amperes?|volts?|ohms?|watts?|milliamps?)\b/i

/** Every number appearing in `text`, as numbers. */
export function numbersIn(text: string): number[] {
  return (text.match(NUMBER) ?? []).map(Number)
}

/** Numbers a tutor may quote: numeric fields of the context plus digits inside its strings (labels, authored hints, events). */
export function groundedNumbers(context: TutorContext): Set<number> {
  const out = new Set<number>()
  const walk = (v: unknown): void => {
    if (typeof v === 'number') out.add(v)
    else if (typeof v === 'string') numbersIn(v).forEach(n => out.add(n))
    else if (Array.isArray(v)) v.forEach(walk)
    else if (v && typeof v === 'object') Object.values(v).forEach(walk)
  }
  walk(context)
  return out
}

/** Numbers in `text` that do not occur in the context. */
export function ungroundedNumbers(text: string, context: TutorContext): number[] {
  const allowed = groundedNumbers(context)
  return numbersIn(text).filter(n => !allowed.has(n))
}

const ACTIVE_MARKUP = /<\s*(script|iframe|object|embed|style|link|meta|img|svg)\b|javascript:|data:text|\bon[a-z]+\s*=/i
const BLOCKED: RegExp[] = [
  /https?:\/\/|www\.|\b[\w-]+\.(com|net|org|io|ai|xyz)\b/i,
  /[\w.+-]+@[\w-]+\.[\w.]+/,
  /\b(mains|outlets?|sockets?|household|house wiring|fuse ?box|breaker|power ?lines?|live wires?|(110|115|120|220|230|240) ?v(olts?)?)\b/i,
  /\b(tell me|what(?:'s| is)|share|give me|enter|type) your (full |real |first |last )?(name|address|phone|email|password|school|age)\b/i,
  /system prompt|ignore (all |your )?(previous|prior) instructions/i,
  /\b(mission (is )?complete|you (have )?(completed|finished|passed) the mission|i('ve| have) (completed|passed) (the|your) mission)\b/i,
  /\b(fuck|shit|bitch|porn|sex|suicide|kill yourself|idiot|stupid)\b/i,
]

/** Removes markup but keeps the words. Pure and idempotent. */
export function stripMarkup(text: string): string {
  return (
    text
      // eslint-disable-next-line no-control-regex
      .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '')
      .replace(/```[\s\S]*?```/g, ' ')
      .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
      .replace(/<[^>]*>/g, '')
      .replace(/`/g, '')
      .replace(/^\s{0,3}(#{1,6}|>|[-*+])\s+/gm, '')
      .replace(/(\*\*|__|\*|~~)/g, '')
      .replace(/[ \t]+/g, ' ')
      .replace(/\s*\n\s*/g, ' ')
      .trim()
  )
}

/**
 * Checks ANY adapter output (local or remote) against the context it was given. Order: type, length, active markup,
 * strip markup, blocked content, numeric grounding. Over-long text is rejected, not truncated.
 */
export function validateTutorText(raw: unknown, context: TutorContext): ValidationResult {
  if (typeof raw !== 'string') return { ok: false, reason: 'schema' }
  if (raw.length > TUTOR_LIMITS.maxResponse) return { ok: false, reason: 'too_long' }
  if (ACTIVE_MARKUP.test(raw)) return { ok: false, reason: 'active_markup' }
  const text = stripMarkup(raw)
  if (text.length === 0) return { ok: false, reason: 'empty' }
  const checked = text.split(SAFETY_COPY).join(' ')
  if (BLOCKED.some(re => re.test(checked))) return { ok: false, reason: 'blocked' }
  if (NUMBER_WORD.test(checked) || ungroundedNumbers(text, context).length > 0) return { ok: false, reason: 'ungrounded' }
  return { ok: true, text }
}
