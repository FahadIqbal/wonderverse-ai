import { describe, expect, it } from 'vitest'
import { circuitReducer, solveCircuit, type CircuitGraph } from '../circuit'
import { createMissionEvaluator } from './evaluator'
import { diffGraphEvents } from './events'
import { mission1 } from './mission1'
import { Mission, type SemanticEvent } from './schemas'

const evaluator = createMissionEvaluator(mission1)

function wired(pairs: [string, string][], switchClosed: boolean): CircuitGraph {
  let g = mission1.setupGraph
  pairs.forEach(([a, b], i) => {
    g = circuitReducer(g, { type: 'ADD_WIRE', wire: { id: `w${i}`, fromTerminalId: a, toTerminalId: b } })
  })
  if (switchClosed) g = circuitReducer(g, { type: 'TOGGLE_SWITCH', componentId: 'switch-1' })
  return g
}

const LOOP: [string, string][] = [
  ['battery-1-pos', 'switch-1-a'],
  ['switch-1-b', 'lamp-1-a'],
  ['lamp-1-b', 'battery-1-neg'],
]
const evalGraph = (g: CircuitGraph, log: SemanticEvent[] = []) => evaluator(solveCircuit(g), g, log)
const status = (e: ReturnType<typeof evalGraph>, id: string) => e.objectives.find(o => o.id === id)!

describe('mission 1 definition', () => {
  it('passes the Mission schema and uses the authored three-level hint ladder', () => {
    expect(() => Mission.parse(mission1)).not.toThrow()
    expect(mission1.hints).toEqual([
      'Find the path.',
      'Every circuit needs a return route.',
      'Trace battery + → switch → bulb → battery -.',
    ])
  })

  it('rejects a mission whose correct option does not exist', () => {
    const bad = { ...mission1, quiz: { ...mission1.quiz, correctOptionId: 'nope' } }
    expect(Mission.safeParse(bad).success).toBe(false)
  })

  it('starts with parts placed, unwired, and the switch open', () => {
    expect(mission1.setupGraph.wires).toHaveLength(0)
    expect(mission1.setupGraph.components.find(c => c.id === 'switch-1')?.isOn).toBe(false)
  })
})

describe('MissionEvaluator', () => {
  it('open loop (nothing wired): lamp objective not met', () => {
    expect(status(evalGraph(mission1.setupGraph), 'lamp-lit').met).toBe(false)
  })

  it('dangling battery-to-lamp wire only: not met', () => {
    expect(status(evalGraph(wired([LOOP[0]], true)), 'lamp-lit').met).toBe(false)
  })

  it('complete loop with the switch open: not met', () => {
    expect(status(evalGraph(wired(LOOP, false)), 'lamp-lit').met).toBe(false)
  })

  it('complete loop with the switch closed: met', () => {
    expect(status(evalGraph(wired(LOOP, true)), 'lamp-lit').met).toBe(true)
  })

  it('switch objective needs both a lit and a dark observation', () => {
    const g = wired(LOOP, true)
    const lit: SemanticEvent = { type: 'switch_toggled', componentId: 'switch-1', isOn: true, lampLit: true }
    const dark: SemanticEvent = { type: 'switch_toggled', componentId: 'switch-1', isOn: false, lampLit: false }
    expect(status(evalGraph(g, []), 'switch-compare').met).toBe(false)
    expect(status(evalGraph(g, [lit]), 'switch-compare').met).toBe(false)
    expect(status(evalGraph(g, [lit, dark]), 'switch-compare').met).toBe(true)
  })

  it('quiz objective is met only by the authored correct option', () => {
    const g = mission1.setupGraph
    const answer = (optionId: string): SemanticEvent => ({ type: 'quiz_answered', quizId: mission1.quiz.id, optionId })
    expect(status(evalGraph(g, [answer('used-all')]), 'concept-check').met).toBe(false)
    expect(status(evalGraph(g, [answer('interrupted-path')]), 'concept-check').met).toBe(true)
  })
})

describe('diffGraphEvents', () => {
  it('reports wire additions and a switch toggle with the solver-derived lamp state', () => {
    const open = wired(LOOP, false)
    const closed = circuitReducer(open, { type: 'TOGGLE_SWITCH', componentId: 'switch-1' })
    expect(diffGraphEvents(mission1.setupGraph, wired([LOOP[0]], false))).toEqual([{ type: 'wire_added', wireId: 'w0' }])
    expect(diffGraphEvents(open, closed)).toEqual([
      {
        type: 'switch_toggled',
        componentId: 'switch-1',
        isOn: true,
        lampLit: true,
        litBefore: [],
        litAfter: ['lamp-1'],
      },
      { type: 'lamp_state_changed', litBefore: [], litAfter: ['lamp-1'] },
    ])
    expect(diffGraphEvents(closed, open)).toEqual([
      {
        type: 'switch_toggled',
        componentId: 'switch-1',
        isOn: false,
        lampLit: false,
        litBefore: ['lamp-1'],
        litAfter: [],
      },
      { type: 'lamp_state_changed', litBefore: ['lamp-1'], litAfter: [] },
    ])
  })
})
