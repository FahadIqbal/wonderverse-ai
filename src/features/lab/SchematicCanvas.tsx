import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type PointerEvent as ReactPointerEvent } from 'react'
import {
  FOOTPRINT,
  LARGE_STEP_CELLS,
  componentPosition,
  stepTarget,
  type CircuitComponent,
  type CircuitGraph,
  type SimulationReport,
  type Terminal,
} from '../../domain/circuit'
import { PALETTE } from '../../ui/palette'
import { pointerKind } from './drag/dragController'
import { useComponentDrag } from './drag/useComponentDrag'
import { terminalLabel, useLabStore } from './labStore'
import { DEFAULT_STAGE_PX, VIEW_WIDTH, VIEW_X, bodyHitSize, labelFontSize, stageScale, terminalHitRadius, terminalHitShift } from './stageScale'
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

const center = componentPosition

/**
 * Schematic viewBox: the bench (part centres 80 to 580, parts 90 wide, terminals 35 either side) plus a margin. Fixed, so
 * the picture does not jump while a part is dragged. The svg is always drawn at the container width (no sideways scroll)
 * and client pixels map to model units by VIEW_WIDTH / rect.width. Model coordinates never change with the screen size.
 */
const ARROWS: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }

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

function TerminalDot({ terminal, graph, pending, stagePx, side }: { terminal: Terminal; graph: CircuitGraph; pending: boolean; stagePx: number; side: -1 | 1 }) {
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
      {/* Invisible hit area, sized in model units so it is at least 44 CSS px across at the current stage width, and moved
          outward (away from the part) on a phone so it does not cover the middle of the part body. */}
      <circle
        cx={terminal.position.x + side * terminalHitShift(stagePx)}
        cy={terminal.position.y}
        r={terminalHitRadius(stagePx)}
        fill="transparent"
        data-testid="terminal-hit"
      />
      <circle
        cx={terminal.position.x}
        cy={terminal.position.y}
        r={Math.max(9, 7 / stageScale(stagePx))}
        fill={pending ? GOLD : NAVY}
        stroke={pending ? GOLD : STROKE}
        strokeWidth={3}
      />
    </g>
  )
}
export function SchematicCanvas({ graph: storedGraph, report }: Props) {
  const moveComponent = useLabStore(s => s.moveComponent)
  const svgRef = useRef<SVGSVGElement>(null)
  const [stagePx, setStagePx] = useState(DEFAULT_STAGE_PX)
  // Track the real drawn size so hit areas and labels can be sized for it. The svg may be letterboxed (on a phone held
  // sideways its height is capped), so the scale is the smaller of the width and height ratios. jsdom has no layout:
  // it keeps the default.
  const viewHeightRef = useRef(260)
  useLayoutEffect(() => {
    const el = svgRef.current
    if (!el) return
    const read = () => {
      const r = el.getBoundingClientRect()
      if (r.width <= 0 || r.height <= 0) return
      const px = Math.min(r.width, (r.height * VIEW_WIDTH) / viewHeightRef.current)
      setStagePx(Math.round(px))
    }
    read()
    if (typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(read)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  const suppressClick = useRef(false)
  const drag = useComponentDrag(storedGraph, moveComponent)
  // While a part is being dragged, draw it (and so its wires) at the snapped preview spot. The store changes on drop.
  const graph = drag.displayGraph
  const dragging = drag.state.phase === 'dragging' ? drag.state : null
  // `touch-action: none` is ignored on svg child elements in some browsers, so a finger drag on a part would start
  // scrolling the stage instead. Cancelling touchmove while a finger is down on a part keeps the part under the finger.
  // Taps, and a finger on empty space (which scrolls the stage sideways on a phone), are left alone.
  const getDragState = drag.getState
  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return
    const stop = (e: TouchEvent) => {
      if (getDragState().phase !== 'idle' && e.cancelable) e.preventDefault()
    }
    svg.addEventListener('touchmove', stop, { passive: false })
    return () => svg.removeEventListener('touchmove', stop)
  }, [getDragState])
  const layoutPoint = (e: ReactPointerEvent) => {
    const svg = svgRef.current
    // The browser's own transform handles the viewBox origin and any letterboxing.
    const ctm = svg?.getScreenCTM?.()
    if (svg && ctm && svg.createSVGPoint) {
      const pt = svg.createSVGPoint()
      pt.x = e.clientX
      pt.y = e.clientY
      const p = pt.matrixTransform(ctm.inverse())
      return { x: p.x, y: p.y }
    }
    const rect = svg?.getBoundingClientRect()
    const scale = rect && rect.width > 0 ? VIEW_WIDTH / rect.width : 1
    return { x: VIEW_X + (e.clientX - (rect?.left ?? 0)) * scale, y: (e.clientY - (rect?.top ?? 0)) * scale }
  }
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
  const height = Math.max(230, maxY + 100)
  viewHeightRef.current = height

  return (
    <div
      className={`overflow-hidden rounded-2xl border border-observatory-navy-lighter bg-observatory-navy shadow-[inset_0_0_40px_rgba(84,229,211,0.04)] ${shaking ? 'reject-shake' : ''}`}
      data-testid="schematic-stage"
      data-tour="ports"
      data-rejected={String(shaking)}
    >
    <svg
      ref={svgRef}
      viewBox={`${VIEW_X} 0 ${VIEW_WIDTH} ${height}`}
      preserveAspectRatio="xMidYMid meet"
      role="group"
      aria-label="Circuit schematic"
      className="block h-auto w-full select-none [@media(max-height:500px)]:max-h-[165px]"
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

      {dragging && (
        <g data-testid="snap-preview" data-valid={String(dragging.plan.ok)} pointerEvents="none">
          <rect
            x={dragging.plan.position.x - FOOTPRINT.width / 2}
            y={dragging.plan.position.y - FOOTPRINT.height / 2}
            width={FOOTPRINT.width}
            height={FOOTPRINT.height}
            rx={12}
            fill={dragging.plan.ok ? PALETTE.aqua : PALETTE.coral}
            fillOpacity={0.1}
            stroke={dragging.plan.ok ? PALETTE.aqua : PALETTE.coral}
            strokeWidth={2}
            strokeDasharray={dragging.plan.ok ? '6 4' : undefined}
          />
          {!dragging.plan.ok && (
            <text x={dragging.plan.position.x} y={dragging.plan.position.y - FOOTPRINT.height / 2 - 6} textAnchor="middle" fill={PALETTE.coral} fontSize={13}>
              Taken, part will stay put
            </text>
          )}
        </g>
      )}
      {graph.components.map(c => {
        const { x, y } = center(c)
        const result = report.componentResults.find(r => r.componentId === c.id)
        const lit = c.type === 'lamp' && (result?.isEnergized ?? false)
        const name = c.label ?? c.id
        const isSwitch = c.type === 'switch'
        const isDragged = dragging?.componentId === c.id
        const keyboardHint = ' Arrow keys move it one grid step, Shift with arrows moves five.'
        return (
          <g key={c.id}>
            <g
              tabIndex={0}
              role={isSwitch ? 'button' : 'group'}
              aria-label={
                isSwitch
                  ? `${name} switch, currently ${c.isOn ? 'closed' : 'open'}. Press Enter to toggle, Delete to remove.${keyboardHint}`
                  : `${name}${c.type === 'lamp' ? (lit ? ', lit' : ', not lit') : ''}. Press Delete to remove.${keyboardHint}`
              }
              aria-pressed={isSwitch ? c.isOn : undefined}
              data-component-id={c.id}
              data-lit={c.type === 'lamp' ? String(lit) : undefined}
              data-dragging={isDragged ? 'true' : undefined}
              data-x={x}
              data-y={y}
              className={`group ${isDragged ? 'cursor-grabbing' : 'cursor-grab'}`}
              style={{ touchAction: 'none' }}
              onClick={
                isSwitch
                  ? () => {
                      if (!suppressClick.current) toggleSwitch(c.id)
                    }
                  : undefined
              }
              onPointerDown={e => {
                if (!e.isPrimary || (e.pointerType === 'mouse' && e.button !== 0)) return
                try {
                  e.currentTarget.setPointerCapture(e.pointerId)
                } catch {
                  // Capture is a convenience; the drag still works while the pointer stays over the part.
                }
                drag.press(c.id, { x: e.clientX, y: e.clientY }, layoutPoint(e), pointerKind(e.pointerType))
              }}
              onPointerMove={e => {
                if (drag.state.phase !== 'idle') drag.move({ x: e.clientX, y: e.clientY }, layoutPoint(e))
              }}
              onPointerUp={e => {
                if (e.currentTarget.hasPointerCapture?.(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId)
                const outcome = drag.release()
                if (outcome.kind === 'drop') {
                  // The browser sends a click after pointerup. A drag that ends on a switch must not toggle it.
                  suppressClick.current = true
                  setTimeout(() => {
                    suppressClick.current = false
                  }, 0)
                }
              }}
              onPointerCancel={() => drag.cancel()}
              onKeyDown={e => {
                const step = ARROWS[e.key]
                if (step && !e.ctrlKey && !e.metaKey && !e.altKey) {
                  e.preventDefault()
                  const n = e.shiftKey ? LARGE_STEP_CELLS : 1
                  moveComponent(c.id, stepTarget(center(c), step[0] * n, step[1] * n))
                } else if (e.key === 'Escape' && drag.state.phase !== 'idle') {
                  e.stopPropagation()
                  drag.cancel()
                } else if (isDeleteKey(e)) {
                  e.preventDefault()
                  removeComponent(c.id)
                } else if (isSwitch && isActivateKey(e)) {
                  e.preventDefault()
                  toggleSwitch(c.id)
                }
              }}
            >
              {/* Hover, focus and drag halo. A solid outline, so it does not depend on colour or motion. */}
              <rect
                x={x - FOOTPRINT.width / 2 + 4}
                y={y - 32}
                width={FOOTPRINT.width - 8}
                height={64}
                rx={10}
                fill="none"
                stroke={GOLD}
                strokeWidth={2}
                className={`${isDragged ? 'opacity-100' : 'opacity-0'} group-hover:opacity-100 group-focus-visible:opacity-100`}
                data-testid={`halo-${c.id}`}
              />
              <rect
                x={x - bodyHitSize(stagePx).width / 2}
                y={y - bodyHitSize(stagePx).height / 2}
                width={bodyHitSize(stagePx).width}
                height={bodyHitSize(stagePx).height}
                fill="transparent"
              />
              <Symbol c={c} lit={lit} pulse={!calm} />
            </g>
            <text x={x} y={y + 50} textAnchor="middle" fill={LABEL} fontSize={labelFontSize(stagePx)}>
              {name}
              {c.type === 'lamp' ? (lit ? ' (lit)' : ' (off)') : ''}
              {isSwitch ? (c.isOn ? ' (closed)' : ' (open)') : ''}
            </text>
            {c.terminals.map(t => (
              <TerminalDot key={t.id} terminal={t} graph={graph} pending={pendingTerminalId === t.id} stagePx={stagePx} side={t.position.x < x ? -1 : 1} />
            ))}
          </g>
        )
      })}
    </svg>
    </div>
  )
}
