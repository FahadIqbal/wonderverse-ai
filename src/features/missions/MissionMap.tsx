import { useState } from 'react'
import { MISSIONS, missionAvailability, missionIndex } from '../../domain/learning'
import { ConfirmDialog } from '../../ui/ConfirmDialog'
import { panel, primaryButton, secondaryButton } from '../../ui/styles'
import { eraseAllProgress } from '../session/persistence'
import { useSessionStatus } from '../session/sessionStore'
import { useMissionStore } from './missionStore'
interface Props {
  /** Called after a mission has been made live. */
  onOpen: (missionId: string) => void
}
/** Three missions with text status (not colour alone). Mission N+1 unlocks only after mission N is completed. */
export function MissionMap({ onOpen }: Props) {
  const completed = useMissionStore(s => s.completed)
  const liveId = useMissionStore(s => s.missionId)
  const liveState = useMissionStore(s => s.state)
  const saved = useMissionStore(s => s.saved)
  const selectMission = useMissionStore(s => s.selectMission)
  const eraseResult = useSessionStatus(s => s.eraseResult)
  const storage = useSessionStatus(s => s.storage)
  const loadOutcome = useSessionStatus(s => s.loadOutcome)
  const dismissEraseResult = useSessionStatus(s => s.dismissEraseResult)
  const [confirming, setConfirming] = useState(false)
  const doneCount = MISSIONS.filter(m => completed.includes(m.id)).length
  const inProgress = (id: string) => {
    const phase = id === liveId ? liveState.phase : saved[id]?.state.phase
    return phase === 'building' || phase === 'quiz'
  }
  return (
    <section aria-labelledby="map-heading" className="mx-auto max-w-3xl">
      <h1 id="map-heading" tabIndex={-1} className="mb-1 text-3xl font-bold text-observatory-gold outline-none">
        Electricity Lab missions
      </h1>
      <p className="mb-4 text-sm text-slate-300" data-testid="map-progress">
        {doneCount} of {MISSIONS.length} missions complete. Finish a mission to unlock the next one.
      </p>
      {loadOutcome === 'corrupt' || loadOutcome === 'unsupported-version' ? (
        <p role="status" className={`${panel} mb-4 text-sm text-slate-200`} data-testid="load-notice">
          Your saved progress could not be read, so you are starting fresh.
        </p>
      ) : null}
      {storage !== 'ok' && (
        <p role="status" className={`${panel} mb-4 text-sm text-slate-200`} data-testid="storage-notice">
          This browser is not letting the lab save progress, so it will be lost when you close the page. You can still play.
        </p>
      )}
      <ol className="space-y-3">
        {MISSIONS.map(m => {
          const availability = missionAvailability(m.id, completed)
          const index = missionIndex(m.id)
          const locked = availability === 'locked'
          const statusText =
            availability === 'completed'
              ? 'Completed'
              : locked
                ? `Locked. Finish Mission ${index} first.`
                : inProgress(m.id)
                  ? 'In progress'
                  : 'Unlocked'
          const action = availability === 'completed' ? 'Review' : inProgress(m.id) ? 'Continue' : 'Start'
          return (
            <li key={m.id} data-testid={`map-${m.id}`} data-status={availability} className={panel}>
              <h2 className="text-xl font-semibold text-observatory-aqua">
                Mission {index + 1}: {m.title}
              </h2>
              <p className="mb-1 text-sm text-slate-200">{m.opening}</p>
              <p id={`status-${m.id}`} className="mb-3 text-sm font-semibold text-slate-100">
                <span aria-hidden="true">{availability === 'completed' ? '✔ ' : locked ? '🔒 ' : '▶ '}</span>
                Status: {statusText}
              </p>
              <button
                type="button"
                className={locked ? secondaryButton : primaryButton}
                disabled={locked}
                aria-describedby={`status-${m.id}`}
                onClick={() => {
                  if (selectMission(m.id)) onOpen(m.id)
                }}
              >
                {action} Mission {index + 1}
              </button>
            </li>
          )
        })}
      </ol>
      <section aria-labelledby="privacy-heading" className="mt-8 border-t border-observatory-navy-lighter pt-4">
        <h2 id="privacy-heading" className="mb-1 text-base font-semibold text-slate-100">
          Your progress stays on this device
        </h2>
        <p className="mb-3 text-sm text-slate-300">
          Progress and your circuits are saved only in this browser. There is no account, no name and no tracking. Erasing
          removes everything the lab saved.
        </p>
        <button type="button" className={secondaryButton} onClick={() => setConfirming(true)}>
          Erase my progress
        </button>
        <div role="status" aria-live="polite" data-testid="erase-status" className="mt-2 min-h-[1.5rem] text-sm text-observatory-aqua">
          {eraseResult === 'done' && (
            <>
              All saved progress on this device has been erased.{' '}
              <button type="button" className="min-h-[44px] px-2 underline" onClick={dismissEraseResult}>
                Dismiss
              </button>
            </>
          )}
          {eraseResult === 'failed' && (
            <span className="text-amber-300">Some saved data could not be erased. Check your browser settings and try again.</span>
          )}
        </div>
      </section>
      {confirming && (
        <ConfirmDialog
          title="Erase all progress?"
          confirmLabel="Erase everything"
          onCancel={() => setConfirming(false)}
          onConfirm={() => {
            setConfirming(false)
            eraseAllProgress()
          }}
        >
          This deletes your completed missions, your saved circuits and your settings from this browser. It cannot be undone.
        </ConfirmDialog>
      )}
    </section>
  )
}
