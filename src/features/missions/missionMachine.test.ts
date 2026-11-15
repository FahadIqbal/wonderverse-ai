import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { circuitReducer, solveCircuit, type CircuitGraph } from '../../domain/circuit'
import { mission1, type SemanticEvent } from '../../domain/learning'
import {
  canFinish,
  initialMissionState,
  missionReducer,
  unmetObjectiveTitles,
  type MissionContext,
  type MissionInput,
  type MissionState,
} from './missionMachine'

function graphWith(wireCount: number, closed: boolean): CircuitGraph {
  const loop = [
    ['battery-1-pos', 'switch-1-a'],
    ['switch-1-b', 'lamp-1-a'],
    ['lamp-1-b', 'battery-1-neg'],
  ]
  let g = mission1.setupGraph
  loop.slice(0, wireCount).forEach(([a, b], i) => {
    g = circuitReducer(g, { type: 'ADD_WIRE', wire: { id: `w${i}`, fromTerminalId: a, toTerminalId: b } })
  })
  return closed ? circuitReducer(g, { type: 'TOGGLE_SWITCH', componentId: 'switch-1' }) : g
}
const ctxFor = (g: CircuitGraph): MissionContext => ({ mission: mission1, graph: g, report: solveCircuit(g) })
const CTXS = [ctxFor(graphWith(0, false)), ctxFor(graphWith(3, false)), ctxFor(graphWith(3, true))]

const lit: SemanticEvent = { type: 'switch_toggled', componentId: 'switch-1', isOn: true, lampLit: true }
const dark: SemanticEvent = { type: 'switch_toggled', componentId: 'switch-1', isOn: false, lampLit: false }
const CORRECT = mission1.quiz.correctOptionId

function run(inputs: MissionInput[], ctx = CTXS[2]): MissionState {
  return inputs.reduce((s, i) => missionReducer(s, i, ctx), initialMissionState)
}
const toQuiz: MissionInput[] = [{ type: 'start' }, { type: 'record', event: lit }, { type: 'record', event: dark }]

describe('mission state machine', () => {
  it('moves briefing -> building on start, and ignores other inputs while in briefing', () => {
    expect(missionReducer(initialMissionState, { type: 'record', event: lit }, CTXS[2])).toBe(initialMissionState)
    expect(missionReducer(initialMissionState, { type: 'finish' }, CTXS[2])).toBe(initialMissionState)
    expect(run([{ type: 'start' }], CTXS[0]).phase).toBe('building')
  })

  it('moves to quiz only after both circuit objectives are achieved', () => {
    expect(run([{ type: 'start' }, { type: 'record', event: lit }]).phase).toBe('building')
    expect(run(toQuiz).phase).toBe('quiz')
  })

  it('latches achieved objectives even if the circuit later changes', () => {
    let s = run(toQuiz)
    expect(s.achieved).toContain('lamp-lit')
    s = missionReducer(s, { type: 'record', event: { type: 'wire_removed', wireId: 'w0' } }, CTXS[0])
    expect(s.achieved).toContain('lamp-lit')
  })

  it('rejects quiz answers before the quiz phase and unknown options', () => {
    const early = run([{ type: 'start' }, { type: 'answerQuiz', optionId: CORRECT }])
    expect(early.eventLog.some(e => e.type === 'quiz_answered')).toBe(false)
    const s = run([...toQuiz, { type: 'answerQuiz', optionId: 'bogus' }])
    expect(s.lastAnswer).toBeNull()
  })

  it('a wrong answer does not satisfy the guard; the correct one does', () => {
    const wrong = run([...toQuiz, { type: 'answerQuiz', optionId: 'used-all' }, { type: 'finish' }])
    expect(wrong.phase).toBe('quiz')
    expect(wrong.lastAnswer).toEqual({ optionId: 'used-all', correct: false })
    expect(unmetObjectiveTitles(wrong, mission1)).toEqual([mission1.objectives[2].title])
    const right = run([...toQuiz, { type: 'answerQuiz', optionId: 'used-all' }, { type: 'answerQuiz', optionId: CORRECT }])
    expect(canFinish(right, mission1)).toBe(true)
    expect(missionReducer(right, { type: 'finish' }, CTXS[2]).phase).toBe('complete')
  })

  it('finish is idempotent: completes exactly once', () => {
    const done = run([...toQuiz, { type: 'answerQuiz', optionId: CORRECT }, { type: 'finish' }, { type: 'finish' }, { type: 'finish' }])
    expect(done.phase).toBe('complete')
    expect(done.completions).toBe(1)
  })

  it('caps hints at the authored ladder length and logs each request', () => {
    const s = run([{ type: 'start' }, ...Array(5).fill({ type: 'requestHint' })], CTXS[0])
    expect(s.hintsShown).toBe(3)
    expect(s.eventLog.filter(e => e.type === 'hint_requested')).toHaveLength(3)
  })

  it('restart only works from complete and returns to the briefing', () => {
    expect(run([{ type: 'start' }, { type: 'restart' }], CTXS[0]).phase).toBe('building')
    const done = run([...toQuiz, { type: 'answerQuiz', optionId: CORRECT }, { type: 'finish' }])
    expect(missionReducer(done, { type: 'restart' }, CTXS[2])).toEqual(initialMissionState)
  })
})

const optionIds = [...mission1.quiz.options.map(o => o.id), 'bogus']
const inputArb: fc.Arbitrary<{ input: MissionInput; ctx: number }> = fc.record({
  ctx: fc.integer({ min: 0, max: 2 }),
  input: fc.oneof<fc.Arbitrary<MissionInput>[]>(
    fc.constant<MissionInput>({ type: 'start' }),
    fc.constant<MissionInput>({ type: 'finish' }),
    fc.constant<MissionInput>({ type: 'requestHint' }),
    fc.constantFrom(lit, dark, { type: 'wire_added', wireId: 'w9' } as SemanticEvent).map(event => ({ type: 'record' as const, event })),
    fc.constantFrom(...optionIds).map(optionId => ({ type: 'answerQuiz' as const, optionId })),
  ),
})

describe('completion guard properties', () => {
  /** **Validates: Requirements 6** (R6: advance once, only when circuit and learning objectives are met) */
  it('completes at most once, never without every objective, and never leaves complete', () => {
    fc.assert(
      fc.property(fc.array(inputArb, { maxLength: 60 }), steps => {
        let s = initialMissionState
        for (const { input, ctx } of steps) {
          const before = s
          s = missionReducer(s, input, CTXS[ctx])
          if (s.completions > 1) return false
          if (before.phase === 'complete' && s.phase !== 'complete') return false
          if (before.completions === 1 && s.completions !== 1) return false
        }
        if (s.phase === 'complete') {
          const answeredCorrect = s.eventLog.some(e => e.type === 'quiz_answered' && e.optionId === CORRECT)
          return s.completions === 1 && answeredCorrect && unmetObjectiveTitles(s, mission1).length === 0
        }
        return s.completions === 0
      }),
      { numRuns: 300 },
    )
  })
})
