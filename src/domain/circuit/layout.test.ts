import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { circuitReducer } from './circuitReducer'
import { CircuitFixtures } from './fixtures'
import {
  BENCH_BOUNDS,
  FOOTPRINT,
  GRID,
  clampToBench,
  componentPosition,
  describeCell,
  findOverlap,
  isCellFree,
  normalizeLayout,
  placeAt,
  planMove,
  snapToGrid,
  stepTarget,
  terminalCenter,
} from './layout'
import { solveCircuit } from './dcSolver'
import type { CircuitComponent, CircuitGraph } from './types'

function part(id: string, x: number, y: number): CircuitComponent {
  return {
    id,
    type: 'lamp',
    label: id,
    isOn: false,
    resistance: 100,
    position: { x, y },
    terminals: [
      { id: `${id}-a`, name: 'left', position: { x: x - 35, y } },
      { id: `${id}-b`, name: 'right', position: { x: x + 35, y } },
    ],
  }
}
const two: CircuitGraph = { components: [part('a', 110, 70), part('b', 330, 70)], wires: [], version: 0 }
const coord = fc.double({ min: -1e4, max: 1e4, noNaN: true })

describe('layout helpers', () => {
  it('snaps to the grid and clamps to the bench', () => {
    expect(snapToGrid({ x: 114, y: 66 })).toEqual({ x: 110, y: 70 })
    expect(clampToBench({ x: -50, y: 9999 })).toEqual({ x: BENCH_BOUNDS.minX, y: BENCH_BOUNDS.maxY })
  })

  it('bounds are on the grid', () => {
    for (const v of Object.values(BENCH_BOUNDS)) expect(v % GRID).toBe(0)
  })

  it('falls back to the terminal centre when a part has no stored position', () => {
    const c = { ...part('a', 110, 70), position: undefined }
    expect(componentPosition(c)).toEqual({ x: 110, y: 70 })
  })

  it('detects footprint overlap only when both axes are close', () => {
    expect(isCellFree(two, 'a', { x: 330, y: 70 })).toBe(false)
    expect(findOverlap(two, 'a', { x: 330 + FOOTPRINT.width - 1, y: 70 + FOOTPRINT.height - 1 })?.id).toBe('b')
    expect(isCellFree(two, 'a', { x: 330 + FOOTPRINT.width, y: 70 })).toBe(true)
    expect(isCellFree(two, 'a', { x: 330, y: 70 + FOOTPRINT.height })).toBe(true)
    expect(isCellFree(two, 'a', { x: 110, y: 70 })).toBe(true) // a part never blocks itself
  })

  it('planMove rejects an occupied spot, naming the blocker, and keeps the preview position', () => {
    const plan = planMove(two, 'a', { x: 333, y: 71 })
    expect(plan).toMatchObject({ ok: false, reason: 'occupied', blockedBy: 'b', position: { x: 330, y: 70 } })
  })

  it('planMove reports clamping, unknown parts and non-finite targets', () => {
    expect(planMove(two, 'a', { x: -500, y: 70 })).toMatchObject({ ok: true, clamped: true, position: { x: BENCH_BOUNDS.minX, y: 70 } })
    expect(planMove(two, 'zzz', { x: 0, y: 0 })).toMatchObject({ ok: false, reason: 'not-found' })
    expect(planMove(two, 'a', { x: Number.NaN, y: 0 })).toMatchObject({ ok: false, reason: 'invalid-position' })
  })

  it('placeAt moves the terminals with the body, so wires follow', () => {
    const moved = placeAt(part('a', 110, 70), { x: 200, y: 150 })
    expect(moved.position).toEqual({ x: 200, y: 150 })
    expect(moved.terminals.map(t => t.position)).toEqual([
      { x: 165, y: 150 },
      { x: 235, y: 150 },
    ])
  })

  it('normalizeLayout writes the terminal centre into every part', () => {
    const g = normalizeLayout({ ...two, components: two.components.map(c => ({ ...c, position: undefined })) })
    expect(g.components.map(c => c.position)).toEqual([
      { x: 110, y: 70 },
      { x: 330, y: 70 },
    ])
  })

  it('stepTarget and describeCell use the grid', () => {
    expect(stepTarget({ x: 110, y: 70 }, 1, -2)).toEqual({ x: 110 + GRID, y: 70 - 2 * GRID })
    expect(describeCell({ x: 110, y: 70 })).toEqual({ column: 11, row: 7 })
  })

  describe('properties', () => {
    it('planMove always lands on the grid inside the bench, whatever the target', () => {
      fc.assert(
        fc.property(coord, coord, (x, y) => {
          const p = planMove({ components: [part('a', 110, 70)], wires: [] }, 'a', { x, y })
          expect(p.ok).toBe(true)
          expect(p.position.x % GRID).toBe(0)
          expect(p.position.y % GRID).toBe(0)
          expect(p.position.x).toBeGreaterThanOrEqual(BENCH_BOUNDS.minX)
          expect(p.position.x).toBeLessThanOrEqual(BENCH_BOUNDS.maxX)
          expect(p.position.y).toBeGreaterThanOrEqual(BENCH_BOUNDS.minY)
          expect(p.position.y).toBeLessThanOrEqual(BENCH_BOUNDS.maxY)
        }),
      )
    })

    it('snapping is idempotent', () => {
      fc.assert(
        fc.property(coord, coord, (x, y) => {
          expect(snapToGrid(snapToGrid({ x, y }))).toEqual(snapToGrid({ x, y }))
        }),
      )
    })

    it('MOVE_COMPONENT sets an absolute position: moving to the same target twice changes nothing the second time', () => {
      fc.assert(
        fc.property(coord, coord, (x, y) => {
          const g1 = circuitReducer(two, { type: 'MOVE_COMPONENT', componentId: 'a', position: { x, y } })
          const g2 = circuitReducer(g1, { type: 'MOVE_COMPONENT', componentId: 'a', position: { x, y } })
          expect(g2).toBe(g1)
        }),
      )
    })

    it('after any sequence of moves no two parts overlap, terminals stay centred on the position, and wires and ids are unchanged', () => {
      const move = fc.record({ id: fc.constantFrom('a', 'b', 'c'), x: coord, y: coord })
      fc.assert(
        fc.property(fc.array(move, { maxLength: 30 }), moves => {
          const start: CircuitGraph = {
            components: [part('a', 110, 70), part('b', 330, 70), part('c', 550, 70)],
            wires: [{ id: 'w', fromTerminalId: 'a-b', toTerminalId: 'b-a' }],
            version: 0,
          }
          const end = moves.reduce(
            (g, m) => circuitReducer(g, { type: 'MOVE_COMPONENT', componentId: m.id, position: { x: m.x, y: m.y } }),
            start,
          )
          expect(end.wires).toEqual(start.wires)
          for (const c of end.components) {
            expect(c.position).toEqual(terminalCenter(c))
            expect(c.terminals.map(t => t.id)).toEqual(start.components.find(s => s.id === c.id)?.terminals.map(t => t.id))
            expect(c.terminals[1].position.x - c.terminals[0].position.x).toBe(70)
            expect(findOverlap(end, c.id, terminalCenter(c))).toBeUndefined()
          }
        }),
      )
    })
  })
})

/** The report carries a wall-clock `timestamp`, which differs between any two calls. Everything else must match. */
const withoutClock = (g: CircuitGraph) => ({ ...solveCircuit(g), timestamp: 0 })

describe('position independence of the solver', () => {
  const fixtures = [CircuitFixtures.simpleSeries, CircuitFixtures.parallel, CircuitFixtures.openCircuit] as unknown as CircuitGraph[]
  const point = fc.record({ x: coord, y: coord })

  it('solveCircuit output is identical for any terminal and component positions', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: fixtures.length - 1 }), fc.array(point, { minLength: 16, maxLength: 16 }), (which, pts) => {
        const base = fixtures[which]
        let i = 0
        const moved: CircuitGraph = {
          ...base,
          components: base.components.map(c => ({
            ...c,
            position: pts[i++ % pts.length],
            terminals: c.terminals.map(t => ({ ...t, position: pts[i++ % pts.length] })),
          })),
        }
        expect(withoutClock(moved)).toEqual(withoutClock(base))
      }),
    )
  })

  it('solveCircuit output is identical after random MOVE_COMPONENT sequences on the fixtures', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: fixtures.length - 1 }),
        fc.array(fc.record({ n: fc.nat(5), x: coord, y: coord }), { maxLength: 20 }),
        (which, moves) => {
          const base = fixtures[which]
          const end = moves.reduce(
            (g, m) =>
              circuitReducer(g, {
                type: 'MOVE_COMPONENT',
                componentId: g.components[m.n % g.components.length].id,
                position: { x: m.x, y: m.y },
              }),
            base,
          )
          expect(withoutClock(end)).toEqual(withoutClock(base))
        },
      ),
    )
  })
})
