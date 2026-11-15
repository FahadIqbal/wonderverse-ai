import type { CircuitComponent, CircuitGraph, SimulationReport } from '../../../domain/circuit'

/**
 * Pure geometry helpers for the 3D workbench. No three.js or React imports, so
 * they run in plain Vitest. Schematic coordinates (from the canonical graph)
 * map onto the bench plane (x right, z toward the viewer, y up).
 */
export type Vec3 = [number, number, number]

/** Schematic pixels per world unit. */
export const WORLD_SCALE = 50
/** Schematic point that maps to the bench centre (middle of the 3 x 2 slot grid). */
export const BENCH_CENTER = { x: 330, y: 135 }
/** Height at which terminals sit above the bench surface. */
export const PORT_HEIGHT = 0.3
/** Bench plate size in world units. */
export const BENCH_SIZE: [number, number] = [11.5, 6]
/** Lamp power (W) treated as full brightness. Visual scale only, not physics. */
export const LAMP_FULL_BRIGHTNESS_WATTS = 1.5

export function toWorld(p: { x: number; y: number }, height = 0): Vec3 {
  return [(p.x - BENCH_CENTER.x) / WORLD_SCALE, height, (p.y - BENCH_CENTER.y) / WORLD_SCALE]
}

export interface PortPlacement {
  terminalId: string
  name: string
  position: Vec3
}

export interface ComponentPlacement {
  componentId: string
  type: CircuitComponent['type']
  label: string
  /** Centre of the body, on the bench surface. */
  position: Vec3
  /** Rotation about the y axis so the body spans its two terminals. */
  rotationY: number
  /** Distance between the two terminals in world units (0 for single-terminal parts). */
  span: number
  ports: PortPlacement[]
}

export function placeComponent(c: CircuitComponent): ComponentPlacement {
  const ports: PortPlacement[] = c.terminals.map(t => ({
    terminalId: t.id,
    name: t.name,
    position: toWorld(t.position, PORT_HEIGHT),
  }))
  const xs = ports.map(p => p.position[0])
  const zs = ports.map(p => p.position[2])
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2
  const cz = (Math.min(...zs) + Math.max(...zs)) / 2
  let rotationY = 0
  let span = 0
  if (ports.length === 2) {
    const dx = ports[1].position[0] - ports[0].position[0]
    const dz = ports[1].position[2] - ports[0].position[2]
    span = Math.hypot(dx, dz)
    // Local +x runs from terminal 0 to terminal 1. Rotation about +y maps +x to (cos, -sin).
    rotationY = span === 0 ? 0 : Math.atan2(-dz, dx)
  }
  return {
    componentId: c.id,
    type: c.type,
    label: c.label ?? c.id,
    position: [cx, 0, cz],
    rotationY,
    span,
    ports,
  }
}

/** Placements for every component in the canonical graph, in graph order. */
export function placeGraph(graph: CircuitGraph): ComponentPlacement[] {
  return graph.components.map(placeComponent)
}

/** Look up a terminal's world position (used for wire endpoints). */
export function terminalWorldPosition(graph: CircuitGraph, terminalId: string): Vec3 | null {
  for (const c of graph.components) {
    const t = c.terminals.find(x => x.id === terminalId)
    if (t) return toWorld(t.position, PORT_HEIGHT)
  }
  return null
}

export interface LampGlow {
  lit: boolean
  /** 0 when dark, 0.3 to 1 when lit. */
  intensity: number
}

/**
 * Lamp glow derived ONLY from the simulation report. A lamp missing from the
 * report is dark. Intensity scales with reported power and is clamped.
 */
export function lampGlow(report: SimulationReport, componentId: string): LampGlow {
  const r = report.componentResults.find(x => x.componentId === componentId)
  if (!r || !r.isEnergized) return { lit: false, intensity: 0 }
  const ratio = Math.min(1, Math.max(0, r.power / LAMP_FULL_BRIGHTNESS_WATTS))
  return { lit: true, intensity: 0.3 + 0.7 * ratio }
}

/** Orbit limits keep the camera above the bench and the bench in view. */
export const ORBIT_LIMITS = {
  minDistance: 5,
  maxDistance: 16,
  minPolarAngle: 0.2,
  maxPolarAngle: Math.PI / 2 - 0.12,
} as const

/** Default camera offset from the bench centre (see the Canvas `camera` prop): sqrt(6.5^2 + 8^2). */
export const DEFAULT_CAMERA_DISTANCE = Math.hypot(6.5, 8)
/** Half the bench width plus a margin, so parts at the left and right ends stay inside the view. */
const FIT_HALF_WIDTH = BENCH_SIZE[0] / 2 + 0.4
/**
 * Camera distance that keeps the whole bench width visible for a canvas `aspect` (width / height) and a vertical
 * field of view in degrees. Never closer than the default, never farther than the orbit limit. Found in the T12
 * phone run: at 390px wide the battery and lamp were cut off at the canvas edges.
 */
export function fitCameraDistance(aspect: number, fovDeg: number): number {
  if (!Number.isFinite(aspect) || aspect <= 0) return DEFAULT_CAMERA_DISTANCE
  const halfTanV = Math.tan((fovDeg * Math.PI) / 360)
  const needed = FIT_HALF_WIDTH / (halfTanV * aspect)
  return Math.min(ORBIT_LIMITS.maxDistance, Math.max(DEFAULT_CAMERA_DISTANCE, needed))
}
function terminalOwner(graph: CircuitGraph, terminalId: string): CircuitComponent | undefined {
  return graph.components.find(c => c.terminals.some(t => t.id === terminalId))
}

/**
 * A wire is drawn energized only when the report marks the components at BOTH
 * ends as energized. Unknown terminals or components missing from the report are not energized.
 */
export function wireEnergized(
  graph: CircuitGraph,
  report: SimulationReport,
  wire: { fromTerminalId: string; toTerminalId: string },
): boolean {
  const a = terminalOwner(graph, wire.fromTerminalId)
  const b = terminalOwner(graph, wire.toTerminalId)
  if (!a || !b) return false
  const on = (id: string) => report.componentResults.find(r => r.componentId === id)?.isEnergized ?? false
  return on(a.id) && on(b.id)
}
/** Number of distinct arc heights before the pattern repeats. */
export const WIRE_ARC_LEVELS = 5
const WIRE_ARC_BASE = 0.45
const WIRE_ARC_STEP = 0.28
/**
 * Height of a wire's arc peak, chosen from the wire's position in the graph so wires that cross in plan view
 * pass over each other at different heights. Deterministic: the same index always gives the same height.
 * Consecutive indexes differ, and the pattern repeats every `WIRE_ARC_LEVELS` wires.
 */
export function wireArcHeight(index: number): number {
  const i = Number.isFinite(index) ? Math.floor(index) : 0
  const level = ((i % WIRE_ARC_LEVELS) + WIRE_ARC_LEVELS) % WIRE_ARC_LEVELS
  return PORT_HEIGHT + WIRE_ARC_BASE + WIRE_ARC_STEP * level
}
/** Control point for the wire's curve (the line and the flow dots both use it). */
export function wireArcMid(a: Vec3, b: Vec3, index: number): Vec3 {
  return [(a[0] + b[0]) / 2, wireArcHeight(index), (a[2] + b[2]) / 2]
}
