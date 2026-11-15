import { useEffect, useState } from 'react'
import { ConfirmDialog } from '../../ui/ConfirmDialog'
import { secondaryButton } from '../../ui/styles'
import { graphsEqual, useLabStore } from './labStore'
function isTextEntry(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  if (target.isContentEditable || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') return true
  if (target.tagName !== 'INPUT') return false
  const type = (target as HTMLInputElement).type
  return type !== 'checkbox' && type !== 'radio' && type !== 'button'
}
/**
 * Undo, redo and reset for the circuit. Undo and redo change only the graph. Mission objectives that were
 * already achieved stay achieved (the mission machine latches them), and finishing a mission is never undone.
 */
export function HistoryControls() {
  const canUndo = useLabStore(s => s.past.length > 0)
  const canRedo = useLabStore(s => s.future.length > 0)
  const hasBaseline = useLabStore(s => s.baseline !== null)
  const atSetup = useLabStore(s => s.baseline !== null && graphsEqual(s.graph, s.baseline))
  const undo = useLabStore(s => s.undo)
  const redo = useLabStore(s => s.redo)
  const resetToSetup = useLabStore(s => s.resetToSetup)
  const [confirming, setConfirming] = useState(false)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.altKey || isTextEntry(e.target)) return
      if (document.querySelector('[aria-modal="true"]')) return
      const key = e.key.toLowerCase()
      if (key === 'z' && !e.shiftKey) {
        e.preventDefault()
        undo()
      } else if ((key === 'z' && e.shiftKey) || (key === 'y' && !e.shiftKey)) {
        e.preventDefault()
        redo()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [undo, redo])
  const resetDisabled = !hasBaseline || atSetup
  return (
    <section aria-label="Undo and reset" className="flex flex-wrap items-center gap-3">
      <button type="button" className={secondaryButton} disabled={!canUndo} onClick={undo}>
        Undo
      </button>
      <button type="button" className={secondaryButton} disabled={!canRedo} onClick={redo}>
        Redo
      </button>
      <button
        type="button"
        className={secondaryButton}
        disabled={resetDisabled}
        aria-describedby="history-help"
        onClick={() => setConfirming(true)}
      >
        Reset circuit
      </button>
      <p id="history-help" className="text-xs text-slate-400">
        Shortcuts: Ctrl+Z or Cmd+Z to undo, Shift+Ctrl+Z or Shift+Cmd+Z to redo.{' '}
        {!hasBaseline
          ? 'Reset is available inside a mission.'
          : atSetup
            ? 'The circuit is already at the mission setup.'
            : 'Reset returns the circuit to the mission setup and can be undone. Your achieved objectives stay achieved.'}
      </p>
      {confirming && (
        <ConfirmDialog
          title="Reset the circuit?"
          confirmLabel="Reset circuit"
          onCancel={() => setConfirming(false)}
          onConfirm={() => {
            setConfirming(false)
            resetToSetup()
          }}
        >
          This puts the parts and wires back the way the mission started. You can undo it. Objectives you already achieved
          stay achieved.
        </ConfirmDialog>
      )}
    </section>
  )
}
