import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { CircuitFixtures } from './fixtures'
import { readMeter } from './meter'
import { solveCircuit } from './dcSolver'
import type { CircuitGraph } from './types'
const series = CircuitFixtures.simpleSeries as CircuitGraph
describe('readMeter', () => {
  it('copies voltage and current for a part straight from the report', () => {
    const report = solveCircuit(series)
    const lamp = report.componentResults.find(r => r.componentId === 'lamp-1')!
    const reading = readMeter(report, series, 'lamp-1')!
    expect(reading).toMatchObject({ label: 'Lamp', voltage: lamp.voltage, current: lamp.current, energized: true, note: '' })
    expect(reading.voltage).toBeCloseTo(9, 6)
    expect(reading.current).toBeCloseTo(0.09, 6)
  })
  it('reads the battery too', () => {
    const report = solveCircuit(series)
    expect(readMeter(report, series, 'battery-1')).toMatchObject({ voltage: 9, energized: true })
  })
  it('explains zero readings when the circuit is not working', () => {
    const open = { ...series, wires: series.wires.slice(0, 1) }
    const reading = readMeter(solveCircuit(open), open, 'lamp-1')!
    expect(reading).toMatchObject({ voltage: 0, current: 0, energized: false })
    expect(reading.note).toContain('no working circuit')
  })
  it('returns null for an unknown component', () => {
    expect(readMeter(solveCircuit(series), series, 'ghost')).toBeNull()
  })
  it('property: the reading is always identical to the report entry', () => {
    fc.assert(
      fc.property(fc.subarray(series.wires, { minLength: 0 }), wires => {
        const g = { ...series, wires }
        const report = solveCircuit(g)
        for (const c of g.components) {
          const r = report.componentResults.find(x => x.componentId === c.id)
          const m = readMeter(report, g, c.id)!
          expect([m.voltage, m.current, m.energized]).toEqual([r?.voltage ?? 0, r?.current ?? 0, r?.isEnergized ?? false])
        }
      }),
    )
  })
})
