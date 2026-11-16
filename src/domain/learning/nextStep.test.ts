import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import {
  CircuitFixtures,
  circuitReducer,
  createEmptyGraph,
  isLampIlluminated,
  ReasonCode,
  solveCircuit,
  SolverStatus,
  type CircuitComponent,
  type CircuitGraph,
  type SimulationReport,
} from '../circuit'
import { mission1 } from './mission1'
import { mission2 } from './mission2'
import { mission3 } from './mission3'
import { nextStep, type NextStepMissionState } from './nextStep'
const building = (missionId = 'mission-1', achieved: string[] = []): NextStepMissionState => ({ phase: 'building', missionId, achieved, lastAnswer: null })
const step = (g: CircuitGraph, m = building()) => nextStep(solveCircuit(g), g, m)
const wire = (g: CircuitGraph, a: string, b: string) => circuitReducer(g, { type: 'ADD_WIRE', wire: { id: `w-${g.wires.length + 1}`, fromTerminalId: a, toTerminalId: b } })
const loop = (g: CircuitGraph) => [['battery-1-pos', 'switch-1-a'], ['switch-1-b', 'lamp-1-a'], ['lamp-1-b', 'battery-1-neg']].reduce((acc, [a, b]) => wire(acc, a, b), g)
const syntheticReport = (status: SolverStatus, reason: ReasonCode): SimulationReport => ({ status, reason, batteryVoltage: 3, componentResults: [], totalCurrent: 0, totalPower: 0, timestamp: 0 })
describe('nextStep by solver status and reason', () => {
  it('NO_BATTERY: empty bench asks for a battery', () => {
    const g = createEmptyGraph()
    expect(nextStep(solveCircuit(g), g, building()).id).toBe('add-battery')
  })
  it('NO_BATTERY: a battery with no voltage is called unusable', () => {
    const g = { ...mission1.setupGraph, components: mission1.setupGraph.components.map(c => (c.type === 'battery' ? { ...c, voltage: 0 } : c)) }
    expect(step(g).id).toBe('battery-unusable')
  })
  it('NO_PATH on the unwired mission 1 bench (switch starts open, but closing it would not complete a loop) names a loose battery terminal', () => {
    const out = step(mission1.setupGraph)
    expect(solveCircuit(mission1.setupGraph).reason).toBe(ReasonCode.SWITCH_OFF)
    expect(out.id).toBe('loose-terminal')
    expect(out.text).toContain('Battery 1 + (positive) is not connected to anything')
  })
  it('NO_PATH / NO_ENERGIZED_PATH on mission 2 names the battery terminal that has no wire', () => {
    const out = step(mission2.setupGraph, building('mission-2'))
    expect(out.id).toBe('loose-terminal')
    expect(solveCircuit(mission2.setupGraph).reason).toBe(ReasonCode.NO_ENERGIZED_PATH)
    expect(out.text).toContain('Battery 1 − (negative) is not connected to anything')
  })
  it('NO_PATH / SWITCH_OFF with a complete loop says the switch is open', () => {
    const g = loop(mission1.setupGraph)
    expect(solveCircuit(g).reason).toBe(ReasonCode.SWITCH_OFF)
    const out = step(g)
    expect(out.id).toBe('close-switch')
    expect(out.text).toContain('The loop is complete but Switch 1 is open')
  })
  it('NO_PATH / SWITCH_OFF with a missing wire does not claim the loop is complete', () => {
    const g = wire(mission1.setupGraph, 'battery-1-pos', 'switch-1-a')
    expect(solveCircuit(g).reason).toBe(ReasonCode.SWITCH_OFF)
    const out = step(g)
    expect(out.id).toBe('loose-terminal')
    expect(out.text).not.toMatch(/loop is complete/)
  })
  it('NO_PATH with no load asks for a lamp', () => {
    const g = wire(wire({ ...mission1.setupGraph, components: mission1.setupGraph.components.filter(c => c.type !== 'lamp') }, 'battery-1-pos', 'switch-1-a'), 'switch-1-b', 'battery-1-neg')
    expect(['add-load', 'loose-terminal', 'short']).toContain(step(g).id)
    const lonely = { ...mission1.setupGraph, components: mission1.setupGraph.components.filter(c => c.type === 'battery') }
    expect(step(lonely).id).toBe('add-load')
  })
  it('SHORT_CIRCUIT explains the bypass', () => {
    const closedSwitch = circuitReducer(mission1.setupGraph, { type: 'TOGGLE_SWITCH', componentId: 'switch-1' })
    const g = wire(wire(closedSwitch, 'battery-1-pos', 'switch-1-a'), 'switch-1-b', 'battery-1-neg')
    expect(solveCircuit(g).status).toBe(SolverStatus.SHORT_CIRCUIT)
    expect(step(g).id).toBe('short')
  })
  it('OPEN_CIRCUIT (battery with no usable terminals) falls back to wiring guidance', () => {
    const g: CircuitGraph = {
      components: [{ id: 'b', type: 'battery', voltage: 3, isOn: true, terminals: [{ id: 'b-x', name: 'left', position: { x: 0, y: 0 } }] }],
      wires: [],
    }
    expect(solveCircuit(g).status).toBe(SolverStatus.OPEN_CIRCUIT)
    expect(step(g).id).toBe('add-load')
  })
  it('UNSUPPORTED_TOPOLOGY: two batteries (MULTIPLE_PATHS) and an unsolvable report (UNKNOWN)', () => {
    const two: CircuitGraph = { ...mission1.setupGraph, components: [...mission1.setupGraph.components, { ...mission1.setupGraph.components[0], id: 'battery-2', terminals: [{ id: 'b2-p', name: 'positive', position: { x: 0, y: 0 } }, { id: 'b2-n', name: 'negative', position: { x: 1, y: 0 } }] }] }
    expect(solveCircuit(two).reason).toBe(ReasonCode.MULTIPLE_PATHS)
    expect(step(two).id).toBe('extra-battery')
    expect(nextStep(syntheticReport(SolverStatus.UNSUPPORTED_TOPOLOGY, ReasonCode.UNKNOWN), mission1.setupGraph, building()).id).toBe('unsolvable')
  })
  it('VALID: lit lamp in mission 1 before the switch comparison suggests toggling the switch', () => {
    const g = circuitReducer(loop(mission1.setupGraph), { type: 'TOGGLE_SWITCH', componentId: 'switch-1' })
    expect(solveCircuit(g).status).toBe(SolverStatus.VALID)
    const out = step(g)
    expect(out.id).toBe('toggle-switch')
    expect(out.text).toContain('Lamp 1 is lit')
  })
  it('VALID without any lamp, and VALID where the lamp is dark', () => {
    expect(step(CircuitFixtures.simpleSeries as CircuitGraph).text).toContain('Lamp is lit')
    const noLamp = { ...CircuitFixtures.simpleSeries, components: [CircuitFixtures.simpleSeries.components[0], { id: 'r', type: 'resistor' as const, isOn: false, resistance: 10, terminals: [{ id: 'r-a', name: 'a', position: { x: 0, y: 0 } }, { id: 'r-b', name: 'b', position: { x: 1, y: 0 } }] }], wires: [{ id: 'w1', fromTerminalId: 'battery-1-pos', toTerminalId: 'r-a' }, { id: 'w2', fromTerminalId: 'r-b', toTerminalId: 'battery-1-neg' }] } as CircuitGraph
    expect(step(noLamp).id).toBe('valid-no-lamp')
    const darkLamp = { ...noLamp, components: [...noLamp.components, { ...CircuitFixtures.simpleSeries.components[1], id: 'lamp-9', terminals: [{ id: 'l9-a', name: 'a', position: { x: 0, y: 0 } }, { id: 'l9-b', name: 'b', position: { x: 1, y: 0 } }] }] } as CircuitGraph
    const out = step(darkLamp)
    expect(out.id).toBe('valid-lamp-dark')
    expect(out.text).toContain('is not lit')
  })
  it('VALID with one lamp dark only because a switch is open blames the open switch', () => {
    const one = [['battery-1-pos', 'switch-1-a'], ['switch-1-b', 'lamp-1-a'], ['lamp-1-b', 'battery-1-neg'], ['battery-1-pos', 'switch-2-a'], ['switch-2-b', 'lamp-2-a'], ['lamp-2-b', 'battery-1-neg']].reduce((acc, [a, b]) => wire(acc, a, b), mission3.setupGraph)
    const opened = circuitReducer(one, { type: 'TOGGLE_SWITCH', componentId: 'switch-2' })
    const out = step(opened, building('mission-3', ['both-lit']))
    expect(out.id).toBe('open-switch-dark')
    expect(out.text).toContain('Lamp 2 is not lit while Switch 2 is open')
  })
  it('mission 3: one lit lamp asks for a second branch, then suggests opening a switch', () => {
    const m3 = (g: CircuitGraph) => step(g, building('mission-3'))
    const one = [['battery-1-pos', 'switch-1-a'], ['switch-1-b', 'lamp-1-a'], ['lamp-1-b', 'battery-1-neg']].reduce((acc, [a, b]) => wire(acc, a, b), mission3.setupGraph)
    const closed = one // mission 3 switches start closed
    expect(m3(closed).id).toBe('second-lamp-dark')
    const both = [['battery-1-pos', 'switch-2-a'], ['switch-2-b', 'lamp-2-a'], ['lamp-2-b', 'battery-1-neg']].reduce((acc, [a, b]) => wire(acc, a, b), closed)
    const bothOn = both
    expect(m3(bothOn).id).toBe('try-branch')
    expect(m3(bothOn).text).toContain('Both lamps are lit')
  })
})
describe('nextStep by mission phase', () => {
  const g = loop(mission1.setupGraph)
  const r = solveCircuit(g)
  it.each([
    ['briefing', null, 'briefing'],
    ['complete', null, 'complete'],
    ['quiz', null, 'quiz-answer'],
    ['quiz', { correct: false }, 'quiz-retry'],
    ['quiz', { correct: true }, 'finish'],
  ] as const)('%s with answer %j gives %s', (phase, lastAnswer, id) => {
    expect(nextStep(r, g, { phase, missionId: 'mission-1', achieved: [], lastAnswer }).id).toBe(id)
  })
})
describe('property: guidance never claims a lamp is lit when the report says it is not', () => {
  const claimsLit = (text: string) => /\blit\b|\bglow(s|ing)?\b|\blights up\b/i.test(text.replace(/\bnot lit\b/gi, ''))
  const component = (i: number, kind: 'lamp' | 'switch' | 'resistor' | 'wire', on: boolean): CircuitComponent => ({
    id: `${kind}-${i}`,
    type: kind,
    label: `${kind} ${i}`,
    isOn: on,
    ...(kind === 'lamp' || kind === 'resistor' ? { resistance: 6 } : {}),
    terminals: [{ id: `${kind}-${i}-a`, name: 'left', position: { x: 0, y: 0 } }, { id: `${kind}-${i}-b`, name: 'right', position: { x: 1, y: 0 } }],
  })
  const battery: CircuitComponent = { id: 'battery-1', type: 'battery', label: 'Battery 1', voltage: 3, isOn: true, terminals: [{ id: 'battery-1-pos', name: 'positive', position: { x: 0, y: 0 } }, { id: 'battery-1-neg', name: 'negative', position: { x: 1, y: 0 } }] }
  const graphArb = fc
    .record({
      withBattery: fc.boolean(),
      parts: fc.array(fc.record({ kind: fc.constantFrom('lamp', 'switch', 'resistor', 'wire'), on: fc.boolean() }), { maxLength: 5 }),
      wireSeeds: fc.array(fc.tuple(fc.nat(), fc.nat()), { maxLength: 10 }),
    })
    .map(({ withBattery, parts, wireSeeds }): CircuitGraph => {
      const components = [...(withBattery ? [battery] : []), ...parts.map((p, i) => component(i, p.kind, p.on))]
      const terminals = components.flatMap(c => c.terminals.map(t => t.id))
      const wires = terminals.length < 2 ? [] : wireSeeds.map(([a, b], i) => ({ id: `w${i}`, fromTerminalId: terminals[a % terminals.length], toTerminalId: terminals[b % terminals.length] })).filter(w => w.fromTerminalId !== w.toTerminalId)
      return { components, wires }
    })
  const stateArb = fc.record({
    phase: fc.constantFrom('building' as const, 'quiz' as const, 'briefing' as const, 'complete' as const),
    missionId: fc.constantFrom('mission-1', 'mission-2', 'mission-3'),
    achieved: fc.subarray(['lamp-lit', 'switch-compare', 'both-lit', 'branch-off', 'fault-repaired', 'concept-check']),
    lastAnswer: fc.constantFrom(null, { correct: true }, { correct: false }),
  })
  it('holds for random graphs, switch states and mission progress', () => {
    fc.assert(
      fc.property(graphArb, stateArb, (g, m) => {
        const report = solveCircuit(g)
        const anyLit = g.components.some(c => c.type === 'lamp' && isLampIlluminated(report, c.id)) && report.status === SolverStatus.VALID
        const out = nextStep(report, g, m)
        expect(out.text.length).toBeGreaterThan(0)
        if (!anyLit) expect(claimsLit(out.text), `${out.id}: ${out.text}`).toBe(false)
      }),
      { numRuns: 500 },
    )
  })
})
