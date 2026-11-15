import { CircuitDiagnostic } from './CircuitDiagnostic'
import { ComponentTray } from './ComponentTray'
import { SchematicCanvas } from './SchematicCanvas'
import { terminalLabel, useLabStore } from './labStore'
import { useSimulationReport } from './useSimulationReport'

const smallButton =
  'min-h-[44px] rounded border border-observatory-aqua/50 px-3 py-1 text-sm text-observatory-aqua hover:bg-observatory-aqua hover:text-observatory-navy ' +
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-observatory-gold'

export function SchematicEditor() {
  const graph = useLabStore(s => s.graph)
  const pending = useLabStore(s => s.pendingTerminalId)
  const feedback = useLabStore(s => s.feedback)
  const cancelConnection = useLabStore(s => s.cancelConnection)
  const removeComponent = useLabStore(s => s.removeComponent)
  const removeWire = useLabStore(s => s.removeWire)
  const toggleSwitch = useLabStore(s => s.toggleSwitch)
  const report = useSimulationReport()

  return (
    <div
      className="flex flex-col gap-4"
      onKeyDown={e => {
        if (e.key === 'Escape') cancelConnection()
      }}
    >
      <ComponentTray />

      <p className="text-sm text-slate-300">
        Connect two terminals: click or press Enter on the first, then the second. Escape cancels. With a part or wire
        focused, Delete removes it.
      </p>

      <div
        role="status"
        aria-live="polite"
        data-testid="feedback"
        data-kind={feedback?.kind ?? 'none'}
        className={`min-h-[2.5rem] rounded-md border px-3 py-2 text-sm ${
          feedback?.kind === 'error'
            ? 'border-red-400 bg-red-950/60 text-red-200'
            : 'border-observatory-navy-lighter bg-observatory-navy-light text-slate-200'
        }`}
      >
        {feedback?.text ?? 'Ready.'}
        {pending && <span className="sr-only"> Pending source: {terminalLabel(graph, pending)}.</span>}
      </div>

      <SchematicCanvas graph={graph} report={report} />

      <div className="grid gap-4 md:grid-cols-2">
        <CircuitDiagnostic graph={graph} report={report} />
        <section
          aria-labelledby="parts-heading"
          className="rounded-lg border border-observatory-navy-lighter bg-observatory-navy-light p-4"
        >
          <h2 id="parts-heading" className="mb-2 text-lg font-semibold text-observatory-gold">
            Parts and wires
          </h2>
          {graph.components.length === 0 && graph.wires.length === 0 ? (
            <p className="text-sm text-slate-400">Nothing placed yet.</p>
          ) : (
            <ul className="space-y-1 text-sm text-slate-100">
              {graph.components.map(c => (
                <li key={c.id} className="flex items-center justify-between gap-2">
                  <span>{c.label ?? c.id}</span>
                  <span className="flex gap-2">
                    {c.type === 'switch' && (
                      <button
                        type="button"
                        className={smallButton}
                        aria-pressed={c.isOn}
                        onClick={() => toggleSwitch(c.id)}
                      >
                        Toggle {c.label ?? c.id} ({c.isOn ? 'closed' : 'open'})
                      </button>
                    )}
                    <button type="button" className={smallButton} onClick={() => removeComponent(c.id)}>
                      Remove {c.label ?? c.id}
                    </button>
                  </span>
                </li>
              ))}
              {graph.wires.map(w => (
                <li key={w.id} className="flex items-center justify-between gap-2">
                  <span>
                    {w.id}: {terminalLabel(graph, w.fromTerminalId)} to {terminalLabel(graph, w.toTerminalId)}
                  </span>
                  <button type="button" className={smallButton} onClick={() => removeWire(w.id)}>
                    Remove {w.id}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}
