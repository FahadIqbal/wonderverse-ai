import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { panel, secondaryButton } from '../../ui/styles'
import { CircuitAnnouncer } from './CircuitAnnouncer'
import { FeedbackBar } from './FeedbackBar'
import { HistoryControls } from './HistoryControls'
import { CircuitDiagnostic } from './CircuitDiagnostic'
import { ComponentTray } from './ComponentTray'
import { SceneErrorBoundary } from './SceneErrorBoundary'
import { MeterPanel } from './MeterPanel'
import { PortList } from './PortList'
import { SchematicEditor } from './SchematicEditor'
import { useSettingsStore } from './settingsStore'
import { useMotionPreference } from './useMotionPreference'
import { useLabStore } from './labStore'
import { useSimulationReport } from './useSimulationReport'
import { isWebGLAvailable } from './scene/webgl'

// three.js and R3F live in this lazy chunk; nothing else imports them.
const LabScene = lazy(() => import('./scene/LabScene'))

type View = '3d' | 'schematic'

function prefersSchematicByDefault(): boolean {
  return typeof window.matchMedia === 'function' && window.matchMedia('(max-width: 639px)').matches
}

const toggleBase =
  'min-h-[44px] px-4 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ' +
  'focus-visible:outline-observatory-gold disabled:cursor-not-allowed disabled:opacity-40'

function ViewToggle({
  view,
  onChange,
  canUse3d,
}: {
  view: View
  onChange: (v: View) => void
  canUse3d: boolean
}) {
  const on = 'bg-observatory-aqua text-observatory-navy'
  const off = 'bg-observatory-navy-lighter text-observatory-aqua hover:bg-observatory-navy-light'
  return (
    <div role="group" aria-label="Lab view" className="inline-flex overflow-hidden rounded-md border border-observatory-aqua/60">
      <button
        type="button"
        aria-pressed={view === '3d'}
        disabled={!canUse3d}
        aria-describedby={canUse3d ? undefined : 'fallback-note'}
        className={`${toggleBase} ${view === '3d' ? on : off}`}
        onClick={() => onChange('3d')}
      >
        3D workbench
      </button>
      <button
        type="button"
        aria-pressed={view === 'schematic'}
        className={`${toggleBase} ${view === 'schematic' ? on : off}`}
        onClick={() => onChange('schematic')}
      >
        Schematic
      </button>
    </div>
  )
}

function Workbench3D({ onContextLost }: { onContextLost: () => void }) {
  const graph = useLabStore(s => s.graph)
  const pending = useLabStore(s => s.pendingTerminalId)
  const feedback = useLabStore(s => s.feedback)
  const report = useSimulationReport()
  const cancelConnection = useLabStore(s => s.cancelConnection)
  const selectTerminal = useLabStore(s => s.selectTerminal)
  const toggleSwitch = useLabStore(s => s.toggleSwitch)
  const lowPower = useSettingsStore(s => s.lowPower)
  const setLowPower = useSettingsStore(s => s.setLowPower)
  const motion = useMotionPreference()
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') cancelConnection()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [cancelConnection])
  const lamps = graph.components.filter(c => c.type === 'lamp')
  const lampSummary = lamps
    .map(l => {
      const lit = report.componentResults.find(r => r.componentId === l.id)?.isEnergized ?? false
      return `${l.label ?? l.id} is ${lit ? 'lit' : 'not lit'}`
    })
    .join('. ')
  return (
    <div className="flex flex-col gap-4">
      <FeedbackBar feedback={feedback} />
      <figure className="m-0">
        <div
          role="img"
          aria-label={`3D workbench with ${graph.components.length} parts and ${graph.wires.length} wires. ${lampSummary}`}
          data-testid="scene-stage"
          className="h-[360px] w-full overflow-hidden rounded-2xl border border-observatory-navy-lighter bg-observatory-navy sm:h-[440px] lg:h-[440px]"
        >
          <Suspense
            fallback={
              <p role="status" className="p-6 text-slate-300">
                Loading the 3D workbench…
              </p>
            }
          >
            <LabScene
              graph={graph}
              report={report}
              pendingTerminalId={pending}
              motion={motion}
              onContextLost={onContextLost}
              onSelectTerminal={selectTerminal}
              onToggleSwitch={toggleSwitch}
            />
          </Suspense>
        </div>
        <figcaption className="mt-2 text-xs text-slate-400">
          Drag to orbit, pinch or scroll to zoom. Click or tap a glowing port, then a second port, to connect them.
          Click a switch to open or close it. Escape cancels. The same actions are in the list below.
        </figcaption>
      </figure>
      <ComponentTray />
      <label className="flex min-h-[44px] items-center gap-3 text-sm text-slate-200">
        <input type="checkbox" checked={lowPower} onChange={e => setLowPower(e.target.checked)} className="h-5 w-5" />
        Low-power mode (turns off animation and lowers the 3D detail)
      </label>
      <PortList report={report} />
      <CircuitDiagnostic graph={graph} report={report} />
    </div>
  )
}

/**
 * Switches between the 3D workbench and the schematic editor. Both read the same
 * labStore graph. Falls back to the schematic when WebGL is missing or the scene crashes (R7).
 */
export function LabWorkbench() {
  const [webgl] = useState(isWebGLAvailable)
  const [failure, setFailure] = useState<'crash' | 'context-lost' | null>(null)
  const [retryKey, setRetryKey] = useState(0)
  const [view, setView] = useState<View>(() => (webgl && !prefersSchematicByDefault() ? '3d' : 'schematic'))
  const sectionRef = useRef<HTMLElement>(null)
  const retryRef = useRef<HTMLButtonElement>(null)
  const refocusToggle = useRef(false)
  const onContextLost = useCallback(() => setFailure('context-lost'), [])
  const onSceneCrash = useCallback(() => setFailure('crash'), [])
  const canUse3d = webgl && failure === null
  // The control that had focus may have just disabled or unmounted. Never leave keyboard focus on <body>.
  useEffect(() => {
    if (failure && (document.activeElement === document.body || document.activeElement === null)) retryRef.current?.focus()
  }, [failure])
  useEffect(() => {
    if (refocusToggle.current && failure === null) {
      refocusToggle.current = false
      sectionRef.current?.querySelector<HTMLElement>('[role="group"][aria-label="Lab view"] button')?.focus()
    }
  }, [failure, retryKey])
  const effective: View = canUse3d ? view : 'schematic'
  return (
    <section ref={sectionRef} aria-label="Lab workbench" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <ViewToggle view={effective} onChange={setView} canUse3d={canUse3d} />
        {failure && webgl && (
          <button
            type="button"
            ref={retryRef}
            className={secondaryButton}
            onClick={() => {
              refocusToggle.current = true
              setFailure(null)
              setRetryKey(k => k + 1)
              setView('3d')
            }}
          >
            Try 3D again
          </button>
        )}
        <HistoryControls />
      </div>
      <CircuitAnnouncer />
      {!webgl && (
        <p role="status" id="fallback-note" data-testid="fallback-note" className={`${panel} text-sm text-slate-200`}>
          3D is not available in this browser (WebGL is off or unsupported), so you are using the schematic editor. You
          can still finish the whole mission here.
        </p>
      )}
      {webgl && failure === 'crash' && (
        <p role="alert" id="fallback-note" data-testid="fallback-note" className={`${panel} text-sm text-slate-200`}>
          The 3D workbench stopped working, so you are using the schematic editor. Your circuit is kept. You can still
          finish the whole mission here.
        </p>
      )}
      {webgl && failure === 'context-lost' && (
        <p role="alert" id="fallback-note" data-testid="fallback-note" className={`${panel} text-sm text-slate-200`}>
          The browser took back the graphics connection the 3D workbench was using, so you are on the schematic editor.
          Your circuit is kept. You can still finish the whole mission here, or press Try 3D again.
        </p>
      )}
      {effective === '3d' ? (
        <SceneErrorBoundary key={retryKey} onError={onSceneCrash}>
          <Workbench3D onContextLost={onContextLost} />
        </SceneErrorBoundary>
      ) : (
        <SchematicEditor />
      )}
      <MeterPanel />
    </section>
  )
}
