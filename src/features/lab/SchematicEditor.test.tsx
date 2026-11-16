import { beforeEach, describe, expect, it } from 'vitest'
import { act, render, screen, within } from '@testing-library/react'
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

  describe('moving parts', () => {
    const posOf = (id: string) => useLabStore.getState().graph.components.find(c => c.id === id)!.position!
    const focusPart = (id: string) => (lampEl(id) as unknown as HTMLElement).focus()

    it('arrow keys move the focused part one grid step, keep focus, and announce the new cell', async () => {
      const user = userEvent.setup()
      await addPart(user, 'Lamp')
      expect(posOf('lamp-1')).toEqual({ x: 110, y: 70 })
      focusPart('lamp-1')
      await user.keyboard('{ArrowRight}')
      expect(posOf('lamp-1')).toEqual({ x: 120, y: 70 })
      await user.keyboard('{ArrowDown}')
      expect(posOf('lamp-1')).toEqual({ x: 120, y: 80 })
      expect(lampEl()).toHaveFocus()
      expect(feedback()).toHaveTextContent('Moved Lamp 1 to column 12, row 8')
      expect(feedback()).toHaveAttribute('aria-live', 'polite')
    })

    it('Shift+arrow moves five cells', async () => {
      const user = userEvent.setup()
      await addPart(user, 'Lamp')
      focusPart('lamp-1')
      await user.keyboard('{Shift>}{ArrowRight}{/Shift}')
      expect(posOf('lamp-1')).toEqual({ x: 160, y: 70 })
    })

    it('moves the terminals and so the wire ends with the part, and the solver result is unchanged', async () => {
      const user = userEvent.setup()
      await addPart(user, 'Battery')
      await addPart(user, 'Lamp')
      await connectByKeyboard(user, 'Battery 1 positive', 'Lamp 1 left')
      await connectByKeyboard(user, 'Lamp 1 right', 'Battery 1 negative')
      expect(lampEl()).toHaveAttribute('data-lit', 'true')
      const before = document.querySelector('[data-wire-id="wire-1"] path')!.getAttribute('d')
      focusPart('lamp-1')
      await user.keyboard('{Shift>}{ArrowDown}{/Shift}')
      expect(document.querySelector('[data-wire-id="wire-1"] path')!.getAttribute('d')).not.toBe(before)
      expect(lampEl()).toHaveAttribute('data-lit', 'true')
      expect(useLabStore.getState().graph.wires).toHaveLength(2)
    })

    it('each key press is one undo step, and undo restores the exact position', async () => {
      const user = userEvent.setup()
      await addPart(user, 'Lamp')
      focusPart('lamp-1')
      await user.keyboard('{ArrowRight}{ArrowRight}{ArrowDown}')
      expect(posOf('lamp-1')).toEqual({ x: 130, y: 80 })
      act(() => useLabStore.getState().undo())
      expect(posOf('lamp-1')).toEqual({ x: 130, y: 70 })
      act(() => useLabStore.getState().undo())
      act(() => useLabStore.getState().undo())
      expect(posOf('lamp-1')).toEqual({ x: 110, y: 70 })
      expect(useLabStore.getState().graph.components[0].terminals.map(t => t.position.x)).toEqual([75, 145])
      act(() => useLabStore.getState().redo())
      expect(posOf('lamp-1')).toEqual({ x: 120, y: 70 })
    })

    it('rejects a move onto another part with error feedback and no history entry', async () => {
      const user = userEvent.setup()
      await addPart(user, 'Lamp')
      await addPart(user, 'Resistor')
      focusPart('lamp-1')
      // Lamp 1 is at x=110 and Resistor 1 at x=330. Two Shift+Right presses reach 210, the next would land on 260.
      for (let i = 0; i < 2; i++) await user.keyboard('{Shift>}{ArrowRight}{/Shift}')
      expect(posOf('lamp-1')).toEqual({ x: 210, y: 70 })
      const pastBefore = useLabStore.getState().past.length
      await user.keyboard('{Shift>}{ArrowRight}{/Shift}')
      expect(posOf('lamp-1')).toEqual({ x: 210, y: 70 })
      expect(useLabStore.getState().past.length).toBe(pastBefore)
      expect(feedback()).toHaveAttribute('data-kind', 'error')
      expect(feedback()).toHaveTextContent('Move rejected: Lamp 1 would overlap Resistor 1')
    })

    it('keeps a part inside the bench and says so', async () => {
      const user = userEvent.setup()
      await addPart(user, 'Lamp')
      focusPart('lamp-1')
      for (let i = 0; i < 3; i++) await user.keyboard('{Shift>}{ArrowLeft}{/Shift}')
      expect(posOf('lamp-1').x).toBe(80)
      const past = useLabStore.getState().past.length
      await user.keyboard('{ArrowLeft}')
      expect(posOf('lamp-1').x).toBe(80)
      expect(useLabStore.getState().past.length).toBe(past)
      expect(feedback()).toHaveTextContent('edge of the bench')
    })
  })
})
