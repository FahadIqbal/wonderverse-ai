import { useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactNode, type RefObject } from 'react'
import { createPortal } from 'react-dom'

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

interface Props {
  role: 'dialog' | 'alertdialog'
  labelledBy: string
  describedBy?: string
  /** Element that receives focus on open. Defaults to the first focusable control. */
  initialFocusRef?: RefObject<HTMLElement>
  /** Escape key. */
  onClose: () => void
  className?: string
  children: ReactNode
}

/** Focuses `el` if it can take focus. Returns whether it did. */
function tryFocus(el: Element | null): boolean {
  if (!(el instanceof HTMLElement) || !el.isConnected) return false
  if ((el as HTMLButtonElement).disabled || el.closest('[inert]')) return false
  el.focus()
  return document.activeElement === el
}

/**
 * Modal behaviour shared by every dialog:
 * - rendered in a portal on <body>, so the rest of the page can be made inert;
 * - every other top-level node gets `inert` and `aria-hidden` while open (restored on close);
 * - focus moves in on open, Tab and Shift+Tab wrap inside, Escape closes;
 * - focus returns to the opener. If the opener is gone or disabled (for example the action removed it),
 *   focus falls back to the page heading, so keyboard users never land on <body>.
 */
export function ModalShell({ role, labelledBy, describedBy, initialFocusRef, onClose, className, children }: Props) {
  const [container] = useState(() => document.createElement('div'))
  const dialogRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const opener = document.activeElement
    const touched: { el: Element; inert: boolean; ariaHidden: string | null }[] = []
    for (const el of Array.from(document.body.children)) {
      if (el === container || el.tagName === 'SCRIPT') continue
      touched.push({ el, inert: el.hasAttribute('inert'), ariaHidden: el.getAttribute('aria-hidden') })
      el.setAttribute('inert', '')
      el.setAttribute('aria-hidden', 'true')
    }
    document.body.appendChild(container)
    const first = dialogRef.current?.querySelector<HTMLElement>(FOCUSABLE) ?? dialogRef.current
    tryFocus(initialFocusRef?.current ?? first)
    return () => {
      for (const t of touched) {
        if (!t.inert) t.el.removeAttribute('inert')
        if (t.ariaHidden === null) t.el.removeAttribute('aria-hidden')
        else t.el.setAttribute('aria-hidden', t.ariaHidden)
      }
      container.remove()
      // Deferred to a microtask so the commit that closed the dialog (and may have removed or disabled the
      // opener) has finished. Skipped if another modal opened meanwhile (React StrictMode re-runs effects).
      queueMicrotask(() => {
        if (document.querySelector('[aria-modal="true"]')) return
        if (!tryFocus(opener)) {
          const heading = document.querySelector<HTMLElement>('main h1')
          if (heading) tryFocus(heading)
        }
      })
    }
  }, [container, initialFocusRef])

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      e.stopPropagation()
      onClose()
      return
    }
    if (e.key !== 'Tab') return
    const items = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [])
    if (items.length === 0) {
      e.preventDefault()
      return
    }
    const first = items[0]
    const last = items[items.length - 1]
    const active = document.activeElement
    // The dialog may hold focus on a non-tabbable heading (initial focus). Treat it as "before the first item".
    if (e.shiftKey && (active === first || active === dialogRef.current || !items.includes(active as HTMLElement))) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && (active === last || !items.includes(active as HTMLElement))) {
      e.preventDefault()
      first.focus()
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div
        ref={dialogRef}
        role={role}
        aria-modal="true"
        aria-labelledby={labelledBy}
        aria-describedby={describedBy}
        tabIndex={-1}
        onKeyDown={onKeyDown}
        className={className}
      >
        {children}
      </div>
    </div>,
    container,
  )
}
