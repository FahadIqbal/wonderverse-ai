import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { circuitReducer, isLampIlluminated, solveCircuit, SolverStatus, type CircuitGraph } from '../circuit'
import { createMissionEvaluator } from './evaluator'
import { diffGraphEvents } from './events'
import { Mission, type SemanticEvent } from './schemas'
import { getMission, isMissionUnlocked, MISSIONS, missionAvailability, nextMission } from './missions'
import { mission2 } from './mission2'
import { mission3 } from './mission3'
const wire = (g: CircuitGraph, id: string, from: string, to: string) =>
  circuitReducer(g, { type: 'ADD_WIRE', wire: { id, fromTerminalId: from, toTerminalId: to } })
const toggle = (g: CircuitGraph, id: string) => circuitReducer(g, { type: 'TOGGLE_SWITCH', componentId: id })
const wireAll = (g: CircuitGraph, pairs: [string, string][]) => pairs.reduce((acc, [a, b], i) => wire(acc, `w${i + 1}`, a, b), g)
/** Replays a sequence of graphs the way the mission bridge does: one diff per change. */
function logFor(...graphs: CircuitGraph[]): SemanticEvent[] {
  const log: SemanticEvent[] = []
  for (let i = 1; i < graphs.length; i++) log.push(...diffGraphEvents(graphs[i - 1], graphs[i]))
  return log
}
const evaluate = (mission: Mission, g: CircuitGraph, log: SemanticEvent[] = []) =>
  createMissionEvaluator(mission)(solveCircuit(g), g, log).objectives
const met = (objs: ReturnType<typeof evaluate>, id: string) => objs.find(o => o.id === id)!.met
describe('mission registry and unlocking', () => {
  it('has three authored, schema-valid missions with unique ids and a 3-level hint ladder', () => {
    expect(MISSIONS.map(m => m.id)).toEqual(['mission-1', 'mission-2', 'mission-3'])
    for (const m of MISSIONS) {
      expect(() => Mission.parse(m)).not.toThrow()
      expect(m.hints).toHaveLength(3)
      expect(m.objectives.some(o => o.category === 'circuit') && m.objectives.some(o => o.category === 'learning')).toBe(true)
    }
    expect(nextMission('mission-1')?.id).toBe('mission-2')
    expect(nextMission('mission-3')).toBeUndefined()
    expect(getMission('nope')).toBeUndefined()
  })
  it('unlocks mission N+1 only after mission N is completed', () => {
    expect(missionAvailability('mission-1', [])).toBe('unlocked')
    expect(missionAvailability('mission-2', [])).toBe('locked')
    expect(missionAvailability('mission-3', ['mission-1'])).toBe('locked')
    expect(missionAvailability('mission-2', ['mission-1'])).toBe('unlocked')
    expect(missionAvailability('mission-3', ['mission-1', 'mission-2'])).toBe('unlocked')
    expect(missionAvailability('mission-1', ['mission-1'])).toBe('completed')
    expect(isMissionUnlocked('unknown', ['mission-1'])).toBe(false)
  })
  it('property: a mission is open exactly when it is first or its predecessor is completed', () => {
    const ids = MISSIONS.map(m => m.id)
    fc.assert(
      fc.property(fc.subarray(ids), done => {
        MISSIONS.forEach((m, i) => {
          const open = isMissionUnlocked(m.id, done)
          expect(open).toBe(i === 0 || done.includes(ids[i - 1]) || done.includes(m.id))
        })
      }),
    )
  })
})
describe('mission 2: Fix the Fault', () => {
  const g0 = mission2.setupGraph
  const fixed = wire(g0, 'wire-3', 'lamp-1-b', 'battery-1-neg')
  it('starts as a seeded fault: no energized path, lamp dark (never random)', () => {
    const r = solveCircuit(g0)
    expect(r.status).toBe(SolverStatus.NO_PATH)
    expect(isLampIlluminated(r, 'lamp-1')).toBe(false)
    expect(g0.components.find(c => c.id === 'switch-1')?.isOn).toBe(true)
    expect(g0.wires).toHaveLength(2)
  })
  it('the return wire is the one missing edge: adding it lights the lamp', () => {
    expect(isLampIlluminated(solveCircuit(fixed), 'lamp-1')).toBe(true)
  })
  it('repair objective needs a dark-to-lit transition from the learner, not just a lit circuit', () => {
    expect(met(evaluate(mission2, g0, []), 'fault-repaired')).toBe(false)
    // A lit circuit with no recorded transition (e.g. a forged start) does not count.
    expect(met(evaluate(mission2, fixed, []), 'fault-repaired')).toBe(false)
    expect(met(evaluate(mission2, fixed, logFor(g0, fixed)), 'fault-repaired')).toBe(true)
  })
  it('unrelated edits or toggling the switch do not repair it', () => {
    const toggled = toggle(g0, 'switch-1')
    const back = toggle(toggled, 'switch-1')
    expect(met(evaluate(mission2, back, logFor(g0, toggled, back)), 'fault-repaired')).toBe(false)
  })
  it('only the authored correct diagnosis meets the learning objective; the docs distractor does not', () => {
    const ok: SemanticEvent = { type: 'quiz_answered', quizId: 'quiz-diagnosis', optionId: 'missing-return' }
    const bad: SemanticEvent = { type: 'quiz_answered', quizId: 'quiz-diagnosis', optionId: 'more-colors' }
    expect(met(evaluate(mission2, fixed, [bad]), 'concept-check')).toBe(false)
    expect(met(evaluate(mission2, fixed, [ok]), 'concept-check')).toBe(true)
    expect(mission2.quiz.options.find(o => o.id === 'more-colors')?.text).toBe('The bulb needs more colors.')
    for (const o of mission2.quiz.options) expect(o.explanation.length).toBeGreaterThan(20)
  })
})
describe('mission 3: Light the City', () => {
  const g0 = mission3.setupGraph
  const PARALLEL: [string, string][] = [
    ['battery-1-pos', 'switch-1-a'],
    ['battery-1-pos', 'switch-2-a'],
    ['switch-1-b', 'lamp-1-a'],
    ['switch-2-b', 'lamp-2-a'],
    ['lamp-1-b', 'battery-1-neg'],
    ['lamp-2-b', 'battery-1-neg'],
  ]
  const SERIES: [string, string][] = [
    ['battery-1-pos', 'switch-1-a'],
    ['switch-1-b', 'lamp-1-a'],
    ['lamp-1-b', 'lamp-2-a'],
    ['lamp-2-b', 'switch-2-a'],
    ['switch-2-b', 'battery-1-neg'],
  ]
  const parallel = wireAll(g0, PARALLEL)
  const series = wireAll(g0, SERIES)
  it('supplies two lamps and a switch per lamp, unwired, with the switches closed', () => {
    expect(g0.wires).toHaveLength(0)
    expect(g0.components.filter(c => c.type === 'lamp')).toHaveLength(2)
    expect(g0.components.filter(c => c.type === 'switch').every(c => c.isOn)).toBe(true)
    expect(solveCircuit(g0).status).not.toBe(SolverStatus.VALID)
  })
  it('both-lit needs every lamp energized in a valid report', () => {
    expect(met(evaluate(mission3, g0), 'both-lit')).toBe(false)
    expect(met(evaluate(mission3, parallel), 'both-lit')).toBe(true)
    expect(met(evaluate(mission3, series), 'both-lit')).toBe(true) // series also lights both: the contrast case
    const oneBranch = wireAll(g0, PARALLEL.filter(([, b]) => !b.startsWith('lamp-2') && !b.startsWith('switch-2')))
    expect(met(evaluate(mission3, oneBranch), 'both-lit')).toBe(false)
  })
  it('parallel: opening one branch leaves the other lit (solver truth), and the objective is met', () => {
    const opened = toggle(parallel, 'switch-1')
    const r = solveCircuit(opened)
    expect(isLampIlluminated(r, 'lamp-1')).toBe(false)
    expect(isLampIlluminated(r, 'lamp-2')).toBe(true)
    expect(met(evaluate(mission3, opened, logFor(parallel, opened)), 'branch-off')).toBe(true)
  })
  it('series contrast: opening either switch darkens both lamps, so branch-off is not met and the detail says why', () => {
    const opened = toggle(series, 'switch-1')
    const r = solveCircuit(opened)
    expect(isLampIlluminated(r, 'lamp-1') || isLampIlluminated(r, 'lamp-2')).toBe(false)
    const objs = evaluate(mission3, opened, logFor(series, opened))
    expect(met(objs, 'branch-off')).toBe(false)
    expect(objs.find(o => o.id === 'branch-off')!.detail).toMatch(/every lamp/)
  })
  it('cannot be satisfied by a dangling second lamp (needs two lamps lit before the toggle)', () => {
    const lamp1Only = wireAll(g0, [
      ['battery-1-pos', 'switch-1-a'],
      ['switch-1-b', 'lamp-1-a'],
      ['lamp-1-b', 'switch-2-a'],
      ['switch-2-b', 'battery-1-neg'],
    ])
    const opened = toggle(lamp1Only, 'switch-2')
    expect(met(evaluate(mission3, opened, logFor(lamp1Only, opened)), 'branch-off')).toBe(false)
  })
  it('closing a switch again, or a log from before litBefore existed, does not meet branch-off', () => {
    const opened = toggle(parallel, 'switch-1')
    const closed = toggle(opened, 'switch-1')
    expect(met(evaluate(mission3, closed, logFor(opened, closed)), 'branch-off')).toBe(false)
    const legacy: SemanticEvent = { type: 'switch_toggled', componentId: 'switch-1', isOn: false, lampLit: true }
    expect(met(evaluate(mission3, opened, [legacy]), 'branch-off')).toBe(false)
  })
  it('the correct quiz answer explains separate branches; the series option is explained as a misconception', () => {
    const ok: SemanticEvent = { type: 'quiz_answered', quizId: 'quiz-branches', optionId: 'separate-branches' }
    expect(met(evaluate(mission3, parallel, [ok]), 'concept-check')).toBe(true)
    const series = mission3.quiz.options.find(o => o.id === 'single-loop')!
    expect(series.explanation).toMatch(/series/)
    const wrong: SemanticEvent = { type: 'quiz_answered', quizId: 'quiz-branches', optionId: 'single-loop' }
    expect(met(evaluate(mission3, parallel, [wrong]), 'concept-check')).toBe(false)
  })
  it('property: toggling either branch switch in the parallel build leaves the other lamp lit', () => {
    fc.assert(
      fc.property(fc.constantFrom('switch-1', 'switch-2'), sw => {
        const r = solveCircuit(toggle(parallel, sw))
        const other = sw === 'switch-1' ? 'lamp-2' : 'lamp-1'
        const own = sw === 'switch-1' ? 'lamp-1' : 'lamp-2'
        expect(isLampIlluminated(r, other)).toBe(true)
        expect(isLampIlluminated(r, own)).toBe(false)
      }),
    )
  })
})
