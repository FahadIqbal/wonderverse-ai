import { create } from 'zustand'
import {
  circuitReducer,
  createEmptyGraph,
  solveCircuit,
  validateConnection,
  type CircuitAction,
  type CircuitComponent,
  type CircuitGraph,
  type ComponentType,
  type SimulationReport,
  type TerminalId,
} from '../../domain/circuit'

import { IDLE, selectPort, type PortSelection } from './portSelection'
export type PlaceableType = ComponentType

export interface Feedback {
  kind: 'info' | 'error'
  text: string
}

/** Most graphs kept for undo. Graphs are immutable and share structure, so this is cheap. */
export const HISTORY_LIMIT = 50
/** Structural equality of two circuits, ignoring the bookkeeping `version`. */
export function graphsEqual(a: CircuitGraph, b: CircuitGraph): boolean {
  return JSON.stringify([a.components, a.wires]) === JSON.stringify([b.components, b.wires])
}
function pushBounded(past: CircuitGraph[], graph: CircuitGraph): CircuitGraph[] {
  const next = [...past, graph]
  return next.length > HISTORY_LIMIT ? next.slice(next.length - HISTORY_LIMIT) : next
}
export interface LabState {
  /** Canonical circuit graph. The only source of truth for circuit structure. */
  graph: CircuitGraph
  /** Earlier graphs, oldest first, for undo. Not persisted. */
  past: CircuitGraph[]
  /** Graphs undone and available for redo. Cleared by any new edit. */
  future: CircuitGraph[]
  /** The circuit that Reset returns to (a mission's setup), or null when there is none. */
  baseline: CircuitGraph | null
  /** Terminal chosen as the source of a pending connection, if any. */
  pendingTerminalId: TerminalId | null
  /** Last user-facing message (announced through an aria-live region). */
  feedback: Feedback | null
  /**
   * Single entry point for learner graph changes. A change that alters the graph is pushed onto the undo
   * history and clears redo. Reducer no-ops (same graph reference) are not recorded.
   */
  dispatch: (action: CircuitAction) => void
  /** Replaces the circuit without recording history (mission start, restore, switching missions). */
  loadGraph: (graph: CircuitGraph, baseline?: CircuitGraph | null) => void
  undo: () => void
  redo: () => void
  /** Returns the circuit to `baseline`. This is itself an edit, so it can be undone. */
  resetToSetup: () => void
  addComponent: (type: PlaceableType) => string
  removeComponent: (componentId: string) => void
  removeWire: (wireId: string) => void
  toggleSwitch: (componentId: string) => void
  selectTerminal: (terminalId: TerminalId) => void
  cancelConnection: () => void
  clearCircuit: () => void
}

/** Pure derivation of the simulation report. Reports are never stored. */
export function selectReport(state: Pick<LabState, 'graph'>): SimulationReport {
  return solveCircuit(state.graph)
}

const SLOT_COLUMNS = 3
const SLOT_WIDTH = 220
const SLOT_HEIGHT = 130
const ORIGIN = { x: 110, y: 70 }
const HALF_SPAN = 35

function slotCenter(slot: number) {
  return {
    x: ORIGIN.x + (slot % SLOT_COLUMNS) * SLOT_WIDTH,
    y: ORIGIN.y + Math.floor(slot / SLOT_COLUMNS) * SLOT_HEIGHT,
  }
}

function componentCenter(c: CircuitComponent) {
  const xs = c.terminals.map(t => t.position.x)
  const ys = c.terminals.map(t => t.position.y)
  return {
    x: (Math.min(...xs) + Math.max(...xs)) / 2,
    y: (Math.min(...ys) + Math.max(...ys)) / 2,
  }
}

function firstFreeSlot(graph: CircuitGraph): number {
  const centers = graph.components.map(componentCenter)
  for (let slot = 0; ; slot++) {
    const s = slotCenter(slot)
    if (!centers.some(c => Math.abs(c.x - s.x) < 1 && Math.abs(c.y - s.y) < 1)) return slot
  }
}

const DISPLAY_NAME: Record<ComponentType, string> = {
  battery: 'Battery',
  lamp: 'Lamp',
  resistor: 'Resistor',
  switch: 'Switch',
  wire: 'Jumper',
}

function nextIndex(graph: CircuitGraph, type: ComponentType): number {
  let n = 1
  const ids = new Set(graph.components.map(c => c.id))
  while (ids.has(`${type}-${n}`)) n++
  return n
}

export function createComponent(graph: CircuitGraph, type: ComponentType): CircuitComponent {
  const n = nextIndex(graph, type)
  const id = `${type}-${n}`
  const { x, y } = slotCenter(firstFreeSlot(graph))
  const left = { x: x - HALF_SPAN, y }
  const right = { x: x + HALF_SPAN, y }
  const label = `${DISPLAY_NAME[type]} ${n}`

  if (type === 'battery') {
    return {
      id,
      type,
      label,
      voltage: 9,
      isOn: true,
      terminals: [
        { id: `${id}-pos`, name: 'positive', position: left },
        { id: `${id}-neg`, name: 'negative', position: right },
      ],
    }
  }
  const base = {
    id,
    type,
    label,
    isOn: false,
    terminals: [
      { id: `${id}-a`, name: 'left', position: left },
      { id: `${id}-b`, name: 'right', position: right },
    ],
  }
  if (type === 'lamp') return { ...base, resistance: 100 }
  if (type === 'resistor') return { ...base, resistance: 220 }
  return base
}

function nextWireId(graph: CircuitGraph): string {
  let n = 1
  const ids = new Set(graph.wires.map(w => w.id))
  while (ids.has(`wire-${n}`)) n++
  return `wire-${n}`
}

export function terminalLabel(graph: CircuitGraph, terminalId: TerminalId): string {
  for (const c of graph.components) {
    const t = c.terminals.find(x => x.id === terminalId)
    if (t) return `${c.label ?? c.id} ${t.name}`
  }
  return terminalId
}

export const useLabStore = create<LabState>((set, get) => ({
  graph: createEmptyGraph(),
  past: [],
  future: [],
  baseline: null,
  pendingTerminalId: null,
  feedback: null,
  dispatch: action =>
    set(state => {
      const next = circuitReducer(state.graph, action)
      if (next === state.graph) return state
      return { graph: next, past: pushBounded(state.past, state.graph), future: [] }
    }),
  loadGraph: (graph, baseline = null) =>
    set(state => ({
      graph: circuitReducer(state.graph, { type: 'LOAD_CIRCUIT', graph }),
      past: [],
      future: [],
      baseline,
      pendingTerminalId: null,
    })),
  undo: () => {
    const { past, future, graph } = get()
    if (past.length === 0) return
    set({
      graph: past[past.length - 1],
      past: past.slice(0, -1),
      future: [graph, ...future],
      pendingTerminalId: null,
      feedback: { kind: 'info', text: 'Undid the last change.' },
    })
  },
  redo: () => {
    const { past, future, graph } = get()
    if (future.length === 0) return
    set({
      graph: future[0],
      past: pushBounded(past, graph),
      future: future.slice(1),
      pendingTerminalId: null,
      feedback: { kind: 'info', text: 'Redid the change.' },
    })
  },
  resetToSetup: () => {
    const { baseline, graph } = get()
    if (!baseline || graphsEqual(graph, baseline)) return
    get().dispatch({ type: 'LOAD_CIRCUIT', graph: baseline })
    set({ pendingTerminalId: null, feedback: { kind: 'info', text: 'Circuit reset to the mission setup. You can undo this.' } })
  },

  addComponent: type => {
    const component = createComponent(get().graph, type)
    get().dispatch({ type: 'ADD_COMPONENT', component })
    set({ feedback: { kind: 'info', text: `Added ${component.label}.` } })
    return component.id
  },

  removeComponent: componentId => {
    const { graph, pendingTerminalId } = get()
    const c = graph.components.find(x => x.id === componentId)
    if (!c) return
    get().dispatch({ type: 'REMOVE_COMPONENT', componentId })
    const lostPending = pendingTerminalId && c.terminals.some(t => t.id === pendingTerminalId)
    set({
      pendingTerminalId: lostPending ? null : pendingTerminalId,
      feedback: { kind: 'info', text: `Removed ${c.label ?? c.id} and its wires.` },
    })
  },

  removeWire: wireId => {
    if (!get().graph.wires.some(w => w.id === wireId)) return
    get().dispatch({ type: 'REMOVE_WIRE', wireId })
    set({ feedback: { kind: 'info', text: `Removed ${wireId}.` } })
  },

  toggleSwitch: componentId => {
    const c = get().graph.components.find(x => x.id === componentId)
    if (!c || c.type !== 'switch') return
    get().dispatch({ type: 'TOGGLE_SWITCH', componentId })
    set({ feedback: { kind: 'info', text: `${c.label ?? c.id} is now ${c.isOn ? 'open (off)' : 'closed (on)'}.` } })
  },

  selectTerminal: terminalId => {
    const { graph, pendingTerminalId } = get()
    const prev: PortSelection = pendingTerminalId ? { phase: 'sourceSelected', source: pendingTerminalId } : IDLE
    const next = selectPort(prev, terminalId, (f, t) => validateConnection(graph, f, t))
    switch (next.phase) {
      case 'sourceSelected':
        set({
          pendingTerminalId: terminalId,
          feedback: {
            kind: 'info',
            text: `Selected ${terminalLabel(graph, terminalId)}. Choose a second terminal, or press Escape to cancel.`,
          },
        })
        return
      case 'cancelled':
        set({ pendingTerminalId: null, feedback: { kind: 'info', text: 'Connection cancelled.' } })
        return
      case 'rejected':
        set({ pendingTerminalId: null, feedback: { kind: 'error', text: `Connection rejected: ${next.reason}.` } })
        return
      case 'connected':
        get().dispatch({
          type: 'ADD_WIRE',
          wire: { id: nextWireId(graph), fromTerminalId: next.from, toTerminalId: next.to },
        })
        set({
          pendingTerminalId: null,
          feedback: {
            kind: 'info',
            text: `Connected ${terminalLabel(graph, next.from)} to ${terminalLabel(graph, next.to)}.`,
          },
        })
        return
      default:
        return
    }
  },
  cancelConnection: () => {
    if (!get().pendingTerminalId) return
    set({ pendingTerminalId: null, feedback: { kind: 'info', text: 'Connection cancelled.' } })
  },

  clearCircuit: () => {
    get().dispatch({ type: 'CLEAR_CIRCUIT' })
    set({ pendingTerminalId: null, feedback: { kind: 'info', text: 'Cleared the circuit.' } })
  },
}))
