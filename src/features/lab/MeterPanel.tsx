import { useId, useState } from 'react'
import { readMeter } from '../../domain/circuit'
import { panel, panelHeading } from '../../ui/styles'
import { useLabStore } from './labStore'
import { useSimulationReport } from './useSimulationReport'
const NONE = ''
/**
 * Learner-placed ideal meter. The learner picks a part; the readout shows voltage across it and current through it,
 * copied from the simulation report (readMeter does no physics). It sits outside the 3D and schematic views, so both
 * views share one control, and the readout is a polite live region for screen readers.
 */
export function MeterPanel() {
  const graph = useLabStore(s => s.graph)
  const report = useSimulationReport()
  const [target, setTarget] = useState(NONE)
  const selectId = useId()
  // A removed part leaves the meter unplaced instead of showing a stale reading.
  const reading = target === NONE ? null : readMeter(report, graph, target)
  const value = reading ? target : NONE
  return (
    <section aria-labelledby="meter-heading" className={panel} data-testid="meter-panel">
      <h2 id="meter-heading" className={panelHeading}>
        Meter
      </h2>
      <label htmlFor={selectId} className="block text-sm text-slate-200">
        Place the meter on a part
      </label>
      <select
        id={selectId}
        value={value}
        onChange={e => setTarget(e.target.value)}
        disabled={graph.components.length === 0}
        aria-describedby="meter-note"
        className="mt-1 min-h-[44px] w-full max-w-xs rounded-md border border-observatory-aqua/60 bg-observatory-navy px-2 text-sm text-observatory-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-observatory-gold"
      >
        <option value={NONE}>{graph.components.length === 0 ? 'Add a part first' : 'No part chosen'}</option>
        {graph.components.map(c => (
          <option key={c.id} value={c.id}>
            {c.label ?? c.id}
          </option>
        ))}
      </select>
      <p role="status" aria-live="polite" aria-atomic="true" data-testid="meter-readout" className="mt-3 min-h-[3rem] text-sm text-slate-100">
        {reading ? (
          <>
            <span className="font-semibold text-observatory-aqua">{reading.label}:</span>{' '}
            <span className="font-mono">{reading.voltage.toFixed(2)} V</span> across,{' '}
            <span className="font-mono">{(reading.current * 1000).toFixed(1)} mA</span> through.{' '}
            {reading.energized ? 'The simulation says this part is energized.' : reading.note}
          </>
        ) : (
          'Choose a part to see the voltage across it and the current through it.'
        )}
      </p>
      <p id="meter-note" className="text-xs text-slate-400">
        Ideal meter in a simplified model: it reads the simulation report and does not change the circuit.
      </p>
    </section>
  )
}
