import type { KeyboardEvent } from 'react'
import type { CircuitComponent, CircuitGraph, SimulationReport, Terminal } from '../../domain/circuit'
import { PALETTE } from '../../ui/palette'
import { terminalLabel, useLabStore } from './labStore'
import { useRecentlyAdded, useRejectionPulse } from './useFeedbackMotion'
import { useMotionPreference } from './useMotionPreference'

interface Props {
  graph: CircuitGraph
  report: SimulationReport
}

function isActivateKey(e: KeyboardEvent) {
  return e.key === 'Enter' || e.key === ' '
}
function isDeleteKey(e: KeyboardEvent) {
  return e.key === 'Delete' || e.key === 'Backspace'
}

function center(c: CircuitComponent) {
  const xs = c.terminals.map(t => t.position.x)
  const ys = c.terminals.map(t => t.position.y)
  return { x: (Math.min(...xs) + Math.max(...xs)) / 2, y: (Math.min(...ys) + Math.max(...ys)) / 2 }
}

const STROKE = PALETTE.aqua
const GOLD = PALETTE.gold
const NAVY = PALETTE.navy
const LABEL = PALETTE.text

function Symbol({ c, lit, pulse }: { c: CircuitComponent; lit: boolean; pulse: boolean }) {
  const { x, y } = center(c)
  switch (c.type) {
    case 'battery':
      return (
        <g stroke={STROKE} strokeWidth={3} fill="none">
          <line x1={x - 35} y1={y} x2={x - 8} y2={y} />
          <line x1={x + 8} y1={y} x2={x + 35} y2={y} />
          <line x1={x - 8} y1={y - 14} x2={x - 8} y2={y + 14} />
          <line x1={x + 8} y1={y - 8} x2={x + 8} y2={y + 8} />
          <text x={x - 20} y={y - 10} fill={LABEL} stroke="none" fontSize={12} textAnchor="middle">+</text>
        </g>
      )
    case 'lamp':
      return (
        <g>
          <line x1={x - 35} y1={y} x2={x - 16} y2={y} stroke={STROKE} strokeWidth={3} />
          <line x1={x + 16} y1={y} x2={x + 35} y2={y} stroke={STROKE} strokeWidth={3} />
          <circle
            cx={x}
            cy={y}
            r={26}
            fill={GOLD}
            opacity={lit ? 0.35 : 0}
            className={`transition-opacity duration-300 ${lit && pulse ? 'lamp-pulse' : ''}`}
            data-pulse={String(lit && pulse)}
            data-testid={`glow-${c.id}`}
          />
          <circle cx={x} cy={y} r={16} fill={lit ? GOLD : PALETTE.navyLight} stroke={lit ? GOLD : STROKE} strokeWidth={3} />
          <path
            d={`M ${x - 8} ${y - 8} L ${x + 8} ${y + 8} M ${x + 8} ${y - 8} L ${x - 8} ${y + 8}`}
            stroke={lit ? NAVY : STROKE}
            strokeWidth={2}
          />
        </g>
      )
    case 'resistor':
      return (
        <polyline
          fill="none"
          stroke={STROKE}
          strokeWidth={3}
          points={`${x - 35},${y} ${x - 22},${y} ${x - 16},${y - 10} ${x - 4},${y + 10} ${x + 8},${y - 10} ${x + 16},${y + 10} ${x + 22},${y} ${x + 35},${y}`}
        />
      )
    case 'switch':
      return (
        <g stroke={STROKE} strokeWidth={3} fill="none">
          <line x1={x - 35} y1={y} x2={x - 14} y2={y} />
          <line x1={x + 14} y1={y} x2={x + 35} y2={y} />
          {c.isOn ? <line x1={x - 14} y1={y} x2={x + 14} y2={y} /> : <line x1={x - 14} y1={y} x2={x + 10} y2={y - 16} />}
        </g>
      )
    default:
      return <line x1={x - 35} y1={y} x2={x + 35} y2={y} stroke={STROKE} strokeWidth={3} />
  }
}

function TerminalDot({ terminal, graph, pending }: { terminal: Terminal; graph: CircuitGraph; pending: boolean }) {
  const selectTerminal = useLabStore(s => s.selectTerminal)
  const label = terminalLabel(graph, terminal.id)
  return (
    <g
      tabIndex={0}
      role="button"
      aria-label={`Terminal ${label}`}
      aria-pressed={pending}
      data-terminal-id={terminal.id}
      className="cursor-pointer"
      onClick={() => selectTerminal(terminal.id)}
      onKeyDown={e => {
        if (isActivateKey(e)) {
          e.preventDefault()
          selectTerminal(terminal.id)
        }
      }}
    >
      {/* Invisible 44-unit hit area: the svg is shown at 1:1 or larger (see min width below), so this is a 44px target. */}
      <circle cx={terminal.position.x} cy={terminal.position.y} r={22} fill="transparent" />
      <circle
        cx={terminal.position.x}
        cy={terminal.position.y}
        r={9}
        fill={pending ? GOLD : NAVY}
        stroke={pending ? GOLD : STROKE}
        strokeWidth={3}
      />
    </g>
  )
}
export function SchematicCanvas({ graph, report }: Props) {
  const pendingTerminalId = useLabStore(s => s.pendingTerminalId)
  const removeComponent = useLabStore(s => s.removeComponent)
  const removeWire = useLabStore(s => s.removeWire)
  const toggleSwitch = useLabStore(s => s.toggleSwitch)
  const feedback = useLabStore(s => s.feedback)
  const { calm } = useMotionPreference()
  // Motion is cosmetic and optional. Under reduced motion or Low-power the new wire still changes colour, but nothing moves.
  const justConnected = useRecentlyAdded(graph.wires.map(w => w.id))
  const shaking = useRejectionPulse(feedback) && !calm

  const terminalPos = new Map<string, Terminal['position']>()
  for (const c of graph.components) for (const t of c.terminals) terminalPos.set(t.id, t.position)
  const maxY = Math.max(0, ...[...terminalPos.values()].map(p => p.y))
  const height = Math.max(260, maxY + 110)

  return (
    <div
      className={`overflow-x-auto rounded-2xl border border-observatory-navy-lighter bg-observatory-navy shadow-[inset_0_0_40px_rgba(84,229,211,0.04)] ${shaking ? 'reject-shake' : ''}`}
      data-testid="schematic-stage"
      data-tour="ports"
      data-rejected={String(shaking)}
    >
    <svg
      viewBox={`0 0 680 ${height}`}
      role="group"
      aria-label="Circuit schematic"
      className="w-full min-w-[680px]"
    >
      {graph.components.length === 0 && (
        <g>
          <rect x={90} y={height / 2 - 50} width={500} height={100} rx={18} fill="none" stroke={PALETTE.navyLighter} strokeWidth={2} strokeDasharray="8 8" />
          <text x={340} y={height / 2 + 5} textAnchor="middle" fill={PALETTE.muted} fontSize={16}>
            Add components from the tray to start building.
          </text>
        </g>
      )}

      {graph.wires.map(w => {
        const a = terminalPos.get(w.fromTerminalId)
        const b = terminalPos.get(w.toTerminalId)
        if (!a || !b) return null
        const fresh = justConnected.has(w.id)
        const label = `${w.id} from ${terminalLabel(graph, w.fromTerminalId)} to ${terminalLabel(graph, w.toTerminalId)}`
        // Route as an elbow so connected wires stay readable.
        const midX = (a.x + b.x) / 2
        const d = `M ${a.x} ${a.y} L ${midX} ${a.y} L ${midX} ${b.y} L ${b.x} ${b.y}`
        return (
          <g
            key={w.id}
            tabIndex={0}
            role="group"
            aria-label={`${label}. Press Delete to remove.`}
            data-wire-id={w.id}
            onKeyDown={e => {
              if (isDeleteKey(e)) {
                e.preventDefault()
                removeWire(w.id)
              }
            }}
          >
            <path
              d={d}
              pathLength={1}
              fill="none"
              stroke={fresh ? STROKE : GOLD}
              strokeWidth={fresh ? 5 : 3}
              strokeLinejoin="round"
              className={fresh && !calm ? 'wire-snap' : undefined}
              data-fresh={fresh ? 'true' : undefined}
            />
          </g>
        )
      })}

      {graph.components.map(c => {
        const { x, y } = center(c)
        const result = report.componentResults.find(r => r.componentId === c.id)
        const lit = c.type === 'lamp' && (result?.isEnergized ?? false)
        const name = c.label ?? c.id
        const isSwitch = c.type === 'switch'
        return (
          <g key={c.id}>
            <g
              tabIndex={0}
              role={isSwitch ? 'button' : 'group'}
              aria-label={
                isSwitch
                  ? `${name} switch, currently ${c.isOn ? 'closed' : 'open'}. Press Enter to toggle, Delete to remove.`
                  : `${name}${c.type === 'lamp' ? (lit ? ', lit' : ', not lit') : ''}. Press Delete to remove.`
              }
              aria-pressed={isSwitch ? c.isOn : undefined}
              data-component-id={c.id}
              data-lit={c.type === 'lamp' ? String(lit) : undefined}
              className={isSwitch ? 'cursor-pointer' : undefined}
              onClick={isSwitch ? () => toggleSwitch(c.id) : undefined}
              onKeyDown={e => {
                if (isDeleteKey(e)) {
                  e.preventDefault()
                  removeComponent(c.id)
                } else if (isSwitch && isActivateKey(e)) {
                  e.preventDefault()
                  toggleSwitch(c.id)
                }
              }}
            >
              <rect x={x - 45} y={y - 32} width={90} height={64} fill="transparent" />
              <Symbol c={c} lit={lit} pulse={!calm} />
            </g>
            <text x={x} y={y + 50} textAnchor="middle" fill={LABEL} fontSize={13}>
              {name}
              {c.type === 'lamp' ? (lit ? ' (lit)' : ' (off)') : ''}
              {isSwitch ? (c.isOn ? ' (closed)' : ' (open)') : ''}
            </text>
            {c.terminals.map(t => (
              <TerminalDot key={t.id} terminal={t} graph={graph} pending={pendingTerminalId === t.id} />
            ))}
          </g>
        )
      })}
    </svg>
    </div>
  )
}
