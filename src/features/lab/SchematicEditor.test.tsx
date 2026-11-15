import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createEmptyGraph } from '../../domain/circuit'
import { SchematicEditor } from './SchematicEditor'
import { useLabStore } from './labStore'

type User = ReturnType<typeof userEvent.setup>

const terminal = (name: string) => screen.getByRole('button', { name: `Terminal ${name}` })

/** Connect two terminals using only the keyboard: focus, Enter, focus, Enter. */
async function connectByKeyboard(user: User, from: string, to: string) {
  terminal(from).focus()
  await user.keyboard('{Enter}')
  terminal(to).focus()
  await user.keyboard('{Enter}')
}

const addPart = (user: User, name: string) => user.click(screen.getByRole('button', { name: `Add ${name}` }))
const lampEl = (id = 'lamp-1') => document.querySelector(`[data-component-id="${id}"]`)!
const feedback = () => screen.getByTestId('feedback')

describe('SchematicEditor', () => {
  beforeEach(() => {
    useLabStore.setState({ graph: createEmptyGraph(), pendingTerminalId: null, feedback: null })
    render(<SchematicEditor />)
  })

  it('adds a component through the tray and shows it in the schematic and parts list', async () => {
    const user = userEvent.setup()
    await addPart(user, 'Lamp')
    expect(lampEl()).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Remove Lamp 1' })).toBeInTheDocument()
    expect(feedback()).toHaveTextContent('Added Lamp 1')
  })

  it('disables Add Battery once a battery exists and explains why', async () => {
    const user = userEvent.setup()
    await addPart(user, 'Battery')
    expect(screen.getByRole('button', { name: 'Add Battery' })).toBeDisabled()
    expect(screen.getByText(/supports one battery/)).toBeInTheDocument()
  })

  it('lights the lamp only after a keyboard-wired series loop is complete', async () => {
    const user = userEvent.setup()
    await addPart(user, 'Battery')
    await addPart(user, 'Lamp')
    expect(lampEl()).toHaveAttribute('data-lit', 'false')

    await connectByKeyboard(user, 'Battery 1 positive', 'Lamp 1 left')
    expect(lampEl()).toHaveAttribute('data-lit', 'false')
    expect(screen.getByTestId('diag-status')).not.toHaveTextContent('VALID')

    await connectByKeyboard(user, 'Lamp 1 right', 'Battery 1 negative')
    expect(lampEl()).toHaveAttribute('data-lit', 'true')
    expect(screen.getByTestId('diag-status')).toHaveTextContent('VALID')
    expect(within(screen.getByTestId('diag-row-lamp-1')).getByText('Energized')).toBeInTheDocument()
    expect(within(screen.getByTestId('diag-row-lamp-1')).getByText('9.00 V')).toBeInTheDocument()
  })

  it('shows the validation reason when a battery short is attempted', async () => {
    const user = userEvent.setup()
    await addPart(user, 'Battery')
    await connectByKeyboard(user, 'Battery 1 positive', 'Battery 1 negative')
    expect(feedback()).toHaveAttribute('data-kind', 'error')
    expect(feedback()).toHaveTextContent(/short circuit/i)
    expect(feedback()).toHaveAttribute('aria-live', 'polite')
    expect(useLabStore.getState().graph.wires).toHaveLength(0)
  })

  it('Escape cancels a pending connection', async () => {
    const user = userEvent.setup()
    await addPart(user, 'Lamp')
    terminal('Lamp 1 left').focus()
    await user.keyboard('{Enter}')
    expect(terminal('Lamp 1 left')).toHaveAttribute('aria-pressed', 'true')
    await user.keyboard('{Escape}')
    expect(terminal('Lamp 1 left')).toHaveAttribute('aria-pressed', 'false')
    expect(feedback()).toHaveTextContent('Connection cancelled')
  })

  it('supports click-click connections', async () => {
    const user = userEvent.setup()
    await addPart(user, 'Battery')
    await addPart(user, 'Lamp')
    await user.click(terminal('Battery 1 positive'))
    await user.click(terminal('Lamp 1 left'))
    expect(useLabStore.getState().graph.wires).toHaveLength(1)
  })

  it('darkens the lamp when the switch is open and lights it when closed', async () => {
    const user = userEvent.setup()
    await addPart(user, 'Battery')
    await addPart(user, 'Lamp')
    await addPart(user, 'Switch')
    await connectByKeyboard(user, 'Battery 1 positive', 'Switch 1 left')
    await connectByKeyboard(user, 'Switch 1 right', 'Lamp 1 left')
    await connectByKeyboard(user, 'Lamp 1 right', 'Battery 1 negative')

    expect(lampEl()).toHaveAttribute('data-lit', 'false')
    expect(screen.getByTestId('diag-reason')).toHaveTextContent('Switch is in off position')

    await user.click(screen.getByRole('button', { name: /^Toggle Switch 1/ }))
    expect(lampEl()).toHaveAttribute('data-lit', 'true')

    // Keyboard toggle on the schematic switch itself.
    ;(lampEl('switch-1') as unknown as HTMLElement).focus()
    await user.keyboard('{Enter}')
    expect(lampEl()).toHaveAttribute('data-lit', 'false')
  })

  it('removes a wire and a component with the keyboard', async () => {
    const user = userEvent.setup()
    await addPart(user, 'Battery')
    await addPart(user, 'Lamp')
    await connectByKeyboard(user, 'Battery 1 positive', 'Lamp 1 left')
    const wire = document.querySelector('[data-wire-id="wire-1"]') as unknown as HTMLElement
    wire.focus()
    await user.keyboard('{Delete}')
    expect(useLabStore.getState().graph.wires).toHaveLength(0)

    ;(lampEl() as unknown as HTMLElement).focus()
    await user.keyboard('{Delete}')
    expect(useLabStore.getState().graph.components.map(c => c.id)).toEqual(['battery-1'])
  })
})
