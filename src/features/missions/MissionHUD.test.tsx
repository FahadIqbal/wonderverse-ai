import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { resetStores } from '../../test/helpers'
import { MissionView } from './MissionView'
vi.mock('../lab/scene/webgl', () => ({ isWebGLAvailable: () => false }))
const terminal = (name: string) => screen.getByRole('button', { name: `Terminal ${name}` })
describe('mission HUD next step', () => {
  beforeEach(() => resetStores())
  it('follows the simulation report from loose wire to lit lamp', async () => {
    const user = userEvent.setup()
    render(<MissionView />)
    await user.click(screen.getByRole('button', { name: 'Start mission' }))
    const next = screen.getByTestId('next-step')
    expect(next).toHaveTextContent('Battery 1 + (positive) is not connected to anything')
    for (const [a, b] of [['Battery 1 positive', 'Switch 1 left'], ['Switch 1 right', 'Lamp 1 left'], ['Lamp 1 right', 'Battery 1 negative']]) {
      await user.click(terminal(a))
      await user.click(terminal(b))
    }
    expect(next).toHaveTextContent('The loop is complete but Switch 1 is open')
    expect(next).not.toHaveTextContent(/Lamp 1 is lit/)
    await user.click(screen.getByRole('button', { name: /^Toggle Switch 1/ }))
    expect(next).toHaveTextContent('Lamp 1 is lit. Now open Switch 1')
    expect(next).toHaveAttribute('data-step', 'toggle-switch')
  })
})
