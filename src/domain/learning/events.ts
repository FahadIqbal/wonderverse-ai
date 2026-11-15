import { isLampIlluminated, solveCircuit, type CircuitGraph } from '../circuit'
import type { SemanticEvent } from './schemas'

function litLampIds(graph: CircuitGraph): string[] {
  const report = solveCircuit(graph)
  if (report.status !== 'VALID') return []
  return graph.components.filter(c => c.type === 'lamp' && isLampIlluminated(report, c.id)).map(c => c.id).sort()
}
const sameIds = (a: string[], b: string[]) => a.length === b.length && a.every((id, i) => id === b[i])
/** Derives semantic events from a graph change. Pure; lamp state comes from the solver report. */
export function diffGraphEvents(prev: CircuitGraph, next: CircuitGraph): SemanticEvent[] {
  const events: SemanticEvent[] = []
  const prevComponents = new Map(prev.components.map(c => [c.id, c]))
  const nextComponents = new Map(next.components.map(c => [c.id, c]))
  const prevWires = new Set(prev.wires.map(w => w.id))
  const nextWires = new Set(next.wires.map(w => w.id))

  for (const c of next.components) {
    if (!prevComponents.has(c.id)) events.push({ type: 'component_added', componentId: c.id, componentType: c.type })
  }
  for (const c of prev.components) {
    if (!nextComponents.has(c.id)) events.push({ type: 'component_removed', componentId: c.id })
  }
  for (const w of next.wires) {
    if (!prevWires.has(w.id)) events.push({ type: 'wire_added', wireId: w.id })
  }
  for (const w of prev.wires) {
    if (!nextWires.has(w.id)) events.push({ type: 'wire_removed', wireId: w.id })
  }

  const toggled = next.components.filter(c => {
    const before = prevComponents.get(c.id)
    return c.type === 'switch' && before !== undefined && before.isOn !== c.isOn
  })
  const litBefore = litLampIds(prev)
  const litAfter = litLampIds(next)
  for (const s of toggled) {
    events.push({ type: 'switch_toggled', componentId: s.id, isOn: s.isOn, lampLit: litAfter.length > 0, litBefore, litAfter })
  }
  if (!sameIds(litBefore, litAfter)) events.push({ type: 'lamp_state_changed', litBefore, litAfter })
  return events
}
