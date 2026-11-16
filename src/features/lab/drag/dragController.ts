import { componentPosition, placeAt, planMove, type CircuitGraph, type MovePlan, type Position } from '../../../domain/circuit'

/**
 * Pointer-drag state machine shared by the schematic (SVG) and the 3D bench. Pure: it knows nothing about React,
 * the DOM or three.js. A view converts each pointer event to two points and feeds them in:
 *   - `screen`: pointer position in screen pixels, used only to tell a click from a drag.
 *   - `layout`: the same pointer position on the bench in schematic units.
 * The controller never mutates the graph. A finished drag is returned as an outcome, and the caller dispatches ONE
 * move for it, so a drag is a single undo step however many pointer events it took.
 */

export type PointerKind = 'mouse' | 'pen' | 'touch'

/** Movement (screen px) needed before a press becomes a drag. Fingers wobble more than a mouse. */
export const DRAG_THRESHOLD_PX: Record<PointerKind, number> = { mouse: 4, pen: 4, touch: 8 }

export function pointerKind(pointerType: string | undefined): PointerKind {
  return pointerType === 'touch' ? 'touch' : pointerType === 'pen' ? 'pen' : 'mouse'
}

export function exceedsDragThreshold(dx: number, dy: number, kind: PointerKind): boolean {
  return Math.hypot(dx, dy) >= DRAG_THRESHOLD_PX[kind]
}

export type DragState =
  | { phase: 'idle' }
  | {
      phase: 'pressed'
      componentId: string
      kind: PointerKind
      startScreen: Position
      /** Component centre minus pointer, so the part does not jump to the pointer when the drag starts. */
      grabOffset: Position
    }
  | {
      phase: 'dragging'
      componentId: string
      kind: PointerKind
      startScreen: Position
      grabOffset: Position
      /** Where the part would land now (clamped, snapped) and whether that spot is free. */
      plan: MovePlan
    }

export const IDLE_DRAG: DragState = { phase: 'idle' }

export type DragOutcome =
  | { kind: 'none' }
  | { kind: 'click'; componentId: string }
  | { kind: 'drop'; componentId: string; plan: MovePlan }

/** Starts a press on a component. Returns idle when the component does not exist. */
export function pressDrag(graph: CircuitGraph, componentId: string, screen: Position, layout: Position, kind: PointerKind): DragState {
  const c = graph.components.find(x => x.id === componentId)
  if (!c) return IDLE_DRAG
  const centre = componentPosition(c)
  return {
    phase: 'pressed',
    componentId,
    kind,
    startScreen: screen,
    grabOffset: { x: centre.x - layout.x, y: centre.y - layout.y },
  }
}

/** Feeds a pointer move. A press turns into a drag once it moves past the threshold, and stays a drag after that. */
export function moveDrag(state: DragState, graph: CircuitGraph, screen: Position, layout: Position): DragState {
  if (state.phase === 'idle') return state
  if (state.phase === 'pressed' && !exceedsDragThreshold(screen.x - state.startScreen.x, screen.y - state.startScreen.y, state.kind)) {
    return state
  }
  const target = { x: layout.x + state.grabOffset.x, y: layout.y + state.grabOffset.y }
  const plan = planMove(graph, state.componentId, target)
  // Same spot and same verdict: keep the same state object so the view does not re-render for every pixel.
  if (state.phase === 'dragging' && state.plan.ok === plan.ok && state.plan.position.x === plan.position.x && state.plan.position.y === plan.position.y) {
    return state
  }
  return {
    phase: 'dragging',
    componentId: state.componentId,
    kind: state.kind,
    startScreen: state.startScreen,
    grabOffset: state.grabOffset,
    plan,
  }
}

/** Ends the gesture on pointer up. A press that never became a drag is a click. */
export function releaseDrag(state: DragState): DragOutcome {
  if (state.phase === 'pressed') return { kind: 'click', componentId: state.componentId }
  if (state.phase === 'dragging') return { kind: 'drop', componentId: state.componentId, plan: state.plan }
  return { kind: 'none' }
}

/**
 * The graph to draw while a drag is in progress: the dragged part sits at its snapped spot and its terminals move
 * with it, so wires follow. Display only. The stored graph does not change until the drop.
 */
export function previewGraph(graph: CircuitGraph, state: DragState): CircuitGraph {
  if (state.phase !== 'dragging') return graph
  const { componentId, plan } = state
  return { ...graph, components: graph.components.map(c => (c.id === componentId ? placeAt(c, plan.position) : c)) }
}
