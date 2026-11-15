import type { ReactNode } from 'react'
import { AlertIcon, InfoIcon } from '../../ui/icons'
import type { Feedback } from './labStore'
import { useRejectionPulse } from './useFeedbackMotion'
import { useMotionPreference } from './useMotionPreference'

/**
 * The lab's live feedback line (aria-live). Errors get a coral border, an alert icon and the words in the
 * message ("Connection rejected: ..."), so the meaning never rests on colour. The shake runs only when motion is allowed.
 */
export function FeedbackBar({ feedback, children }: { feedback: Feedback | null; children?: ReactNode }) {
  const { calm } = useMotionPreference()
  const pulse = useRejectionPulse(feedback)
  const error = feedback?.kind === 'error'
  return (
    <div
      role="status"
      aria-live="polite"
      data-testid="feedback"
      data-kind={feedback?.kind ?? 'none'}
      className={`flex min-h-[2.75rem] items-center gap-2 rounded-xl border px-3 py-2 text-sm shadow-[0_6px_18px_-10px_rgba(0,0,0,0.7)] ${
        error
          ? 'border-observatory-coral bg-red-950/60 text-red-200'
          : 'border-observatory-navy-lighter bg-observatory-navy-light text-slate-200'
      } ${pulse && !calm ? 'reject-shake' : ''}`}
    >
      {error ? (
        <AlertIcon className="h-5 w-5 shrink-0 text-observatory-coral" />
      ) : (
        <InfoIcon className="h-5 w-5 shrink-0 text-observatory-aqua" />
      )}
      <span>
        {feedback?.text ?? 'Ready.'}
        {children}
      </span>
    </div>
  )
}
