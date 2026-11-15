import { describe, it, expect } from 'vitest'
import { solveCircuit, isLampIlluminated, SolverStatus, ReasonCode } from './dcSolver'
import { CircuitGraph, CircuitAction } from './types'
import { CircuitFixtures } from './fixtures'
import { circuitReducer, createEmptyGraph } from './circuitReducer'

describe('dcSolver', () => {
  describe('simple series circuit', () => {
    it('should solve simple series circuit correctly', () => {
      let graph = createEmptyGraph()
      const action: CircuitAction = {
        type: 'LOAD_CIRCUIT',
        graph: CircuitFixtures.simpleSeries
      }
      graph = circuitReducer(graph, action)

      const report = solveCircuit(graph)

      expect(report.status).toBe(SolverStatus.VALID)
      expect(report.batteryVoltage).toBe(9)
      expect(report.totalCurrent).toBeGreaterThan(0)
      expect(report.totalPower).toBeGreaterThan(0)
    })

    it('should mark lamp as energized in series circuit', () => {
      let graph = createEmptyGraph()
      const action: CircuitAction = {
        type: 'LOAD_CIRCUIT',
        graph: CircuitFixtures.simpleSeries
      }
      graph = circuitReducer(graph, action)

      const report = solveCircuit(graph)

      const lampResult = report.componentResults.find(r => r.componentId === 'lamp-1')
      expect(lampResult?.isEnergized).toBe(true)
      expect(isLampIlluminated(report, 'lamp-1')).toBe(true)
    })

    it('should calculate correct voltage division', () => {
      let graph = createEmptyGraph()
      const action: CircuitAction = {
        type: 'LOAD_CIRCUIT',
        graph: CircuitFixtures.simpleSeries
      }
      graph = circuitReducer(graph, action)

      const report = solveCircuit(graph)

      const lampResult = report.componentResults.find(r => r.componentId === 'lamp-1')
      expect(lampResult?.voltage).toBeGreaterThan(0)
      expect(lampResult?.current).toBeGreaterThan(0)
    })
  })

  describe('open circuit', () => {
    it('should detect open circuit (incomplete loop)', () => {
      let graph = createEmptyGraph()
      const action: CircuitAction = {
        type: 'LOAD_CIRCUIT',
        graph: CircuitFixtures.openCircuit
      }
      graph = circuitReducer(graph, action)

      const report = solveCircuit(graph)

      // An open circuit has no complete path, so no current flows
      // The lamp might show as having a path internally but externally incomplete
      // In our implementation, it correctly returns NO_PATH
      expect(report.totalCurrent).toBe(0)
      const lampResult = report.componentResults.find(r => r.componentId === 'lamp-1')
      expect(lampResult?.isEnergized).toBe(false)
    })

    it('should return appropriate status for open circuit', () => {
      let graph = createEmptyGraph()
      const action: CircuitAction = {
        type: 'LOAD_CIRCUIT',
        graph: CircuitFixtures.openCircuit
      }
      graph = circuitReducer(graph, action)

      const report = solveCircuit(graph)

      // Circuit is incomplete - missing return wire
      expect(report.status).toBe(SolverStatus.NO_PATH)
      expect(report.reason).toBe(ReasonCode.NO_ENERGIZED_PATH)
    })
  })

  describe('empty circuit', () => {
    it('should handle empty circuit', () => {
      const graph = createEmptyGraph()
      const report = solveCircuit(graph)

      expect(report.status).toBe(SolverStatus.NO_BATTERY)
      expect(report.reason).toBe(ReasonCode.NO_SOURCE)
      expect(report.totalCurrent).toBe(0)
      expect(report.componentResults).toHaveLength(0)
    })
  })

  describe('battery short protection', () => {
    it('should detect direct battery short', () => {
      const graph: CircuitGraph = {
        components: [
          {
            id: 'battery-1',
            type: 'battery',
            voltage: 9,
            isOn: true,
            terminals: [
              { id: 'bat-pos', name: 'positive', position: { x: 0, y: 0 } },
              { id: 'bat-neg', name: 'negative', position: { x: 0, y: 1 } }
            ]
          }
        ],
        wires: [
          { id: 'wire-1', fromTerminalId: 'bat-pos', toTerminalId: 'bat-neg' }
        ],
        version: 0
      }

      const report = solveCircuit(graph)

      expect(report.status).toBe(SolverStatus.SHORT_CIRCUIT)
      expect(report.reason).toBe(ReasonCode.BATTERY_SHORT)
      expect(report.totalCurrent).toBe(0)
    })
  })

  describe('parallel circuit', () => {
    it('should solve parallel circuit', () => {
      let graph = createEmptyGraph()
      const action: CircuitAction = {
        type: 'LOAD_CIRCUIT',
        graph: CircuitFixtures.parallel
      }
      graph = circuitReducer(graph, action)

      const report = solveCircuit(graph)

      expect(report.status).toBe(SolverStatus.VALID)
      expect(report.totalCurrent).toBeGreaterThan(0)
      
      const lamp1Result = report.componentResults.find(r => r.componentId === 'lamp-1')
      const lamp2Result = report.componentResults.find(r => r.componentId === 'lamp-2')
      expect(lamp1Result?.isEnergized).toBe(true)
      expect(lamp2Result?.isEnergized).toBe(true)
    })
  })
})

import fc from 'fast-check'
import type { CircuitComponent } from './types'

const battery = (v: number): CircuitComponent => ({
  id: 'b', type: 'battery', voltage: v, isOn: true,
  terminals: [
    { id: 'b+', name: 'positive', position: { x: 0, y: 0 } },
    { id: 'b-', name: 'negative', position: { x: 0, y: 1 } }
  ]
})
const load = (id: string, r: number, type: 'lamp' | 'resistor' = 'lamp'): CircuitComponent => ({
  id, type, resistance: r, isOn: false,
  terminals: [
    { id: `${id}a`, name: 'A', position: { x: 0, y: 0 } },
    { id: `${id}b`, name: 'B', position: { x: 0, y: 1 } }
  ]
})
const w = (id: string, a: string, b: string) => ({ id, fromTerminalId: a, toTerminalId: b })

describe('dcSolver physics', () => {
  it('series lamps add resistance and share current', () => {
    const report = solveCircuit({
      components: [battery(9), load('l1', 30), load('l2', 60)],
      wires: [w('1', 'b+', 'l1a'), w('2', 'l1b', 'l2a'), w('3', 'l2b', 'b-')]
    })
    expect(report.totalCurrent).toBeCloseTo(0.1, 6)
    const l1 = report.componentResults.find(r => r.componentId === 'l1')!
    const l2 = report.componentResults.find(r => r.componentId === 'l2')!
    expect(l1.voltage).toBeCloseTo(3, 6)
    expect(l2.voltage).toBeCloseTo(6, 6)
  })

  it('parallel lamps each see full battery voltage', () => {
    const report = solveCircuit({
      components: [battery(9), load('l1', 100), load('l2', 100)],
      wires: [w('1', 'b+', 'l1a'), w('2', 'b+', 'l2a'), w('3', 'l1b', 'b-'), w('4', 'l2b', 'b-')]
    })
    expect(report.totalCurrent).toBeCloseTo(0.18, 6)
    for (const id of ['l1', 'l2']) {
      expect(report.componentResults.find(r => r.componentId === id)!.voltage).toBeCloseTo(9, 6)
    }
  })

  it('a lamp wired on one side only stays dark while the loop works', () => {
    const report = solveCircuit({
      components: [battery(9), load('l1', 100), load('l2', 100)],
      wires: [w('1', 'b+', 'l1a'), w('2', 'l1b', 'b-'), w('3', 'b+', 'l2a')]
    })
    expect(report.status).toBe(SolverStatus.VALID)
    expect(isLampIlluminated(report, 'l1')).toBe(true)
    expect(isLampIlluminated(report, 'l2')).toBe(false)
  })

  it('an open switch stops the current', () => {
    const sw: CircuitComponent = {
      id: 's', type: 'switch', isOn: false,
      terminals: [
        { id: 'sa', name: 'A', position: { x: 0, y: 0 } },
        { id: 'sb', name: 'B', position: { x: 0, y: 1 } }
      ]
    }
    const graph: CircuitGraph = {
      components: [battery(9), sw, load('l1', 100)],
      wires: [w('1', 'b+', 'sa'), w('2', 'sb', 'l1a'), w('3', 'l1b', 'b-')]
    }
    const open = solveCircuit(graph)
    expect(open.status).toBe(SolverStatus.NO_PATH)
    expect(open.reason).toBe(ReasonCode.SWITCH_OFF)
    expect(isLampIlluminated(open, 'l1')).toBe(false)

    const closed = solveCircuit({
      ...graph,
      components: graph.components.map(c => (c.id === 's' ? { ...c, isOn: true } : c))
    })
    expect(isLampIlluminated(closed, 'l1')).toBe(true)
  })

  it('a wire across a lamp is reported as a short, not a lit lamp', () => {
    const wire: CircuitComponent = {
      id: 'w', type: 'wire', isOn: false,
      terminals: [
        { id: 'wa', name: 'A', position: { x: 0, y: 0 } },
        { id: 'wb', name: 'B', position: { x: 0, y: 1 } }
      ]
    }
    const report = solveCircuit({
      components: [battery(9), wire, load('l1', 100)],
      wires: [w('1', 'b+', 'wa'), w('2', 'wb', 'b-'), w('3', 'b+', 'l1a'), w('4', 'l1b', 'b-')]
    })
    expect(report.status).toBe(SolverStatus.SHORT_CIRCUIT)
    expect(isLampIlluminated(report, 'l1')).toBe(false)
  })

  it('property: series current equals V / sum(R); every lamp carries it', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 24 }),
        fc.array(fc.integer({ min: 1, max: 1000 }), { minLength: 1, maxLength: 6 }),
        (v, rs) => {
          const comps = [battery(v), ...rs.map((r, i) => load(`l${i}`, r))]
          const wires = [w('s', 'b+', 'l0a'), w('e', `l${rs.length - 1}b`, 'b-')]
          for (let i = 0; i < rs.length - 1; i++) wires.push(w(`m${i}`, `l${i}b`, `l${i + 1}a`))
          const report = solveCircuit({ components: comps, wires })
          const expected = v / rs.reduce((a, b) => a + b, 0)
          expect(report.totalCurrent).toBeCloseTo(expected, 6)
          for (let i = 0; i < rs.length; i++) {
            expect(report.componentResults.find(r => r.componentId === `l${i}`)!.current).toBeCloseTo(expected, 6)
          }
        }
      )
    )
  })

  it('property: parallel branch currents sum to battery current (KCL)', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 24 }),
        fc.array(fc.integer({ min: 1, max: 1000 }), { minLength: 1, maxLength: 5 }),
        (v, rs) => {
          const comps = [battery(v), ...rs.map((r, i) => load(`l${i}`, r))]
          const wires = rs.flatMap((_, i) => [w(`p${i}`, 'b+', `l${i}a`), w(`n${i}`, `l${i}b`, 'b-')])
          const report = solveCircuit({ components: comps, wires })
          const sum = rs.reduce((a, _, i) => a + report.componentResults.find(r => r.componentId === `l${i}`)!.current, 0)
          expect(report.totalCurrent).toBeCloseTo(sum, 6)
          expect(report.totalPower).toBeCloseTo(rs.reduce((a, r) => a + (v * v) / r, 0), 5)
        }
      )
    )
  })
})
