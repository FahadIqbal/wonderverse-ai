import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { allowConsole } from '../test/consoleGuard'
import { AppErrorBoundary } from './AppErrorBoundary'

let shouldThrow = true
function Bomb() {
  if (shouldThrow) throw new Error('kaboom')
  return <p>All good</p>
}

describe('AppErrorBoundary', () => {
  it('replaces a crash with a recoverable message, then recovers or reloads on request', async () => {
    allowConsole(/kaboom/, /The above error occurred/)
    const user = userEvent.setup()
    const onReload = vi.fn()
    shouldThrow = true
    render(
      <AppErrorBoundary onReload={onReload}>
        <Bomb />
      </AppErrorBoundary>,
    )
    expect(screen.getByRole('alert')).toHaveTextContent(/Something went wrong/)
    expect(screen.getByRole('main')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: 'Something went wrong' })).toHaveFocus()

    await user.click(screen.getByRole('button', { name: 'Reload the lab' }))
    expect(onReload).toHaveBeenCalledOnce()

    shouldThrow = false
    await user.click(screen.getByRole('button', { name: 'Try again' }))
    expect(screen.getByText('All good')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('renders children untouched when nothing throws', () => {
    function Counter() {
      const [n] = useState(1)
      return <p>count {n}</p>
    }
    render(
      <AppErrorBoundary>
        <Counter />
      </AppErrorBoundary>,
    )
    expect(screen.getByText('count 1')).toBeInTheDocument()
  })
})
