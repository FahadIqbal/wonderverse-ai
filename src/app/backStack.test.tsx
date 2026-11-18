import { describe, expect, it } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { useBackToClose } from './backStack'
function Probe() {
  const [open, setOpen] = useState(false)
  return (
    <div>
      <button onClick={() => setOpen(true)}>open</button>
      {open && <Overlay onClose={() => setOpen(false)} />}
    </div>
  )
}
function Overlay({ onClose }: { onClose: () => void }) {
  useBackToClose(true, onClose)
  return <button onClick={onClose}>close overlay</button>
}
const tick = () => new Promise(r => setTimeout(r, 30))
describe('useBackToClose (Android Back closes an open overlay first)', () => {
  it('Back closes the overlay and the page stays', async () => {
    const user = userEvent.setup()
    render(<Probe />)
    const before = window.history.length
    await user.click(screen.getByText('open'))
    expect(window.history.length).toBe(before + 1)
    expect(screen.getByText('close overlay')).toBeInTheDocument()
    act(() => window.history.back())
    await act(tick)
    expect(screen.queryByText('close overlay')).not.toBeInTheDocument()
    expect(screen.getByText('open')).toBeInTheDocument()
  })
  it('closing with the button removes the history entry it added, so Back is not spent on a stale entry', async () => {
    const user = userEvent.setup()
    render(<Probe />)
    await user.click(screen.getByText('open'))
    expect((window.history.state as Record<string, unknown>)?.['wvOverlay']).toBeTruthy()
    await user.click(screen.getByText('close overlay'))
    await act(tick)
    expect((window.history.state as Record<string, unknown> | null)?.['wvOverlay']).toBeUndefined()
  })
})
