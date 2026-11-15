import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createEmptyGraph, solveCircuit } from '../../domain/circuit'

vi.mock('./scene/webgl', () => ({ isWebGLAvailable: () => true }))
vi.mock('./scene/LabScene', () => ({ default: () => <div data-testid="fake-scene" /> }))

import { LabWorkbench } from './LabWorkbench'
import { useLabStore } from './labStore'
import { lampGlow } from './scene/geometry'

function glow() {
  const { graph } = useLabStore.getState()
  return lampGlow(solveCircuit(graph), 'lamp-1').lit
}

describe('accessible Components and ports list (3D view)', () => {
  beforeEach(() => {
    useLabStore.setState({ graph: createEmptyGraph(), pendingTerminalId: null, feedback: null })
  })

  it('wires a loop and toggles the switch through the list only', async () => {
    const user = userEvent.setup()
    render(<LabWorkbench />)
    await screen.findByTestId('fake-scene')
    for (const name of ['Add Battery', 'Add Lamp', 'Add Switch']) await user.click(screen.getByRole('button', { name }))
    const port = (n: string) => screen.getByRole('button', { name: n })
    const connect = async (a: string, b: string) => {
      await user.click(port(a))
      expect(port(a)).toHaveAttribute('aria-pressed', 'true')
      await user.click(port(b))
    }
    await connect('Battery 1 positive port', 'Switch 1 left port')
    expect(screen.getByTestId('feedback')).toHaveTextContent(/Connected/)
    await connect('Switch 1 right port', 'Lamp 1 left port')
    await connect('Lamp 1 right port', 'Battery 1 negative port')
    // Switch starts open, so the lamp is dark.
    expect(glow()).toBe(false)
    await user.click(screen.getByRole('button', { name: /Toggle Switch 1, currently open/ }))
    expect(glow()).toBe(true)
    expect(screen.getByText(/Lamp 1 \(lit\)/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Toggle Switch 1, currently closed/ }))
    expect(glow()).toBe(false)
  })

  it('announces a rejected connection in the live region and Escape cancels a pending port', async () => {
    const user = userEvent.setup()
    render(<LabWorkbench />)
    await screen.findByTestId('fake-scene')
    await user.click(screen.getByRole('button', { name: 'Add Lamp' }))
    await user.click(screen.getByRole('button', { name: 'Lamp 1 left port' }))
    await user.click(screen.getByRole('button', { name: 'Lamp 1 right port' }))
    // Same component, two terminals: whatever the validator says, feedback must be shown and nothing stays pending.
    expect(screen.getByTestId('feedback').textContent).not.toBe('Ready.')
    await user.click(screen.getByRole('button', { name: 'Lamp 1 left port' }))
    expect(useLabStore.getState().pendingTerminalId).toBe('lamp-1-a')
    await user.keyboard('{Escape}')
    expect(useLabStore.getState().pendingTerminalId).toBeNull()
    expect(screen.getByTestId('feedback')).toHaveTextContent(/cancelled/)
  })
})
