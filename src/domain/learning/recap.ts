import type { CircuitGraph, SimulationReport } from '../circuit'
import type { MissionRecap } from './session'
/**
 * Builds the recap facts from the graph and the final report. Readings are copied from the report;
 * nothing here computes physics. Only batteries and lamps are listed, the parts a learner reasons about.
 */
export function buildRecap(graph: CircuitGraph, report: SimulationReport, hintsUsed: number): MissionRecap {
  const counts: Record<string, number> = {}
  for (const c of graph.components) counts[c.type] = (counts[c.type] ?? 0) + 1
  const readings = graph.components
    .filter(c => c.type === 'battery' || c.type === 'lamp')
    .map(c => {
      const r = report.componentResults.find(x => x.componentId === c.id)
      return {
        label: c.label ?? c.id,
        voltage: r?.voltage ?? 0,
        current: r?.current ?? 0,
        energized: r?.isEnergized ?? false,
      }
    })
  return { counts, wires: graph.wires.length, readings, hintsUsed: Math.min(3, Math.max(0, hintsUsed)) }
}
const NAMES: Record<string, [string, string]> = {
  battery: ['battery', 'batteries'],
  lamp: ['lamp', 'lamps'],
  switch: ['switch', 'switches'],
  resistor: ['resistor', 'resistors'],
  wire: ['jumper wire', 'jumper wires'],
}
/** "1 battery, 2 lamps, 6 wires" from the persisted counts. Empty bench gives "nothing yet". */
export function describeCounts(recap: Pick<MissionRecap, 'counts' | 'wires'>): string {
  const parts = Object.entries(recap.counts)
    .filter(([, n]) => n > 0)
    .map(([type, n]) => `${n} ${(NAMES[type] ?? [type, `${type}s`])[n === 1 ? 0 : 1]}`)
  if (recap.wires > 0) parts.push(`${recap.wires} ${recap.wires === 1 ? 'wire' : 'wires'}`)
  return parts.length > 0 ? parts.join(', ') : 'nothing yet'
}
