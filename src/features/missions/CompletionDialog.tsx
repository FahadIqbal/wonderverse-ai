import { useRef } from 'react'
import type { Mission } from '../../domain/learning'
import { ModalShell } from '../../ui/ModalShell'
import { primaryButton, secondaryButton } from '../../ui/styles'

interface Props {
  mission: Mission
  onClose: () => void
  onReplay: () => void
  onBackToMap: () => void
  /** Present when a following mission exists (it is unlocked by this completion). */
  next?: { title: string; onOpen: () => void }
}

/** Modal dialog (see ModalShell): focus moves to the heading on open, Tab is trapped, Escape closes, the page is inert. */
export function CompletionDialog({ mission, onClose, onReplay, onBackToMap, next }: Props) {
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
        <div><dt className="inline font-semibold text-observatory-aqua">You built: </dt><dd className="inline">{mission.recap.built}</dd></div>
        <div><dt className="inline font-semibold text-observatory-aqua">You observed: </dt><dd className="inline">{mission.recap.observed}</dd></div>
        <div><dt className="inline font-semibold text-observatory-aqua">You explained: </dt><dd className="inline">{mission.recap.explained}</dd></div>
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
