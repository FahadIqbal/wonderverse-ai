import { useMemo } from 'react'
import { solveCircuit } from '../../domain/circuit'
import { nextStep } from '../../domain/learning'
import { useLabStore } from '../lab/labStore'
import { useRecentlyAdded } from '../lab/useFeedbackMotion'
import { useMotionPreference } from '../lab/useMotionPreference'
import { CheckIcon } from '../../ui/icons'
import { panel, panelHeading, secondaryButton } from '../../ui/styles'
import { evaluate } from './missionMachine'
import { useMissionStore } from './missionStore'

export function MissionHUD() {
  const mission = useMissionStore(s => s.mission)
  const state = useMissionStore(s => s.state)
  const send = useMissionStore(s => s.send)
  const graph = useLabStore(s => s.graph)
  const report = useMemo(() => solveCircuit(graph), [graph])
  const evaluation = useMemo(() => evaluate(state, { mission, graph, report }), [state, mission, graph, report])

  const step = useMemo(
    () => nextStep(report, graph, { phase: state.phase, missionId: mission.id, achieved: state.achieved, lastAnswer: state.lastAnswer }),
    [report, graph, state.phase, state.achieved, state.lastAnswer, mission.id],
  )
  const { calm } = useMotionPreference()
  const justDone = useRecentlyAdded(state.achieved, 3)
  const lastTitle = mission.objectives.find(o => o.id === state.lastAchieved)?.title
  const allHints = state.hintsShown >= mission.hints.length
  const inProgress = state.phase === 'building' || state.phase === 'quiz'

  return (
    <section aria-labelledby="hud-heading" className={panel}>
      <h2 id="hud-heading" className={panelHeading}>
        {mission.title}: objectives
      </h2>
      <ul className="space-y-2 text-sm text-slate-100">
        {evaluation.objectives.map(o => {
          const done = state.achieved.includes(o.id)
          const fresh = justDone.has(o.id)
          return (
            <li key={o.id} data-testid={`objective-${o.id}`} data-done={String(done)} data-fresh={fresh ? 'true' : undefined} className={`rounded-md px-1 transition-colors duration-500 ${fresh ? 'bg-observatory-aqua/15' : ''}`}>
              <span aria-hidden="true" className={`mr-1 ${done ? 'text-observatory-aqua' : 'text-observatory-muted'} ${fresh && !calm ? 'tick-pop' : ''}`}>
                {done ? <CheckIcon className="inline h-4 w-4" /> : '○'}
              </span>
              <span className="font-semibold">{done ? 'Done:' : 'To do:'}</span> {o.title}
              {!done && <span className="block pl-5 text-slate-400">{o.detail}</span>}
            </li>
          )
        })}
      </ul>
      <div className="mt-3 rounded-md border border-observatory-gold/50 bg-observatory-gold/10 p-2" data-testid="next-step" data-step={step.id}>
        <h3 className="text-sm font-semibold text-observatory-gold">Next step</h3>
        <p className="text-sm text-slate-100">{step.text}</p>
        <p className="mt-1 text-xs text-slate-400">Worked out from the simulation report.</p>
      </div>
      <p role="status" aria-live="polite" data-testid="objective-announcement" className="mt-3 min-h-[1.5rem] text-sm text-observatory-aqua">
        {lastTitle ? `Objective complete: ${lastTitle}` : ''}
      </p>

      <div className="mt-3 border-t border-observatory-navy-lighter pt-3">
        <button
          type="button"
          className={secondaryButton}
          disabled={!inProgress || allHints}
          aria-describedby="hint-status"
          onClick={() => send({ type: 'requestHint' })}
        >
          {state.hintsShown === 0 ? 'Show a hint' : 'Show the next hint'}
        </button>
        <p id="hint-status" className="mt-1 text-xs text-slate-400">
          {state.hintsShown} of {mission.hints.length} hints shown.
          {allHints ? ' No more hints for this mission.' : ''}
        </p>
        {state.hintsShown > 0 && (
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-slate-100" aria-label="Hints">
            {mission.hints.slice(0, state.hintsShown).map((h, i) => (
              <li key={i}>{h}</li>
            ))}
          </ol>
        )}
      </div>
    </section>
  )
}
