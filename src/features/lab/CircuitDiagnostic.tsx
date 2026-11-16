import type { CircuitGraph, SimulationReport } from '../../domain/circuit'
import { panel, panelHeading } from '../../ui/styles'

interface Props {
  graph: CircuitGraph
  report: SimulationReport
}

const fmt = (n: number, digits = 2) => n.toFixed(digits)

export function CircuitDiagnostic({ graph, report }: Props) {
  return (
    <section aria-labelledby="diagnostic-heading" className={panel} data-tour="diagnostic">
      <h2 id="diagnostic-heading" className={panelHeading}>
        Circuit diagnostic
      </h2>
      <dl className="mb-3 grid grid-cols-[auto,1fr] gap-x-3 gap-y-1 text-sm">
        <dt className="text-slate-400">Status</dt>
        <dd data-testid="diag-status" className="font-mono text-observatory-aqua">{report.status}</dd>
        <dt className="text-slate-400">Reason</dt>
        <dd data-testid="diag-reason" className="text-slate-100">{report.reason}</dd>
        <dt className="text-slate-400">Battery</dt>
        <dd className="font-mono text-slate-100">{fmt(report.batteryVoltage)} V</dd>
        <dt className="text-slate-400">Total current</dt>
        <dd className="font-mono text-slate-100">{fmt(report.totalCurrent * 1000, 1)} mA</dd>
      </dl>
      {graph.components.length > 0 && (
        // At 320 px (400% zoom) a 4-column table can be wider than the panel with some fonts. It scrolls inside this
        // focusable region (WCAG 1.4.10 allows 2-D scrolling for data tables) instead of scrolling the whole page.
        <div role="region" aria-label="Component readings" tabIndex={0} className="overflow-x-auto rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-observatory-gold">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">Voltage and current for each component, from the simulation report</caption>
          <thead>
            <tr className="text-slate-400">
              <th scope="col" className="py-1">Component</th>
              <th scope="col">Voltage</th>
              <th scope="col">Current</th>
              <th scope="col">State</th>
            </tr>
          </thead>
          <tbody>
            {graph.components.map(c => {
              const r = report.componentResults.find(x => x.componentId === c.id)
              return (
                <tr key={c.id} data-testid={`diag-row-${c.id}`} className="border-t border-observatory-navy-lighter">
                  <th scope="row" className="py-1 font-normal text-slate-100">{c.label ?? c.id}</th>
                  <td className="font-mono">{fmt(r?.voltage ?? 0)} V</td>
                  <td className="font-mono">{fmt((r?.current ?? 0) * 1000, 1)} mA</td>
                  <td>{r?.isEnergized ? 'Energized' : 'Idle'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
        </div>
      )}
      <p className="mt-3 text-xs text-slate-400">
        Simplified DC model: ideal battery, ohmic lamps and resistors. Not a full physics simulation.
      </p>
    </section>
  )
}
