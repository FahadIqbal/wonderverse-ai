import { 
  CircuitGraph, 
  CircuitAction, 
  ConnectionValidation,
  TerminalId,
  CircuitComponent,
} from './types'

/**
 * Validates whether a wire can be connected between two terminals
 */
export function validateConnection(
  graph: CircuitGraph,
  fromTerminalId: TerminalId,
  toTerminalId: TerminalId
): ConnectionValidation {
  // Cannot connect terminal to itself
  if (fromTerminalId === toTerminalId) {
    return { isValid: false, reason: 'Cannot connect a terminal to itself' }
  }

  // Find the components containing these terminals
  const fromComponent = findComponentByTerminalId(graph, fromTerminalId)
  const toComponent = findComponentByTerminalId(graph, toTerminalId)

  if (!fromComponent || !toComponent) {
    return { isValid: false, reason: 'One or both terminals not found' }
  }

  // A wire across the two terminals of one battery is a direct short
  if (fromComponent.id === toComponent.id && fromComponent.type === 'battery') {
    return { isValid: false, reason: 'Wiring a battery directly to itself creates a short circuit' }
  }

  // Prevent battery short circuits (direct connection between battery terminals)
  if (fromComponent.type === 'battery' && toComponent.type === 'battery') {
    const fromIsPos = fromComponent.terminals.find(t => t.id === fromTerminalId)?.name === 'positive'
    const toIsNeg = toComponent.terminals.find(t => t.id === toTerminalId)?.name === 'negative'
    const fromIsNeg = fromComponent.terminals.find(t => t.id === fromTerminalId)?.name === 'negative'
    const toIsPos = toComponent.terminals.find(t => t.id === toTerminalId)?.name === 'positive'
    
    if ((fromIsPos && toIsNeg) || (fromIsNeg && toIsPos)) {
      return { isValid: false, reason: 'Direct battery-to-battery connection creates a short circuit' }
    }
  }

  // Prevent duplicate connections between same terminals
  const existingConnection = graph.wires.find(
    w => (w.fromTerminalId === fromTerminalId && w.toTerminalId === toTerminalId) ||
          (w.fromTerminalId === toTerminalId && w.toTerminalId === fromTerminalId)
  )
  if (existingConnection) {
    return { isValid: false, reason: 'Connection already exists between these terminals' }
  }

  return { isValid: true }
}

/**
 * Find a component by terminal ID
 */
function findComponentByTerminalId(graph: CircuitGraph, terminalId: TerminalId): CircuitComponent | undefined {
  return graph.components.find(c => c.terminals.some(t => t.id === terminalId))
}

/**
 * Check if removing a wire is safe
 */
export function canRemoveWire(_graph: CircuitGraph, _wireId: string): boolean {
  // In general, we allow wire removal - the circuit solver will handle invalid states
  return true
}

/**
 * Check if removing a component is safe
 */
export function canRemoveComponent(graph: CircuitGraph, componentId: string): boolean {
  const component = graph.components.find(c => c.id === componentId)
  if (!component) return false

  // We can always remove a component - wires will be cleaned up
  return true
}

/**
 * Circuit graph reducer - implements the state machine for circuit modifications
 */
export function circuitReducer(graph: CircuitGraph, action: CircuitAction): CircuitGraph {
  switch (action.type) {
    case 'ADD_COMPONENT': {
      // Check for duplicate component ID
      if (graph.components.some(c => c.id === action.component.id)) {
        return graph
      }
      return {
        ...graph,
        components: [...graph.components, action.component],
        version: (graph.version ?? 0) + 1
      }
    }

    case 'REMOVE_COMPONENT': {
      const component = graph.components.find(c => c.id === action.componentId)
      if (!component) return graph

      // Remove all wires connected to this component's terminals
      const terminalIds = component.terminals.map(t => t.id)
      const remainingWires = graph.wires.filter(
        w => !terminalIds.includes(w.fromTerminalId) && !terminalIds.includes(w.toTerminalId)
      )

      return {
        ...graph,
        components: graph.components.filter(c => c.id !== action.componentId),
        wires: remainingWires,
        version: (graph.version ?? 0) + 1
      }
    }

    case 'ADD_WIRE': {
      // Validate the connection
      const validation = validateConnection(graph, action.wire.fromTerminalId, action.wire.toTerminalId)
      if (!validation.isValid) {
        console.warn('Invalid wire connection:', validation.reason)
        return graph
      }

      // Check for duplicate wire ID
      if (graph.wires.some(w => w.id === action.wire.id)) {
        return graph
      }

      return {
        ...graph,
        wires: [...graph.wires, action.wire],
        version: (graph.version ?? 0) + 1
      }
    }

    case 'REMOVE_WIRE': {
      if (!canRemoveWire(graph, action.wireId)) {
        return graph
      }
      return {
        ...graph,
        wires: graph.wires.filter(w => w.id !== action.wireId),
        version: (graph.version ?? 0) + 1
      }
    }

    case 'MOVE_COMPONENT': {
      return {
        ...graph,
        components: graph.components.map(c => {
          if (c.id === action.componentId) {
            return {
              ...c,
              terminals: c.terminals.map(t => ({
                ...t,
                position: {
                  x: t.position.x + action.position.x,
                  y: t.position.y + action.position.y
                }
              }))
            }
          }
          return c
        }),
        version: (graph.version ?? 0) + 1
      }
    }

    case 'TOGGLE_SWITCH': {
      return {
        ...graph,
        components: graph.components.map(c => {
          if (c.id === action.componentId && c.type === 'switch') {
            return { ...c, isOn: !c.isOn }
          }
          return c
        }),
        version: (graph.version ?? 0) + 1
      }
    }

    case 'CLEAR_CIRCUIT': {
      return {
        components: [],
        wires: [],
        version: (graph.version ?? 0) + 1
      }
    }

    case 'LOAD_CIRCUIT': {
      return {
        ...action.graph,
        version: (graph.version ?? 0) + 1
      }
    }

    default:
      return graph
  }
}

/**
 * Create an empty circuit graph
 */
export function createEmptyGraph(): CircuitGraph {
  return {
    components: [],
    wires: [],
    version: 0
  }
}
