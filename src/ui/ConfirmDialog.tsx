import { useRef, type ReactNode } from 'react'
import { ModalShell } from './ModalShell'
import { primaryButton, secondaryButton } from './styles'

interface Props {
  title: string
  children: ReactNode
  confirmLabel: string
  cancelLabel?: string
  onConfirm: () => void
  onCancel: () => void
}

/**
 * Modal confirmation. Focus starts on Cancel (the safe choice), Tab is trapped, Escape cancels, the rest of the
 * page is inert while open, and focus returns to the control that opened it (see ModalShell).
 */
export function ConfirmDialog({ title, children, confirmLabel, cancelLabel = 'Cancel', onConfirm, onCancel }: Props) {
  const cancelRef = useRef<HTMLButtonElement>(null)
  return (
    <ModalShell
      role="alertdialog"
      labelledBy="confirm-title"
      describedBy="confirm-body"
      initialFocusRef={cancelRef}
      onClose={onCancel}
      className="w-full max-w-md rounded-lg border border-observatory-aqua bg-observatory-navy-light p-6 text-observatory-text"
    >
      <h2 id="confirm-title" className="mb-2 text-xl font-bold text-observatory-gold">
        {title}
      </h2>
      <div id="confirm-body" className="mb-5 text-sm text-slate-200">
        {children}
      </div>
      <div className="flex flex-wrap gap-3">
        <button type="button" ref={cancelRef} className={secondaryButton} onClick={onCancel}>
          {cancelLabel}
        </button>
        <button type="button" className={primaryButton} onClick={onConfirm}>
          {confirmLabel}
        </button>
      </div>
    </ModalShell>
  )
}
