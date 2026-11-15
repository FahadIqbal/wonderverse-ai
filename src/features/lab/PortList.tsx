import type { SimulationReport } from '../../domain/circuit'
import { useLabStore } from './labStore'
import { secondaryButton } from '../../ui/styles'

/**
 * Keyboard and screen-reader path for the 3D view. Every port and switch in the
 * canvas has a button here that calls the same labStore actions as the pointer path.
 */
export function PortList({ report }: { report: SimulationReport }) {
  const graph = useLabStore(s => s.graph)
  const pending = useLabStore(s => s.pendingTerminalId)
  const selectTerminal = useLabStore(s => s.selectTerminal)
  const toggleSwitch = useLabStore(s => s.toggleSwitch)

  return (
    <section aria-labelledby="ports-heading" className="rounded-lg border border-observatory-navy-lighter bg-observatory-navy-light p-4">
      <h2 id="ports-heading" className="mb-2 text-lg font-semibold text-observatory-gold">
        Components and ports
      </h2>
      <p className="mb-3 text-xs text-slate-400">
        Choose one port, then a second port, to connect them. These buttons do the same thing as clicking in the 3D view.
      </p>
      {graph.components.length === 0 ? (
        <p className="text-sm text-slate-300">No parts yet. Add one from the tray.</p>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-3 p-0">
          {graph.components.map(c => {
            const lit = report.componentResults.find(r => r.componentId === c.id)?.isEnergized ?? false
            const name = c.label ?? c.id
            return (
              <li key={c.id} className="flex flex-wrap items-center gap-2">
                <span className="min-w-[8rem] text-sm font-semibold text-slate-100">
                  {name}
                  {c.type === 'lamp' ? (lit ? ' (lit)' : ' (not lit)') : ''}
                </span>
                {c.terminals.map(t => (
                  <button
                    key={t.id}
                    type="button"
                    aria-pressed={pending === t.id}
                    aria-label={`${name} ${t.name} port`}
                    className={`${secondaryButton} min-h-[44px]`}
                    onClick={() => selectTerminal(t.id)}
                  >
                    {t.name} port{pending === t.id ? ' (selected)' : ''}
                  </button>
                ))}
                {c.type === 'switch' && (
                  <button
                    type="button"
                    className={`${secondaryButton} min-h-[44px]`}
                    onClick={() => toggleSwitch(c.id)}
                  >
                    Toggle {name}, currently {c.isOn ? 'closed' : 'open'}
                  </button>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
