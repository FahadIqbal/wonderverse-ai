import { useEffect, useRef, useState } from 'react'
import { panel, primaryButton, secondaryButton } from '../../ui/styles'
import { TOUR_STEPS } from './tourSteps'
interface Props {
  /** Called when the learner finishes or skips. Closing always counts as seen. */
  onClose: () => void
}
/**
 * A short guided tour. It is a labelled region, not a modal: the lab stays usable and keyboard order is unchanged.
 * Focus moves to its heading when it opens. Escape skips it. The region it describes gets a visible outline.
 */
export function OnboardingTour({ onClose }: Props) {
  const [index, setIndex] = useState(0)
  const heading = useRef<HTMLHeadingElement>(null)
  const step = TOUR_STEPS[index]
  const last = index === TOUR_STEPS.length - 1
  useEffect(() => {
    heading.current?.focus()
  }, [])
  useEffect(() => {
    const el = document.querySelector<HTMLElement>(`[data-tour="${step.target}"]`)
    if (!el) return
    el.setAttribute('data-tour-active', 'true')
    el.scrollIntoView?.({ block: 'nearest' })
    return () => el.removeAttribute('data-tour-active')
  }, [step.target])
  return (
    <section
      aria-labelledby="tour-heading"
      data-testid="onboarding-tour"
      className={`${panel} border-observatory-gold`}
      onKeyDown={e => {
        if (e.key === 'Escape') onClose()
      }}
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-observatory-aqua" data-testid="tour-progress">
        How to play: step {index + 1} of {TOUR_STEPS.length}
      </p>
      <h2 id="tour-heading" ref={heading} tabIndex={-1} className="mb-2 text-lg font-semibold text-observatory-gold outline-none">
        {step.title}
      </h2>
      <p className="mb-3 text-sm text-slate-100" aria-live="polite">
        {step.body}
      </p>
      <div className="flex flex-wrap gap-3">
        <button type="button" className={secondaryButton} disabled={index === 0} onClick={() => setIndex(i => i - 1)}>
          Back
        </button>
        {last ? (
          <button type="button" className={primaryButton} onClick={onClose}>
            Done
          </button>
        ) : (
          <button type="button" className={primaryButton} onClick={() => setIndex(i => i + 1)}>
            Next
          </button>
        )}
        {!last && (
          <button type="button" className={secondaryButton} onClick={onClose}>
            Skip tour
          </button>
        )}
      </div>
    </section>
  )
}
