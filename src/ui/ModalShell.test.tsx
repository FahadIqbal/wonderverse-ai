import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ConfirmDialog } from './ConfirmDialog'

function Harness({ vanishOnConfirm = false, onConfirm = () => {} }: { vanishOnConfirm?: boolean; onConfirm?: () => void }) {
  const [open, setOpen] = useState(false)
  const [gone, setGone] = useState(false)
  return (
    <div>
      <main>
        <h1 tabIndex={-1}>Page heading</h1>
        {!gone && <button onClick={() => setOpen(true)}>Open dialog</button>}
        <button>Other control</button>
      </main>
      {open && (
        <ConfirmDialog
          title="Are you sure?"
          confirmLabel="Yes, do it"
          onCancel={() => setOpen(false)}
          onConfirm={() => {
            setOpen(false)
            if (vanishOnConfirm) setGone(true)
            onConfirm()
          }}
        >
          Body text.
        </ConfirmDialog>
      )}
    </div>
  )
}

describe('modal dialog behaviour (ModalShell)', () => {
  it('moves focus in, traps Tab both ways, and makes the page inert and hidden while open', async () => {
    const user = userEvent.setup()
    const { container } = render(<Harness />)
    await user.click(screen.getByRole('button', { name: 'Open dialog' }))

    const dialog = screen.getByRole('alertdialog', { name: 'Are you sure?' })
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus() // safe choice first
    // The app root is inert and hidden from assistive tech; the dialog is not.
    expect(container).toHaveAttribute('inert')
    expect(container).toHaveAttribute('aria-hidden', 'true')
    expect(dialog.closest('[inert]')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Other control' })).not.toBeInTheDocument() // hidden from the a11y tree

    await user.tab()
    expect(screen.getByRole('button', { name: 'Yes, do it' })).toHaveFocus()
    await user.tab()
    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus() // wrapped
    await user.tab({ shift: true })
    expect(screen.getByRole('button', { name: 'Yes, do it' })).toHaveFocus() // wrapped backwards
  })

  it('Escape closes, restores the page, and returns focus to the opener', async () => {
    const user = userEvent.setup()
    const { container } = render(<Harness />)
    await user.click(screen.getByRole('button', { name: 'Open dialog' }))
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(container).not.toHaveAttribute('inert')
    expect(container).not.toHaveAttribute('aria-hidden')
    expect(screen.getByRole('button', { name: 'Open dialog' })).toHaveFocus()
  })

  it('falls back to the page heading when the opener no longer exists', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()
    render(<Harness vanishOnConfirm onConfirm={onConfirm} />)
    await user.click(screen.getByRole('button', { name: 'Open dialog' }))
    await user.click(screen.getByRole('button', { name: 'Yes, do it' }))
    expect(onConfirm).toHaveBeenCalledOnce()
    expect(screen.getByRole('heading', { name: 'Page heading' })).toHaveFocus()
  })

  it('does not strip inert or aria-hidden that something else had set before it opened', async () => {
    const user = userEvent.setup()
    const other = document.createElement('div')
    other.setAttribute('inert', '')
    other.setAttribute('aria-hidden', 'true')
    document.body.appendChild(other)
    render(<Harness />)
    await user.click(screen.getByRole('button', { name: 'Open dialog' }))
    await user.keyboard('{Escape}')
    expect(other).toHaveAttribute('inert')
    expect(other).toHaveAttribute('aria-hidden', 'true')
    other.remove()
  })
})
