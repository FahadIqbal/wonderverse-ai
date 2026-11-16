import { useCallback, useMemo, useRef, useState } from 'react'
import type { CircuitGraph, Position } from '../../../domain/circuit'
import {
  IDLE_DRAG,
  moveDrag,
  pressDrag,
  previewGraph,
  releaseDrag,
  type DragOutcome,
  type DragState,
  type PointerKind,
} from './dragController'

export interface ComponentDrag {
  state: DragState
  /** The current state read from the ref, for event handlers that must see changes made earlier in the same event. */
  getState: () => DragState
  /** The graph to draw: the stored graph, with the dragged part (and so its wires) at the snapped preview spot. */
  displayGraph: CircuitGraph
  press: (componentId: string, screen: Position, layout: Position, kind: PointerKind) => void
  move: (screen: Position, layout: Position) => void
  /** Ends the gesture. A drop calls `commit` exactly once; the outcome is returned so the view can react to a click. */
  release: () => DragOutcome
  cancel: () => void
}

/**
 * React wrapper around the pure drag controller. The ref is the source of truth inside event handlers (state
 * updates are asynchronous); `state` exists to re-render the preview. Nothing here touches the store until `release`.
 */
export function useComponentDrag(graph: CircuitGraph, commit: (componentId: string, position: Position) => void): ComponentDrag {
  const [state, setState] = useState<DragState>(IDLE_DRAG)
  const ref = useRef<DragState>(IDLE_DRAG)
  const graphRef = useRef(graph)
  graphRef.current = graph
  const commitRef = useRef(commit)
  commitRef.current = commit

  const set = useCallback((next: DragState) => {
    ref.current = next
    setState(next)
  }, [])

  const press = useCallback<ComponentDrag['press']>(
    (componentId, screen, layout, kind) => set(pressDrag(graphRef.current, componentId, screen, layout, kind)),
    [set],
  )
  const move = useCallback<ComponentDrag['move']>(
    (screen, layout) => {
      const next = moveDrag(ref.current, graphRef.current, screen, layout)
      if (next !== ref.current) set(next)
    },
    [set],
  )
  const release = useCallback<ComponentDrag['release']>(() => {
    const outcome = releaseDrag(ref.current)
    set(IDLE_DRAG)
    if (outcome.kind === 'drop') commitRef.current(outcome.componentId, outcome.plan.position)
    return outcome
  }, [set])
  const cancel = useCallback(() => set(IDLE_DRAG), [set])
  const getState = useCallback(() => ref.current, [])

  const displayGraph = useMemo(() => previewGraph(graph, state), [graph, state])
  return { state, getState, displayGraph, press, move, release, cancel }
}
