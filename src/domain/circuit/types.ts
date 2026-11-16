import { z } from 'zod'

// Component types in the circuit
export const ComponentType = z.enum(['battery', 'resistor', 'lamp', 'wire', 'switch'])
export type ComponentType = z.infer<typeof ComponentType>

// Terminal ID - unique identifier for component ports
export const TerminalId = z.string()
export type TerminalId = z.infer<typeof TerminalId>

// Position in the 2D schematic
export const Position = z.object({
  x: z.number(),
  y: z.number()
})
export type Position = z.infer<typeof Position>

// A terminal (port) on a component
export const Terminal = z.object({
  id: TerminalId,
  name: z.string(), // e.g., "positive", "negative", "left", "right"
  position: Position
})
export type Terminal = z.infer<typeof Terminal>

// Circuit component with terminals
export const CircuitComponent = z.object({
  id: z.string(),
  type: ComponentType,
  label: z.string().optional(),
  // Layout only: centre of the body in schematic units. Optional (authored parts omit it and fall back to the
  // centre of their terminals). Never read by the solver. See layout.ts.
  position: Position.optional(),
  // Resistance in Ohms (for resistors and lamps)
  resistance: z.number().min(0).optional(),
  // Voltage in Volts (for batteries)
  voltage: z.number().optional(),
  // Whether the component is active/on (for switches, lamps)
  isOn: z.boolean().default(false),
  terminals: z.array(Terminal).min(1).max(2)
})
export type CircuitComponent = z.infer<typeof CircuitComponent>

// A wire connection between two terminals
export const WireConnection = z.object({
  id: z.string(),
  fromTerminalId: TerminalId,
  toTerminalId: TerminalId
})
export type WireConnection = z.infer<typeof WireConnection>

// The canonical circuit graph - version is optional for backward compatibility
export const CircuitGraph = z.object({
  components: z.array(CircuitComponent),
  wires: z.array(WireConnection),
  version: z.number().optional()
})
export type CircuitGraph = z.infer<typeof CircuitGraph>

// Action types for the reducer
export const CircuitAction = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('ADD_COMPONENT'),
    component: CircuitComponent
  }),
  z.object({
    type: z.literal('REMOVE_COMPONENT'),
    componentId: z.string()
  }),
  z.object({
    type: z.literal('ADD_WIRE'),
    wire: WireConnection
  }),
  z.object({
    type: z.literal('REMOVE_WIRE'),
    wireId: z.string()
  }),
  z.object({
    type: z.literal('MOVE_COMPONENT'),
    componentId: z.string(),
    position: Position
  }),
  z.object({
    type: z.literal('TOGGLE_SWITCH'),
    componentId: z.string()
  }),
  z.object({
    type: z.literal('CLEAR_CIRCUIT')
  }),
  z.object({
    type: z.literal('LOAD_CIRCUIT'),
    graph: CircuitGraph
  })
])
export type CircuitAction = z.infer<typeof CircuitAction>

// Terminal connection validation result
export const ConnectionValidation = z.object({
  isValid: z.boolean(),
  reason: z.string().optional()
})
export type ConnectionValidation = z.infer<typeof ConnectionValidation>

// Helper to ensure graph has version
export function ensureGraphVersion(graph: CircuitGraph): CircuitGraph {
  if (graph.version === undefined) {
    return { ...graph, version: 0 }
  }
  return graph
}

