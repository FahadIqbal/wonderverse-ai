import type { CircuitGraph, CircuitComponent } from './types'

/**
 * Bounded, idealized DC solver (ideal battery, ohmic resistors/lamps,
 * ideal wires/switches modelled as 1 milliohm). Not a claim of real-world physics.
 * Method: merge wired terminals into nets, then nodal analysis on the nets.
 */

export const SolverStatus = {
  VALID: 'VALID',
  NO_BATTERY: 'NO_BATTERY',
  OPEN_CIRCUIT: 'OPEN_CIRCUIT',
  SHORT_CIRCUIT: 'SHORT_CIRCUIT',
  NO_PATH: 'NO_PATH',
  UNSUPPORTED_TOPOLOGY: 'UNSUPPORTED_TOPOLOGY'
} as const
export type SolverStatus = typeof SolverStatus[keyof typeof SolverStatus]

export const ReasonCode = {
  OK: 'OK',
  NO_SOURCE: 'No battery found in circuit',
  BATTERY_SHORT: 'Direct short circuit detected on battery',
  DISCONNECTED: 'Circuit is incomplete or components are disconnected',
  NO_ENERGIZED_PATH: 'No energized path from battery to component',
  MULTIPLE_PATHS: 'Complex circuit topology not supported',
  SWITCH_OFF: 'Switch is in off position',
  UNKNOWN: 'Unknown circuit state'
} as const
export type ReasonCode = typeof ReasonCode[keyof typeof ReasonCode]

export interface ComponentSimulationResult {
  componentId: string
  isEnergized: boolean
  voltage: number
  current: number
  power: number
}

export interface SimulationReport {
  status: SolverStatus
  reason: ReasonCode
  batteryVoltage: number
  componentResults: ComponentSimulationResult[]
  totalCurrent: number
  totalPower: number
  timestamp: number
}

const WIRE_RESISTANCE = 0.001
const DEFAULT_LOAD_RESISTANCE = 10
const MIN_LOAD_RESISTANCE = 0.01
const CURRENT_EPSILON = 1e-9

class UnionFind {
  private parent = new Map<string, string>()
  find(x: string): string {
    if (!this.parent.has(x)) this.parent.set(x, x)
    let root = x
    while (this.parent.get(root) !== root) root = this.parent.get(root)!
    let cur = x
    while (cur !== root) {
      const next = this.parent.get(cur)!
      this.parent.set(cur, root)
      cur = next
    }
    return root
  }
  union(a: string, b: string): void {
    const ra = this.find(a)
    const rb = this.find(b)
    if (ra !== rb) this.parent.set(ra, rb)
  }
}

interface Element {
  component: CircuitComponent
  netA: string
  netB: string
  resistance: number
}

function emptyReport(
  status: SolverStatus,
  reason: ReasonCode,
  batteryVoltage: number,
  componentResults: ComponentSimulationResult[] = []
): SimulationReport {
  return {
    status,
    reason,
    batteryVoltage,
    componentResults,
    totalCurrent: 0,
    totalPower: 0,
    timestamp: Date.now()
  }
}

/** Gaussian elimination with partial pivoting. Returns null if singular. */
function solveLinear(a: number[][], b: number[]): number[] | null {
  const n = b.length
  for (let col = 0; col < n; col++) {
    let pivot = col
    for (let r = col + 1; r < n; r++) {
      if (Math.abs(a[r][col]) > Math.abs(a[pivot][col])) pivot = r
    }
    if (Math.abs(a[pivot][col]) < 1e-12) return null
    ;[a[col], a[pivot]] = [a[pivot], a[col]]
    ;[b[col], b[pivot]] = [b[pivot], b[col]]
    for (let r = col + 1; r < n; r++) {
      const f = a[r][col] / a[col][col]
      if (f === 0) continue
      for (let c = col; c < n; c++) a[r][c] -= f * a[col][c]
      b[r] -= f * b[col]
    }
  }
  const x = new Array<number>(n).fill(0)
  for (let r = n - 1; r >= 0; r--) {
    let sum = b[r]
    for (let c = r + 1; c < n; c++) sum -= a[r][c] * x[c]
    x[r] = sum / a[r][r]
  }
  return x
}

export function solveCircuit(graph: CircuitGraph): SimulationReport {
  const batteries = graph.components.filter(c => c.type === 'battery')
  const battery = batteries[0]

  if (!battery || !battery.voltage || battery.voltage <= 0) {
    return emptyReport(SolverStatus.NO_BATTERY, ReasonCode.NO_SOURCE, 0)
  }
  const V = battery.voltage
  const zeroResults = (): ComponentSimulationResult[] =>
    graph.components.map(c => ({
      componentId: c.id,
      isEnergized: false,
      voltage: 0,
      current: 0,
      power: 0
    }))

  if (batteries.length > 1) {
    return emptyReport(SolverStatus.UNSUPPORTED_TOPOLOGY, ReasonCode.MULTIPLE_PATHS, V, zeroResults())
  }

  const pos = battery.terminals.find(t => t.name === 'positive')
  const neg = battery.terminals.find(t => t.name === 'negative')
  if (!pos || !neg) {
    return emptyReport(SolverStatus.OPEN_CIRCUIT, ReasonCode.DISCONNECTED, V, zeroResults())
  }

  // Nets: terminals joined by wires.
  const nets = new UnionFind()
  const knownTerminals = new Set(graph.components.flatMap(c => c.terminals.map(t => t.id)))
  for (const id of knownTerminals) nets.find(id)
  for (const w of graph.wires) {
    if (knownTerminals.has(w.fromTerminalId) && knownTerminals.has(w.toTerminalId)) {
      nets.union(w.fromTerminalId, w.toTerminalId)
    }
  }

  // Elements (two-terminal, non-battery). Open switches carry no current.
  let hasOpenSwitch = false
  const elements: Element[] = []
  for (const c of graph.components) {
    if (c.type === 'battery' || c.terminals.length !== 2) continue
    if (c.type === 'switch' && !c.isOn) {
      hasOpenSwitch = true
      continue
    }
    const resistance =
      c.type === 'lamp' || c.type === 'resistor'
        ? Math.max(c.resistance ?? DEFAULT_LOAD_RESISTANCE, MIN_LOAD_RESISTANCE)
        : WIRE_RESISTANCE
    elements.push({
      component: c,
      netA: nets.find(c.terminals[0].id),
      netB: nets.find(c.terminals[1].id),
      resistance
    })
  }

  const posNet = nets.find(pos.id)
  const negNet = nets.find(neg.id)

  // Short circuit: battery terminals joined by wires or only ideal conductors.
  const ideal = new UnionFind()
  for (const el of elements) {
    if (el.component.type === 'wire' || el.component.type === 'switch') ideal.union(el.netA, el.netB)
  }
  if (posNet === negNet || ideal.find(posNet) === ideal.find(negNet)) {
    return emptyReport(SolverStatus.SHORT_CIRCUIT, ReasonCode.BATTERY_SHORT, V, zeroResults())
  }

  // Nets reachable from either battery terminal through elements.
  const adjacency = new Map<string, string[]>()
  const link = (a: string, b: string) => {
    if (!adjacency.has(a)) adjacency.set(a, [])
    adjacency.get(a)!.push(b)
  }
  for (const el of elements) {
    link(el.netA, el.netB)
    link(el.netB, el.netA)
  }
  const reachable = new Set<string>([posNet, negNet])
  const stack = [posNet, negNet]
  while (stack.length) {
    const n = stack.pop()!
    for (const m of adjacency.get(n) ?? []) {
      if (!reachable.has(m)) {
        reachable.add(m)
        stack.push(m)
      }
    }
  }

  // Nodal analysis: unknown potentials for reachable nets other than pos/neg.
  const unknowns = [...reachable].filter(n => n !== posNet && n !== negNet)
  const index = new Map(unknowns.map((n, i) => [n, i]))
  const m = unknowns.length
  const A = Array.from({ length: m }, () => new Array<number>(m).fill(0))
  const rhs = new Array<number>(m).fill(0)
  const fixed = (n: string): number | null => (n === posNet ? V : n === negNet ? 0 : null)

  for (const el of elements) {
    if (!reachable.has(el.netA) || el.netA === el.netB) continue
    const g = 1 / el.resistance
    for (const [self, other] of [[el.netA, el.netB], [el.netB, el.netA]] as const) {
      const i = index.get(self)
      if (i === undefined) continue
      A[i][i] += g
      const j = index.get(other)
      if (j !== undefined) A[i][j] -= g
      else rhs[i] += g * (fixed(other) ?? 0)
    }
  }

  const solution = m === 0 ? [] : solveLinear(A, rhs)
  if (!solution) {
    return emptyReport(SolverStatus.UNSUPPORTED_TOPOLOGY, ReasonCode.UNKNOWN, V, zeroResults())
  }
  const potential = (n: string): number => fixed(n) ?? solution[index.get(n)!] ?? 0

  const results = new Map<string, ComponentSimulationResult>()
  let totalCurrent = 0
  for (const el of elements) {
    const dv = potential(el.netA) - potential(el.netB)
    const current = Math.abs(dv) / el.resistance
    const energized = reachable.has(el.netA) && current > CURRENT_EPSILON
    results.set(el.component.id, {
      componentId: el.component.id,
      isEnergized: energized,
      voltage: energized ? Math.abs(dv) : 0,
      current: energized ? current : 0,
      power: energized ? Math.abs(dv) * current : 0
    })
    // Current leaving the positive net.
    if (el.netA === posNet && el.netB !== posNet) totalCurrent += dv / el.resistance
    else if (el.netB === posNet && el.netA !== posNet) totalCurrent -= dv / el.resistance
  }

  if (totalCurrent < CURRENT_EPSILON) {
    return emptyReport(
      SolverStatus.NO_PATH,
      hasOpenSwitch ? ReasonCode.SWITCH_OFF : ReasonCode.NO_ENERGIZED_PATH,
      V,
      zeroResults()
    )
  }

  results.set(battery.id, {
    componentId: battery.id,
    isEnergized: true,
    voltage: V,
    current: totalCurrent,
    power: V * totalCurrent
  })

  return {
    status: SolverStatus.VALID,
    reason: ReasonCode.OK,
    batteryVoltage: V,
    componentResults: graph.components.map(
      c =>
        results.get(c.id) ?? {
          componentId: c.id,
          isEnergized: false,
          voltage: 0,
          current: 0,
          power: 0
        }
    ),
    totalCurrent,
    totalPower: V * totalCurrent,
    timestamp: Date.now()
  }
}

export function isLampIlluminated(report: SimulationReport, lampId: string): boolean {
  return report.componentResults.find(r => r.componentId === lampId)?.isEnergized ?? false
}
