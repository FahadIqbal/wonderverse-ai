import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { circuitReducer, solveCircuit } from '../circuit'
import { MISSIONS } from './missions'
import { mission1 } from './mission1'
import { buildRecap, describeCounts } from './recap'
import { MissionRecap } from './session'
const closedLoop = ['battery-1-pos:switch-1-a', 'switch-1-b:lamp-1-a', 'lamp-1-b:battery-1-neg']
  .map(p => p.split(':'))
  .reduce((g, [a, b], i) => circuitReducer(g, { type: 'ADD_WIRE', wire: { id: `w${i}`, fromTerminalId: a, toTerminalId: b } }), mission1.setupGraph)
describe('buildRecap', () => {
  it('counts parts and wires from the graph and copies readings from the report', () => {
    const graph = circuitReducer(closedLoop, { type: 'TOGGLE_SWITCH', componentId: 'switch-1' })
    const report = solveCircuit(graph)
    const recap = buildRecap(graph, report, 2)
    expect(recap.counts).toEqual({ battery: 1, switch: 1, lamp: 1 })
    expect(recap.wires).toBe(3)
    expect(recap.hintsUsed).toBe(2)
    const lamp = recap.readings.find(r => r.label === 'Lamp 1')!
    const fromReport = report.componentResults.find(r => r.componentId === 'lamp-1')!
    expect(lamp).toEqual({ label: 'Lamp 1', voltage: fromReport.voltage, current: fromReport.current, energized: true })
    expect(MissionRecap.safeParse(recap).success).toBe(true)
  })
  it('reports an idle lamp as idle with zero readings when the switch was left open', () => {
    const recap = buildRecap(closedLoop, solveCircuit(closedLoop), 0)
    expect(recap.readings.find(r => r.label === 'Lamp 1')).toMatchObject({ voltage: 0, current: 0, energized: false })
  })
  it('clamps hints to 0..3', () => {
    fc.assert(fc.property(fc.integer({ min: -5, max: 50 }), n => {
      const h = buildRecap(closedLoop, solveCircuit(closedLoop), n).hintsUsed
      return h >= 0 && h <= 3
    }))
  })
  it('describeCounts uses plural forms and handles an empty bench', () => {
    expect(describeCounts({ counts: { battery: 1, lamp: 2, switch: 2 }, wires: 6 })).toBe('1 battery, 2 lamps, 2 switches, 6 wires')
    expect(describeCounts({ counts: {}, wires: 0 })).toBe('nothing yet')
  })
})
describe('authored misconceptions', () => {
  it('every mission names the idea its quiz addresses', () => {
    for (const m of MISSIONS) expect(m.quiz.misconception.length).toBeGreaterThan(10)
  })
})
