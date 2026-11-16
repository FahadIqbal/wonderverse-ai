import type { CircuitGraph } from './types'
import type { SimulationReport } from './dcSolver'
/** What an ideal meter placed on one component shows. Every number is copied from the report. */
export interface MeterReading {
  componentId: string
  label: string
  type: string
  /** Voltage across the component, in volts, as reported. */
  voltage: number
  /** Current through the component, in amps, as reported. */
  current: number
  energized: boolean
  /** Why the numbers may be zero, in plain words. Empty when the part is energized. */
  note: string
}
/**
 * Reads the report for one component. Returns null when the component is not in the graph or the report has no
 * entry for it (for example a stale id). It does no circuit analysis of its own.
 */
export function readMeter(report: SimulationReport, graph: CircuitGraph, componentId: string): MeterReading | null {
  const component = graph.components.find(c => c.id === componentId)
  const result = report.componentResults.find(r => r.componentId === componentId)
  if (!component) return null
  const energized = result?.isEnergized ?? false
  const voltage = result?.voltage ?? 0
  const current = result?.current ?? 0
  let note = ''
  if (!energized) {
    note =
      report.status === 'VALID'
        ? 'The simulation reports no current through this part, so the meter shows zero. The model does not report a voltage for idle parts.'
        : `The simulation reports no working circuit (${report.reason}), so the meter shows zero.`
  }
  return { componentId, label: component.label ?? component.id, type: component.type, voltage, current, energized, note }
}
