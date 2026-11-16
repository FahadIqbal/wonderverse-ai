import type { ComponentType } from '../../domain/circuit'
import { BatteryIcon, LampIcon, ResistorIcon, SwitchIcon, WireIcon } from '../../ui/icons'
import { panel, panelHeading } from '../../ui/styles'
import { useLabStore } from './labStore'

const ICONS = { battery: BatteryIcon, lamp: LampIcon, resistor: ResistorIcon, switch: SwitchIcon, wire: WireIcon } as const
const TRAY_ITEMS: { type: ComponentType; name: string }[] = [
  { type: 'battery', name: 'Battery' },
  { type: 'lamp', name: 'Lamp' },
  { type: 'resistor', name: 'Resistor' },
  { type: 'switch', name: 'Switch' },
  { type: 'wire', name: 'Jumper wire' },
]

const buttonClass =
  'inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-observatory-aqua/60 bg-observatory-navy-lighter px-3 py-2 text-sm font-semibold text-observatory-aqua ' +
  'hover:bg-observatory-aqua hover:text-observatory-navy focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ' +
  'focus-visible:outline-observatory-gold disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-observatory-navy-lighter ' +
  'disabled:hover:text-observatory-aqua'

export function ComponentTray() {
  const addComponent = useLabStore(s => s.addComponent)
  const clearCircuit = useLabStore(s => s.clearCircuit)
  const hasBattery = useLabStore(s => s.graph.components.some(c => c.type === 'battery'))
  const isEmpty = useLabStore(s => s.graph.components.length === 0)

  return (
    <section aria-labelledby="tray-heading" className={panel} data-tour="tray">
      <h2 id="tray-heading" className={panelHeading}>
        Component tray
      </h2>
      <div className="flex flex-wrap gap-2">
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
              onClick={() => addComponent(item.type)}
            >
              <ItemIcon className="h-5 w-5" />
              Add {item.name}
            </button>
          )
        })}
        <button type="button" className={buttonClass} disabled={isEmpty} onClick={clearCircuit}>
          Clear circuit
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
