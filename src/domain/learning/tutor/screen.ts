import { TUTOR_LIMITS } from './schemas'

/** Shown for every refused real-world electrical request, and exempt from the blocked-content check. */
export const SAFETY_COPY = 'This is a simplified simulation. Never experiment with wall power or real electrical outlets.'

export type QuestionScreen = 'ok' | 'unsafe' | 'injection' | 'offtopic'

const UNSAFE =
  /\b(mains|outlets?|sockets?|wall (power|plug|socket)|household|house wiring|fuse ?box|breaker|power ?lines?|high[- ]voltage|live wires?|(110|115|120|220|230|240) ?v(olts?)?|electrocute|electric chair|shock (me|myself|someone|him|her|them)|plug (it )?in|lick|tongue|mouth|swallow)\b/i
const INJECTION =
  /(ignore|disregard|forget|override).{0,40}(instruction|rule|previous|above|prompt)|system prompt|you are now|pretend (to be|you)|jailbreak|developer mode|reveal.{0,20}prompt|act as/i
const ON_TOPIC =
  /\b(circuits?|batter(y|ies)|lamps?|bulbs?|lights?|lit|switch(es)?|wires?|cables?|current|volts?|voltage|resist\w*|series|parallel|loop|paths?|routes?|hints?|help|stuck|missions?|fix|connect\w*|terminals?|ports?|energi[sz]\w*|glow\w*|dark|dim|bright|open|closed?|short|diagnostic|report|work(s|ing)?|next|branch(es)?)\b/i

/** Collapses whitespace, strips control characters and enforces the length bound. Pure. */
export function normalizeQuestion(q: string | undefined): string | undefined {
  if (q === undefined) return undefined
  // eslint-disable-next-line no-control-regex
  const cleaned = q.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, TUTOR_LIMITS.maxQuestion)
  return cleaned.length > 0 ? cleaned : undefined
}

/** Classifies a learner question before any adapter sees it. Real-world electrical requests never reach a model. */
export function screenQuestion(q: string | undefined): QuestionScreen {
  const text = normalizeQuestion(q)
  if (text === undefined) return 'ok'
  if (UNSAFE.test(text)) return 'unsafe'
  if (INJECTION.test(text)) return 'injection'
  return ON_TOPIC.test(text) ? 'ok' : 'offtopic'
}

export const REDIRECT_TEXT: Record<Exclude<QuestionScreen, 'ok'>, string> = {
  unsafe: `${SAFETY_COPY} I can only help with the battery circuits in this lab. For real electricity, ask a teacher or a grown-up.`,
  injection: "I can't change my rules or the circuit. I can still help with your lamp, switch and wires. Ask me about them, or press the hint button.",
  offtopic: 'I can only help with the circuit in this lab. Ask about the battery, lamp, switch or wires, or press the hint button.',
}
