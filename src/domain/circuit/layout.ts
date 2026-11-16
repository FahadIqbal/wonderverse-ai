import type { CircuitComponent, CircuitGraph, Position } from './types'

/**
 * Bench layout helpers. Pure and renderer-free. Layout is presentation only: nothing here, and no position stored
 * in the graph, is read by the solver. The canonical circuit is the components, terminals and wires.
 *
 * A component's `position` is the centre of its body in schematic units (the same units as terminal positions).
 * Terminal positions are kept in step with it by MOVE_COMPONENT, so both views and the wires follow a move.
 */

/** Snap step in schematic units. The authored slot grid (110/330/550 by 70/200) is on this grid. */
export const GRID = 10
/** Largest keyboard step (Shift+arrow), in grid cells. */
export const LARGE_STEP_CELLS = 5

/** Allowed range for a component centre, inclusive. Both ends are on the grid and inside the 3D bench plate. */
export const BENCH_BOUNDS = { minX: 80, maxX: 580, minY: 40, maxY: 250 } as const

/** Two components may not sit closer than this (centre to centre) on both axes at once. Covers body and label. */
export const FOOTPRINT = { width: 90, height: 80 } as const

export function snapToGrid(p: Position): Position {
  // `+ 0` turns -0 into 0 so equal positions compare equal.
  return { x: Math.round(p.x / GRID) * GRID + 0, y: Math.round(p.y / GRID) * GRID + 0 }
}

export function clampToBench(p: Position): Position {
  return {
    x: Math.min(BENCH_BOUNDS.maxX, Math.max(BENCH_BOUNDS.minX, p.x)),
    y: Math.min(BENCH_BOUNDS.maxY, Math.max(BENCH_BOUNDS.minY, p.y)),
  }
}

/** Centre of a component's terminals. This is where the body is drawn in both views. */
export function terminalCenter(c: CircuitComponent): Position {
  const xs = c.terminals.map(t => t.position.x)
  const ys = c.terminals.map(t => t.position.y)
  return { x: (Math.min(...xs) + Math.max(...xs)) / 2, y: (Math.min(...ys) + Math.max(...ys)) / 2 }
}

/** The component's layout position: the stored one, or the terminal centre for parts that never had one. */
export function componentPosition(c: CircuitComponent): Position {
  return c.position ?? terminalCenter(c)
}

/** True when a part centred at `p` would overlap a part centred at `other`. */
export function footprintsOverlap(p: Position, other: Position): boolean {
  return Math.abs(p.x - other.x) < FOOTPRINT.width && Math.abs(p.y - other.y) < FOOTPRINT.height
}

/** The first other component whose footprint overlaps a part centred at `p`, or undefined. */
export function findOverlap(graph: CircuitGraph, componentId: string, p: Position): CircuitComponent | undefined {
  return graph.components.find(c => c.id !== componentId && footprintsOverlap(p, terminalCenter(c)))
}

/** True when no component other than `componentId` overlaps a part centred at `p`. */
export function isCellFree(graph: CircuitGraph, componentId: string, p: Position): boolean {
  return findOverlap(graph, componentId, p) === undefined
}

export type MovePlan =
  | { ok: true; position: Position; clamped: boolean }
  | { ok: false; reason: 'not-found' | 'invalid-position' | 'occupied'; position: Position; clamped: boolean; blockedBy?: string }

/**
 * Decides where a part dropped at `target` ends up: clamp to the bench, snap to the grid, then reject the move if
 * another part is already there (collision policy: reject, never nudge, so a drop never lands somewhere surprising).
 * `position` is always the clamped, snapped spot, which a view may show as a preview even when the move is rejected.
 */
export function planMove(graph: CircuitGraph, componentId: string, target: Position): MovePlan {
  const c = graph.components.find(x => x.id === componentId)
  if (!c) return { ok: false, reason: 'not-found', position: target, clamped: false }
  if (!Number.isFinite(target.x) || !Number.isFinite(target.y)) {
    return { ok: false, reason: 'invalid-position', position: terminalCenter(c), clamped: false }
  }
  const clampedPos = clampToBench(target)
  const clamped = clampedPos.x !== target.x || clampedPos.y !== target.y
  const position = snapToGrid(clampedPos)
  const blocker = findOverlap(graph, componentId, position)
  if (blocker) return { ok: false, reason: 'occupied', position, clamped, blockedBy: blocker.id }
  return { ok: true, position, clamped }
}

/**
 * A free, in-bounds, grid-aligned spot for a new part, or undefined when the bench is full. Tries `preferred` spots
 * first (in order, clamped and snapped), then scans the bench row by row, so the result never needs a later move
 * to get back on the bench.
 */
export function findFreeCell(graph: CircuitGraph, preferred: readonly Position[] = []): Position | undefined {
  for (const target of preferred) {
    const p = snapToGrid(clampToBench(target))
    if (p.x === target.x && p.y === target.y && isCellFree(graph, '', p)) return p
  }
  for (let y = BENCH_BOUNDS.minY; y <= BENCH_BOUNDS.maxY; y += GRID) {
    for (let x = BENCH_BOUNDS.minX; x <= BENCH_BOUNDS.maxX; x += GRID) {
      if (isCellFree(graph, '', { x, y })) return { x, y }
    }
  }
  return undefined
}
/** Moves a component (and its terminals) so its centre is exactly `position`. No clamping: use planMove first. */
export function placeAt(c: CircuitComponent, position: Position): CircuitComponent {
  const from = terminalCenter(c)
  const dx = position.x - from.x
  const dy = position.y - from.y
  return {
    ...c,
    position: { x: position.x, y: position.y },
    terminals: c.terminals.map(t => ({ ...t, position: { x: t.position.x + dx, y: t.position.y + dy } })),
  }
}

/** Gives every component an explicit `position` equal to its terminal centre. Used by the v2 -> v3 migration. */
export function normalizeLayout(graph: CircuitGraph): CircuitGraph {
  return { ...graph, components: graph.components.map(c => ({ ...c, position: terminalCenter(c) })) }
}

/** Keyboard step: `cells` grid cells from the current spot, as a target for planMove. */
export function stepTarget(from: Position, dxCells: number, dyCells: number): Position {
  return { x: from.x + dxCells * GRID, y: from.y + dyCells * GRID }
}

/** Grid column (from the left) and row (from the top) of a position, for announcements. */
export function describeCell(p: Position): { column: number; row: number } {
  return { column: Math.round(p.x / GRID), row: Math.round(p.y / GRID) }
}
