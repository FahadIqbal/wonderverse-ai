import { useEffect, useMemo, useRef, useState } from 'react'
import { solveCircuit } from '../../domain/circuit'
import { buildTutorContext, resolveHint, TUTOR_LIMITS, type TutorAdapter, type TutorResult } from '../../domain/learning'
import { evaluate } from '../missions/missionMachine'
import { useMissionStore } from '../missions/missionStore'
import { useLabStore } from '../lab/labStore'
import { panel, secondaryButton } from '../../ui/styles'
import { getConfiguredTutor } from './remoteTutor'

type Status = 'idle' | 'loading' | 'error'

export interface TutorPanelProps {
  /** Defaults to the adapter configured by VITE_TUTOR_URL (the local guide when unset). */
  adapter?: TutorAdapter
  /** Test seam. Defaults to `resolveHint`. */
  resolve?: typeof resolveHint
}

/**
 * Read-only: the panel reads the stores and shows the answer. It never writes to a store, and the tutor
 * receives a built context, not a store handle. Remount it (key) when the mission changes to reset the ladder.
 */
export function TutorPanel({ adapter, resolve = resolveHint }: TutorPanelProps) {
  const tutor = useMemo(() => adapter ?? getConfiguredTutor(), [adapter])
  const mission = useMissionStore(s => s.mission)
  const phase = useMissionStore(s => s.state.phase)
  const [level, setLevel] = useState(0)
  const [question, setQuestion] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [result, setResult] = useState<TutorResult | null>(null)
  const latest = useRef(0)
  useEffect(() => () => void (latest.current = -1), [])

  const cap = Math.min(mission.hints.length, TUTOR_LIMITS.maxHintLevel)
  const loading = status === 'loading'
  const finished = phase === 'complete' || phase === 'briefing'
  const atCap = level >= cap
  const disabled = loading || finished || atCap
  const remote = tutor.id === 'remote'

  async function ask() {
    const ticket = ++latest.current
    setStatus('loading')
    try {
      const ms = useMissionStore.getState()
      const graph = useLabStore.getState().graph
      const report = solveCircuit(graph)
      const evaluation = evaluate(ms.state, { mission: ms.mission, graph, report })
      const context = buildTutorContext({
        missionId: ms.mission.id,
        report,
        graph,
        phase: ms.state.phase,
        hintLevel: Math.min(level + 1, cap),
        events: ms.state.eventLog,
        objectives: evaluation.objectives.map(o => ({
          id: o.id,
          title: o.title,
          category: ms.mission.objectives.find(m => m.id === o.id)?.category ?? 'circuit',
          met: ms.state.achieved.includes(o.id),
        })),
      })
      const r = await resolve(tutor, context, question || undefined)
      if (latest.current !== ticket) return
      setResult(r)
      setStatus('idle')
      if (r.kind === 'hint') setLevel(l => Math.min(l + 1, cap))
    } catch {
      if (latest.current !== ticket) return
      setStatus('error')
    }
  }

  const sourceLabel = result ? (result.source === 'remote' ? 'AI tutor' : 'Local guide') : null

  return (
    <section aria-labelledby="tutor-heading" className={panel} data-testid="tutor-panel" data-tour="tutor">
      <h2 id="tutor-heading" className="mb-2 text-lg font-semibold text-observatory-gold">
        Ask Nova
      </h2>
      <label htmlFor="tutor-question" className="block text-sm text-slate-200">
        Question (optional)
      </label>
      <input
        id="tutor-question"
        type="text"
        value={question}
        maxLength={TUTOR_LIMITS.maxQuestion}
        disabled={loading || finished}
        onChange={e => setQuestion(e.target.value)}
        aria-describedby="tutor-note tutor-count"
        autoComplete="off"
        className="mt-1 min-h-[44px] w-full rounded-md border border-observatory-muted/60 bg-observatory-navy px-3 py-2 text-sm text-slate-100 disabled:opacity-60"
      />
      <p id="tutor-count" className="mt-1 text-xs text-slate-400">
        {question.length} of {TUTOR_LIMITS.maxQuestion} characters. Please do not type your name or other personal details.
      </p>
      <div className="mt-3">
        <button type="button" className={secondaryButton} disabled={disabled} aria-busy={loading} aria-describedby="tutor-status" onClick={() => void ask()}>
          {loading ? 'Thinking…' : level === 0 ? 'Ask for a hint' : 'Ask for the next hint'}
        </button>
        <span id="tutor-status" className="ml-3 text-xs text-slate-400">
          {level} of {cap} tutor hints used.{atCap ? ' No more tutor hints for this mission.' : ''}
          {finished ? (phase === 'complete' ? ' The mission is complete, so hints are off.' : ' Start the mission to ask for hints.') : ''}
        </span>
      </div>
      <div role="status" aria-live="polite" data-testid="tutor-response" className="mt-3 min-h-[1.5rem] text-sm text-slate-100">
        {loading && 'Nova is looking at the circuit report…'}
        {!loading && status === 'error' && (
          <span className="text-red-300">Something went wrong asking for a hint. Your circuit is unchanged. Please try again.</span>
        )}
        {!loading && status === 'idle' && result && (
          <>
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-observatory-aqua" data-testid="tutor-source">
              {sourceLabel}
              {result.offlineFallback ? ' · offline hint' : ''}
            </span>
            <span data-testid="tutor-text">{result.text}</span>
          </>
        )}
      </div>
      <p id="tutor-note" className="mt-2 text-xs text-slate-400">
        {remote
          ? 'AI can be wrong; the circuit report is the source of truth. If a hint does not match the diagnostic, trust the diagnostic.'
          : 'The Local guide works offline and only uses what the circuit report says.'}{' '}
        This is a simplified simulation. Never experiment with wall power or real electrical outlets.
      </p>
    </section>
  )
}
