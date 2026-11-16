import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { BENCH_BOUNDS, GRID, circuitReducer, findOverlap, terminalCenter, type CircuitComponent, type CircuitGraph } from '../../../domain/circuit'
import {
  DRAG_THRESHOLD_PX,
  IDLE_DRAG,
  exceedsDragThreshold,
  moveDrag,
  pointerKind,
  pressDrag,
  previewGraph,
  releaseDrag,
  type DragState,
} from './dragController'

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
const graph: CircuitGraph = {
  components: [part('a', 110, 70), part('b', 330, 70)],
  wires: [{ id: 'w1', fromTerminalId: 'a-b', toTerminalId: 'b-a' }],
  version: 0,
}
const at = (x: number, y: number) => ({ x, y })

describe('drag threshold', () => {
  it('uses a larger threshold for touch than for a mouse', () => {
    expect(DRAG_THRESHOLD_PX.touch).toBeGreaterThan(DRAG_THRESHOLD_PX.mouse)
    expect(pointerKind('touch')).toBe('touch')
    expect(pointerKind('pen')).toBe('pen')
    expect(pointerKind('mouse')).toBe('mouse')
    expect(pointerKind(undefined)).toBe('mouse')
  })

  it('is exclusive below and inclusive at the threshold', () => {
    expect(exceedsDragThreshold(DRAG_THRESHOLD_PX.mouse - 0.1, 0, 'mouse')).toBe(false)
    expect(exceedsDragThreshold(0, DRAG_THRESHOLD_PX.mouse, 'mouse')).toBe(true)
    expect(exceedsDragThreshold(5, 0, 'touch')).toBe(false)
    expect(exceedsDragThreshold(6, 6, 'touch')).toBe(true)
  })

  it('a pointer movement below the threshold in any direction never starts a drag', () => {
    fc.assert(
      fc.property(fc.double({ min: 0, max: 2 * Math.PI, noNaN: true }), fc.double({ min: 0, max: 0.99, noNaN: true }), (angle, frac) => {
        const r = DRAG_THRESHOLD_PX.mouse * frac
        expect(exceedsDragThreshold(Math.cos(angle) * r, Math.sin(angle) * r, 'mouse')).toBe(false)
      }),
    )
  })
})

describe('drag state machine', () => {
  it('a press with a tiny movement is a click, not a drag', () => {
    let s: DragState = pressDrag(graph, 'a', at(100, 100), at(110, 70), 'mouse')
    s = moveDrag(s, graph, at(101, 101), at(111, 71))
    expect(s.phase).toBe('pressed')
    expect(releaseDrag(s)).toEqual({ kind: 'click', componentId: 'a' })
  })

  it('moving past the threshold starts a drag that stays a drag, even if the pointer returns', () => {
    let s: DragState = pressDrag(graph, 'a', at(100, 100), at(110, 70), 'mouse')
    s = moveDrag(s, graph, at(140, 100), at(150, 70))
    expect(s.phase).toBe('dragging')
    s = moveDrag(s, graph, at(100, 100), at(110, 70))
    expect(s.phase).toBe('dragging')
    expect(releaseDrag(s).kind).toBe('drop')
  })

  it('keeps the grab offset: grabbing a part off-centre does not make it jump', () => {
    // Pointer is 20 units right of the part centre when pressed.
    let s: DragState = pressDrag(graph, 'a', at(0, 0), at(130, 70), 'mouse')
    s = moveDrag(s, graph, at(50, 0), at(180, 70))
    expect(s.phase === 'dragging' && s.plan.position).toEqual({ x: 160, y: 70 })
  })

  it('snaps the drop to the grid and clamps it to the bench', () => {
    let s: DragState = pressDrag(graph, 'a', at(0, 0), at(110, 70), 'mouse')
    s = moveDrag(s, graph, at(40, 40), at(163, 144))
    expect(s.phase === 'dragging' && s.plan).toMatchObject({ ok: true, position: { x: 160, y: 140 } })
    s = moveDrag(s, graph, at(500, 500), at(5000, -5000))
    expect(s.phase === 'dragging' && s.plan).toMatchObject({ ok: true, clamped: true, position: { x: BENCH_BOUNDS.maxX, y: BENCH_BOUNDS.minY } })
  })

  it('reports a drop onto another part as not ok, and the outcome carries the verdict', () => {
    let s: DragState = pressDrag(graph, 'a', at(0, 0), at(110, 70), 'mouse')
    s = moveDrag(s, graph, at(40, 0), at(335, 72))
    const out = releaseDrag(s)
    expect(out).toMatchObject({ kind: 'drop', componentId: 'a', plan: { ok: false, reason: 'occupied', blockedBy: 'b' } })
  })

  it('does not rebuild the state while the snapped spot and verdict are unchanged', () => {
    let s: DragState = pressDrag(graph, 'a', at(0, 0), at(110, 70), 'mouse')
    s = moveDrag(s, graph, at(40, 0), at(152, 70))
    const same = moveDrag(s, graph, at(41, 0), at(153, 71))
    expect(same).toBe(s)
  })

  it('preview moves the part and its terminals, so wires follow, without changing the stored graph', () => {
    let s: DragState = pressDrag(graph, 'a', at(0, 0), at(110, 70), 'mouse')
    s = moveDrag(s, graph, at(40, 0), at(150, 70))
    const shown = previewGraph(graph, s)
    expect(shown.components[0].terminals[1].position).toEqual({ x: 185, y: 70 })
    expect(shown.wires).toBe(graph.wires)
    expect(graph.components[0].terminals[1].position).toEqual({ x: 145, y: 70 })
    expect(previewGraph(graph, IDLE_DRAG)).toBe(graph)
  })

  it('ignores moves and releases when idle, and presses on unknown parts', () => {
    expect(moveDrag(IDLE_DRAG, graph, at(0, 0), at(0, 0))).toBe(IDLE_DRAG)
    expect(releaseDrag(IDLE_DRAG)).toEqual({ kind: 'none' })
    expect(pressDrag(graph, 'nope', at(0, 0), at(0, 0), 'mouse')).toBe(IDLE_DRAG)
  })

  it('a whole drag is one reducer action, so it is one undo step however many pointer moves it had', () => {
    fc.assert(
      fc.property(fc.array(fc.record({ x: fc.integer({ min: -200, max: 900 }), y: fc.integer({ min: -200, max: 500 }) }), { minLength: 1, maxLength: 60 }), moves => {
        let s: DragState = pressDrag(graph, 'a', at(0, 0), at(110, 70), 'mouse')
        s = moveDrag(s, graph, at(50, 50), at(160, 120))
        for (const m of moves) s = moveDrag(s, graph, at(50, 50), m)
        const out = releaseDrag(s)
        expect(out.kind).toBe('drop')
        if (out.kind !== 'drop') return
        // The outcome is the only thing a view hands to the store: one MOVE_COMPONENT for the whole drag.
        const after = circuitReducer(graph, { type: 'MOVE_COMPONENT', componentId: out.componentId, position: out.plan.position })
        const moved = after.components.find(c => c.id === 'a')!
        // Whatever the path, the landing spot is on the grid and inside the bench.
        expect(moved.position!.x % GRID).toBe(0)
        expect(moved.position!.y % GRID).toBe(0)
        if (out.plan.ok) expect(findOverlap(after, 'a', terminalCenter(moved))).toBeUndefined()
        else expect(after).toBe(graph)
      }),
    )
  })
})
