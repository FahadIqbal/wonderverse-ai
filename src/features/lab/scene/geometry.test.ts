import { describe, expect, it } from 'vitest'
import fc from 'fast-check'
import { createEmptyGraph, circuitReducer, solveCircuit, CircuitFixtures } from '../../../domain/circuit'
import { createComponent } from '../labStore'
import { DEFAULT_CAMERA_DISTANCE, ORBIT_LIMITS, fitCameraDistance, BENCH_CENTER, PORT_HEIGHT, WIRE_ARC_LEVELS, WORLD_SCALE, lampGlow, placeComponent, placeGraph, terminalWorldPosition, toWorld, wireArcHeight, wireArcMid, wireEnergized, LAMP_PULSE_AMPLITUDE, lampPulseActive, lampPulseFactor, litLampCount, sceneFrameloop, fromWorld, rayToBench } from './geometry'
import type { CircuitGraph, ComponentType } from '../../../domain/circuit'

function graphWith(types: ComponentType[]): CircuitGraph {
  let g = createEmptyGraph()
  for (const t of types) g = circuitReducer(g, { type: 'ADD_COMPONENT', component: createComponent(g, t)! })
  return g
}

describe('toWorld', () => {
  it('maps the bench centre to the origin and scales by WORLD_SCALE', () => {
    expect(toWorld(BENCH_CENTER)).toEqual([0, 0, 0])
    const [x, y, z] = toWorld({ x: BENCH_CENTER.x + WORLD_SCALE, y: BENCH_CENTER.y - 2 * WORLD_SCALE }, 0.5)
    expect(x).toBeCloseTo(1)
    expect(y).toBe(0.5)
    expect(z).toBeCloseTo(-2)
  })
})

describe('placeComponent', () => {
  const g = graphWith(['battery', 'lamp', 'resistor', 'switch'])

  it('creates one port per graph terminal, at port height, with matching ids', () => {
    for (const c of g.components) {
      const p = placeComponent(c)
      expect(p.ports.map(x => x.terminalId)).toEqual(c.terminals.map(t => t.id))
      for (const port of p.ports) expect(port.position[1]).toBe(PORT_HEIGHT)
    }
  })

  it('centres the body between its terminals and spans them horizontally', () => {
    const p = placeComponent(g.components[0])
    const [a, b] = p.ports
    expect(p.position[0]).toBeCloseTo((a.position[0] + b.position[0]) / 2)
    expect(p.rotationY).toBeCloseTo(0)
    expect(p.span).toBeCloseTo(1.4)
  })

  it('rotates so local +x points from terminal 0 to terminal 1', () => {
    const c = {
      ...g.components[1],
      terminals: [
        { id: 'a', name: 'left', position: { x: 330, y: 135 } },
        { id: 'b', name: 'right', position: { x: 330, y: 235 } }, // +z in world
      ],
    }
    const p = placeComponent(c)
    // Rotation about y by r sends local +x to (cos r, 0, -sin r).
    expect(Math.cos(p.rotationY)).toBeCloseTo(0)
    expect(-Math.sin(p.rotationY)).toBeCloseTo(1)
    expect(p.span).toBeCloseTo(2)
  })

  it('gives distinct slots to distinct parts so bodies do not overlap', () => {
    const placements = placeGraph(g)
    const keys = new Set(placements.map(p => `${p.position[0].toFixed(2)},${p.position[2].toFixed(2)}`))
    expect(keys.size).toBe(placements.length)
  })
})

describe('terminalWorldPosition', () => {
  it('finds a terminal and returns null for unknown ids', () => {
    const g = graphWith(['lamp'])
    expect(terminalWorldPosition(g, 'lamp-1-a')).toEqual(placeComponent(g.components[0]).ports[0].position)
    expect(terminalWorldPosition(g, 'nope')).toBeNull()
  })
})

describe('lampGlow (driven only by the report)', () => {
  function closedLoop() {
    let g = createEmptyGraph()
    for (const t of ['battery', 'lamp'] as const) g = circuitReducer(g, { type: 'ADD_COMPONENT', component: createComponent(g, t)! })
    g = circuitReducer(g, { type: 'ADD_WIRE', wire: { id: 'w1', fromTerminalId: 'battery-1-pos', toTerminalId: 'lamp-1-a' } })
    g = circuitReducer(g, { type: 'ADD_WIRE', wire: { id: 'w2', fromTerminalId: 'lamp-1-b', toTerminalId: 'battery-1-neg' } })
    return g
  }

  it('is dark for an unwired lamp and lit for a closed loop', () => {
    const open = graphWith(['battery', 'lamp'])
    expect(lampGlow(solveCircuit(open), 'lamp-1')).toEqual({ lit: false, intensity: 0 })
    const glow = lampGlow(solveCircuit(closedLoop()), 'lamp-1')
    expect(glow.lit).toBe(true)
    expect(glow.intensity).toBeGreaterThanOrEqual(0.3)
    expect(glow.intensity).toBeLessThanOrEqual(1)
  })

  it('ignores the graph: a hand-built report decides, and unknown lamps are dark', () => {
    const base = solveCircuit(closedLoop())
    const forcedDark = { ...base, componentResults: base.componentResults.map(r => ({ ...r, isEnergized: false })) }
    expect(lampGlow(forcedDark, 'lamp-1').lit).toBe(false)
    expect(lampGlow(base, 'missing').lit).toBe(false)
  })
})

describe('wireEnergized', () => {
  const closed = circuitReducer(createEmptyGraph(), { type: 'LOAD_CIRCUIT', graph: CircuitFixtures.simpleSeries })
  it('is true for wires of a closed loop', () => {
    const report = solveCircuit(closed)
    expect(closed.wires.every(w => wireEnergized(closed, report, w))).toBe(true)
  })
  it('is false when the report is for a broken circuit, and for unknown terminals', () => {
    const open = { ...closed, wires: closed.wires.slice(0, 1) }
    const report = solveCircuit(open)
    expect(open.wires.some(w => wireEnergized(open, report, w))).toBe(false)
    expect(wireEnergized(closed, solveCircuit(closed), { fromTerminalId: 'x', toTerminalId: 'y' })).toBe(false)
  })
  it('property: a wire is energized only if both connected components are energized in the report', () => {
    fc.assert(
      fc.property(fc.boolean(), fc.boolean(), fc.integer({ min: 0, max: 1 }), (withReturn, extraWire, drop) => {
        let g = closed
        if (!withReturn) g = { ...g, wires: g.wires.filter((_, i) => i !== drop) }
        if (extraWire) {
          g = { ...g, wires: [...g.wires, { id: 'w-x', fromTerminalId: 'battery-1-pos', toTerminalId: 'lamp-1-a' }] }
        }
        const report = solveCircuit(g)
        const on = (id: string) => report.componentResults.find(r => r.componentId === id)?.isEnergized ?? false
        for (const w of g.wires) {
          if (!wireEnergized(g, report, w)) continue
          const owners = [w.fromTerminalId, w.toTerminalId].map(t => g.components.find(c => c.terminals.some(x => x.id === t))!)
          expect(owners.every(c => on(c.id))).toBe(true)
        }
      }),
    )
  })
})

describe('wire arc heights', () => {
  it('gives wires that are next to each other in the graph different heights, deterministically', () => {
    fc.assert(
      fc.property(fc.integer({ min: -1000, max: 1000 }), i => {
        expect(wireArcHeight(i)).toBe(wireArcHeight(i))
        for (let d = 1; d < WIRE_ARC_LEVELS; d++) expect(wireArcHeight(i + d)).not.toBe(wireArcHeight(i))
      }),
    )
  })
  it('keeps every arc above the ports and below a fixed ceiling, and handles odd input', () => {
    for (const i of [0, 1, 4, 5, 99, -3, 2.7, Number.NaN, Number.POSITIVE_INFINITY]) {
      const h = wireArcHeight(i)
      expect(h).toBeGreaterThan(PORT_HEIGHT)
      expect(h).toBeLessThan(2.5)
    }
  })
  it('puts the control point midway in plan view at the arc height', () => {
    expect(wireArcMid([0, 0.3, 0], [4, 0.3, 2], 1)).toEqual([2, wireArcHeight(1), 1])
  })
})

describe('fitCameraDistance', () => {
  it('keeps the default distance on wide canvases', () => {
    expect(fitCameraDistance(16 / 9, 45)).toBeCloseTo(DEFAULT_CAMERA_DISTANCE)
  })
  it('pulls back on a roughly square phone canvas so the bench width fits', () => {
    const d = fitCameraDistance(357 / 360, 45)
    expect(d).toBeGreaterThan(DEFAULT_CAMERA_DISTANCE + 3)
    expect(d).toBeLessThanOrEqual(ORBIT_LIMITS.maxDistance)
  })
  it('stays within bounds for any aspect, including bad input', () => {
    fc.assert(
      fc.property(fc.oneof(fc.double({ min: -5, max: 10, noNaN: false }), fc.constant(Infinity)), a => {
        const d = fitCameraDistance(a, 45)
        return d >= DEFAULT_CAMERA_DISTANCE - 1e-9 && d <= ORBIT_LIMITS.maxDistance
      }),
    )
  })
})

describe('lamp pulse decision (pure)', () => {
  function closedLoop() {
    let g = createEmptyGraph()
    for (const t of ['battery', 'lamp'] as const) g = circuitReducer(g, { type: 'ADD_COMPONENT', component: createComponent(g, t)! })
    g = circuitReducer(g, { type: 'ADD_WIRE', wire: { id: 'w1', fromTerminalId: 'battery-1-pos', toTerminalId: 'lamp-1-a' } })
    g = circuitReducer(g, { type: 'ADD_WIRE', wire: { id: 'w2', fromTerminalId: 'lamp-1-b', toTerminalId: 'battery-1-neg' } })
    return g
  }
  it('counts lit lamps from the report only', () => {
    const lit = closedLoop()
    expect(litLampCount(lit, solveCircuit(lit))).toBe(1)
    const dark = graphWith(['battery', 'lamp'])
    expect(litLampCount(dark, solveCircuit(dark))).toBe(0)
  })
  it('renders continuously only with a lit lamp and motion allowed (property)', () => {
    fc.assert(
      fc.property(fc.boolean(), fc.integer({ min: 0, max: 5 }), (calm, n) => {
        expect(sceneFrameloop(calm, n)).toBe(!calm && n > 0 ? 'always' : 'demand')
        expect(lampPulseActive(calm, n)).toBe(!calm && n > 0)
      }),
    )
  })
  it('keeps the pulse factor within a small band around 1 (property)', () => {
    fc.assert(
      fc.property(fc.double({ min: 0, max: 1e5, noNaN: true }), t => {
        const k = lampPulseFactor(t)
        expect(Math.abs(k - 1)).toBeLessThanOrEqual(LAMP_PULSE_AMPLITUDE + 1e-12)
      }),
    )
  })
})

describe('bench pointer mapping', () => {
  it('fromWorld inverts toWorld on the bench plane', () => {
    fc.assert(
      fc.property(fc.double({ min: -500, max: 1500, noNaN: true }), fc.double({ min: -500, max: 1500, noNaN: true }), (x, y) => {
        const [wx, , wz] = toWorld({ x, y })
        const back = fromWorld(wx, wz)
        expect(back.x).toBeCloseTo(x, 6)
        expect(back.y).toBeCloseTo(y, 6)
      }),
    )
  })

  it('a ray aimed at a bench point lands on that point, from any camera height and side', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 40, max: 620, noNaN: true }),
        fc.double({ min: 0, max: 280, noNaN: true }),
        fc.double({ min: -9, max: 9, noNaN: true }),
        fc.double({ min: 2, max: 12, noNaN: true }),
        fc.double({ min: -9, max: 9, noNaN: true }),
        (x, y, ox, oy, oz) => {
          const target = toWorld({ x, y })
          const dir: [number, number, number] = [target[0] - ox, target[1] - oy, target[2] - oz]
          const hit = rayToBench([ox, oy, oz], dir)
          expect(hit).not.toBeNull()
          expect(hit!.x).toBeCloseTo(x, 4)
          expect(hit!.y).toBeCloseTo(y, 4)
        },
      ),
    )
  })

  it('returns null for a ray parallel to the bench or pointing away from it', () => {
    expect(rayToBench([0, 5, 0], [1, 0, 0])).toBeNull()
    expect(rayToBench([0, 5, 0], [0, 1, 0])).toBeNull()
  })
})
