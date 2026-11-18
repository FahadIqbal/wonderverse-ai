import type { ComponentType } from '../../domain/circuit'
import { BatteryIcon, LampIcon, ResistorIcon, SwitchIcon, WireIcon } from '../../ui/icons'
import { panel } from '../../ui/styles'
import { useLabStore } from './labStore'

const ICONS = { battery: BatteryIcon, lamp: LampIcon, resistor: ResistorIcon, switch: SwitchIcon, wire: WireIcon } as const
const TRAY_ITEMS: { type: ComponentType; name: string; short?: string }[] = [
  { type: 'battery', name: 'Battery' },
  { type: 'lamp', name: 'Lamp' },
  { type: 'resistor', name: 'Resistor' },
  { type: 'switch', name: 'Switch' },
  { type: 'wire', name: 'Jumper wire', short: 'Jumper' },
]

const buttonClass =
  'inline-flex min-h-[44px] items-center justify-center gap-1.5 sm:gap-2 rounded-lg border border-observatory-aqua/60 bg-observatory-navy-lighter px-3 py-2 text-sm font-semibold text-observatory-aqua ' +
  'hover:bg-observatory-aqua hover:text-observatory-navy focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ' +
  'focus-visible:outline-observatory-gold disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-observatory-navy-lighter ' +
  'disabled:hover:text-observatory-aqua'

export function ComponentTray() {
  const addComponent = useLabStore(s => s.addComponent)
  const clearCircuit = useLabStore(s => s.clearCircuit)
  const hasBattery = useLabStore(s => s.graph.components.some(c => c.type === 'battery'))
  const isEmpty = useLabStore(s => s.graph.components.length === 0)

  return (
    <section aria-labelledby="tray-heading" className={`${panel} max-sm:p-2`} data-tour="tray">
      <h2
        id="tray-heading"
        className="mb-3 flex items-center gap-2 text-lg font-semibold text-observatory-gold before:h-4 before:w-1 before:rounded-full before:bg-observatory-gold before:content-[''] max-sm:sr-only"
      >
        Component tray
      </h2>
      <div className="grid grid-cols-3 gap-2 sm:flex sm:flex-wrap">
        {TRAY_ITEMS.map(item => {
          const blocked = item.type === 'battery' && hasBattery
          const ItemIcon = ICONS[item.type]
          return (
            <button
              key={item.type}
              type="button"
              className={buttonClass}
              disabled={blocked}
              aria-describedby={blocked ? 'battery-limit-hint' : undefined}
              aria-label={`Add ${item.name}`}
              onClick={() => addComponent(item.type)}
            >
              <ItemIcon className="h-5 w-5 shrink-0" />
              <span className="max-sm:text-xs">
                <span className="sm:hidden">{item.short ?? item.name}</span>
                <span className="hidden sm:inline">Add {item.name}</span>
              </span>
            </button>
          )
        })}
        <button type="button" className={buttonClass} disabled={isEmpty} onClick={clearCircuit}>
          <span className="max-sm:text-xs">Clear circuit</span>
        </button>
      </div>
      {hasBattery && (
        <p id="battery-limit-hint" className="mt-2 text-sm text-slate-300">
          The simulator supports one battery, so Add Battery is disabled.
        </p>
      )}
    </section>
  )
}
