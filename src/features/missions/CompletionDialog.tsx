import { useRef } from 'react'
import { describeCounts, type Mission, type MissionRecap } from '../../domain/learning'
import { ModalShell } from '../../ui/ModalShell'
import { primaryButton, secondaryButton } from '../../ui/styles'

interface Props {
  mission: Mission
  /** Facts captured when the mission was completed (or read from the live bench for older saves). */
  recap: MissionRecap
  onClose: () => void
  onReplay: () => void
  onBackToMap: () => void
  /** Present when a following mission exists (it is unlocked by this completion). */
  next?: { title: string; onOpen: () => void }
}

/** Modal dialog (see ModalShell): focus moves to the heading on open, Tab is trapped, Escape closes, the page is inert. */
export function CompletionDialog({ mission, recap, onClose, onReplay, onBackToMap, next }: Props) {
  const headingRef = useRef<HTMLHeadingElement>(null)
  return (
    <ModalShell
      role="dialog"
      labelledBy="completion-title"
      describedBy="completion-recap"
      initialFocusRef={headingRef}
      onClose={onClose}
      className="w-full max-w-lg rounded-lg border border-observatory-aqua bg-observatory-navy-light p-6 text-observatory-text"
    >
      <h2 id="completion-title" ref={headingRef} tabIndex={-1} className="mb-3 text-2xl font-bold text-observatory-gold">
        Mission complete: {mission.title}
      </h2>
      <dl id="completion-recap" className="space-y-2 text-sm">
        <div>
          <dt className="inline font-semibold text-observatory-aqua">You built: </dt>
          <dd className="inline">
            {mission.recap.built} <span data-testid="recap-counts">On your bench: {describeCounts(recap)}.</span>
          </dd>
        </div>
        <div>
          <dt className="inline font-semibold text-observatory-aqua">You observed: </dt>
          <dd className="inline">
            {mission.recap.observed}
            {recap.readings.length > 0 && (
              <ul aria-label="Measured at completion, from the simulation report" data-testid="recap-readings" className="mt-1 list-disc pl-5">
              {recap.readings.map(r => (
                <li key={r.label}>
                  {r.label}: {r.voltage.toFixed(2)} V across, {(r.current * 1000).toFixed(1)} mA through ({r.energized ? 'energized' : 'idle'})
                </li>
              ))}
              </ul>
            )}
          </dd>
        </div>
        <div>
          <dt className="inline font-semibold text-observatory-aqua">You explained: </dt>
          <dd className="inline">{mission.recap.explained}</dd>
        </div>
        <div>
          <dt className="inline font-semibold text-observatory-aqua">Idea you tested: </dt>
          <dd className="inline" data-testid="recap-misconception">{mission.quiz.misconception}</dd>
        </div>
        <div>
          <dt className="inline font-semibold text-observatory-aqua">Hints used: </dt>
          <dd className="inline" data-testid="recap-hints">{recap.hintsUsed} of {mission.hints.length}</dd>
        </div>
        <div><dt className="inline font-semibold text-observatory-aqua">Try next: </dt><dd className="inline">{mission.recap.tryNext}</dd></div>
      </dl>
      <div className="mt-5 flex flex-wrap gap-3">
        {next && (
          <button type="button" className={primaryButton} onClick={next.onOpen}>
            Next mission: {next.title}
          </button>
        )}
        <button type="button" className={next ? secondaryButton : primaryButton} onClick={onBackToMap}>
          Back to missions
        </button>
        <button type="button" className={secondaryButton} onClick={onClose}>
          Close
        </button>
        <button type="button" className={secondaryButton} onClick={onReplay}>
          Replay mission
        </button>
      </div>
    </ModalShell>
  )
}
