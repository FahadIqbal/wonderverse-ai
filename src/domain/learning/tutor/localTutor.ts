import { SolverStatus } from '../../circuit'
import { REDIRECT_TEXT, screenQuestion } from './screen'
import { TUTOR_LIMITS, type TutorAdapter, type TutorContext, type TutorResponse } from './schemas'

/** Same rounding as the context builder, so a quoted value is always a value found in the context. */
export const formatNumber = (n: number) => String(Math.round(n * 1000) / 1000)

type Lamp = TutorContext['lamps'][number]

function lampSentence(lamps: readonly Lamp[], totalCurrent: number): string {
  if (lamps.length === 0) return `The circuit report says the loop is complete and ${formatNumber(totalCurrent)} A is flowing.`
  const lit = lamps.filter(l => l.energized)
  const dark = lamps.filter(l => !l.energized)
  if (dark.length === 0) {
    if (lit.length === 1) return `The circuit report says ${lit[0].label} is lit, with ${formatNumber(lit[0].current)} A flowing through it.`
    return `The circuit report says all ${lit.length} lamps are lit. The battery supplies ${formatNumber(totalCurrent)} A in total.`
  }
  if (lit.length === 0) return 'The circuit report says the loop is complete, but no lamp is lit.'
  return `The circuit report says ${lit.map(l => l.label).join(' and ')} lit and ${dark.map(l => l.label).join(' and ')} dark.`
}

/** What the solver report says, in plain words. Quotes only values present in the context. */
export function observation(c: TutorContext): string {
  switch (c.solver.status) {
    case SolverStatus.VALID:
      return lampSentence(c.lamps, c.solver.totalCurrent)
    case SolverStatus.NO_BATTERY:
      return 'The circuit report says there is no battery on the bench yet, so no current flows.'
    case SolverStatus.OPEN_CIRCUIT:
      return 'The circuit report says the loop is incomplete, so no current flows.'
    case SolverStatus.NO_PATH:
      return c.solver.reasonCode === 'SWITCH_OFF'
        ? 'The circuit report says a switch is open, so no current flows and the lamp stays dark.'
        : 'The circuit report says there is no complete route from the battery through the lamp and back, so no current flows.'
    case SolverStatus.SHORT_CIRCUIT:
      return 'The circuit report says current has found a path that skips the bulb, so the lamp stays dark.'
    case SolverStatus.UNSUPPORTED_TOPOLOGY:
      return "The simplified model can't work out this layout, so I can't say what the lamps will do."
  }
}

/** One guiding question per solver outcome (docs/05 deterministic fallback). */
export function guidingQuestion(c: TutorContext): string {
  switch (c.solver.status) {
    case SolverStatus.VALID:
      return 'Which parts is the current passing through, and what happens if you change a switch?'
    case SolverStatus.NO_BATTERY:
      return 'Which part gives the circuit its push?'
    case SolverStatus.OPEN_CIRCUIT:
      return 'Trace a route from one battery terminal back to the other. Where does it break?'
    case SolverStatus.NO_PATH:
      return c.solver.reasonCode === 'SWITCH_OFF'
        ? 'What would happen to the path if you closed the switch?'
        : 'Trace a route from one battery terminal back to the other. Where does it stop?'
    case SolverStatus.SHORT_CIRCUIT:
      return 'Can you find the wire that skips the bulb?'
    case SolverStatus.UNSUPPORTED_TOPOLOGY:
      return 'Can you take a wire away to make the layout simpler?'
  }
}

/** Pure, deterministic text for one context and an already screened question. */
export function composeHint(c: TutorContext): string {
  if (c.phase === 'complete') return 'This mission is finished. You can replay it, or go back to the mission map.'
  const allDone = c.objectives.length > 0 && c.objectives.every(o => o.met)
  if (allDone) return `${observation(c)} Every objective is done. Press Finish mission when you are ready.`
  const level = Math.max(c.hintLevel, 1)
  const head = observation(c)
  if (level === 1) return `${head} ${guidingQuestion(c)}${c.authoredHint ? ` ${c.authoredHint}` : ''}`
  if (c.authoredHint) return `${head} ${c.authoredHint}${level === 3 ? ' Try it, then check the diagnostic.' : ''}`
  return `${head} ${guidingQuestion(c)}`
}

/** Offline, deterministic tutor. Needs no network, key or model. */
export const localTutor: TutorAdapter = {
  id: 'local',
  getHint(context: Readonly<TutorContext>, learnerQuestion?: string): Promise<TutorResponse> {
    const screen = screenQuestion(learnerQuestion)
    if (screen !== 'ok') return Promise.resolve({ text: REDIRECT_TEXT[screen], kind: 'redirect', source: 'local' })
    const text = composeHint(context)
    return Promise.resolve({ text: text.length <= TUTOR_LIMITS.maxResponse ? text : `${text.slice(0, TUTOR_LIMITS.maxResponse - 1)}…`, kind: 'hint', source: 'local' })
  },
}
