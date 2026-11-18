import { useEffect } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createEmptyGraph } from '../../domain/circuit'

const mocks = vi.hoisted(() => ({ webgl: true, crash: false, draw: true, loseContext: null as null | (() => void) }))

vi.mock('./scene/webgl', () => ({ isWebGLAvailable: () => mocks.webgl }))
vi.mock('./scene/LabScene', () => ({
  default: ({ graph, onContextLost, onFirstFrame }: { graph: { components: unknown[] }; onContextLost?: () => void; onFirstFrame?: () => void }) => {
    mocks.loseContext = onContextLost ?? null
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useEffect(() => {
      if (mocks.draw) onFirstFrame?.()
    }, [onFirstFrame])
    if (mocks.crash) throw new Error('scene crashed')
    return <div data-testid="fake-scene">scene with {graph.components.length} parts</div>
  },
}))

import { FIRST_FRAME_TIMEOUT_MS, LabWorkbench } from './LabWorkbench'
import { useLabStore } from './labStore'
import { allowConsole } from '../../test/consoleGuard'

describe('LabWorkbench', () => {
  beforeEach(() => {
    mocks.webgl = true
    mocks.crash = false
    mocks.draw = true
    useLabStore.setState({ graph: createEmptyGraph(), pendingTerminalId: null, feedback: null })
  })

  it('shows the 3D view by default and toggles to the schematic, sharing one store', async () => {
    const user = userEvent.setup()
    render(<LabWorkbench />)
    expect(await screen.findByTestId('fake-scene')).toHaveTextContent('scene with 0 parts')
    expect(screen.getByRole('button', { name: '3D workbench' })).toHaveAttribute('aria-pressed', 'true')

    await user.click(screen.getByRole('button', { name: 'Add Lamp' })) // tray in the 3D view
    expect(await screen.findByText('scene with 1 parts')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Schematic' }))
    expect(screen.queryByTestId('fake-scene')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Remove Lamp 1' })).toBeInTheDocument() // same graph
  })

  it('falls back to the schematic with an explanation when WebGL is unavailable', () => {
    mocks.webgl = false
    render(<LabWorkbench />)
    expect(screen.getByTestId('fallback-note')).toHaveTextContent(/WebGL/)
    expect(screen.getByRole('button', { name: '3D workbench' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Add Battery' })).toBeInTheDocument()
    expect(screen.queryByTestId('fake-scene')).not.toBeInTheDocument()
  })

  it('shows the schematic fallback and keeps the circuit when the scene crashes, then can retry', async () => {
    const user = userEvent.setup()
    allowConsole(/scene crashed/, /The above error occurred/)
    useLabStore.getState().addComponent('battery')
    mocks.crash = true
    render(<LabWorkbench />)

    expect(await screen.findByRole('alert')).toHaveTextContent(/3D workbench stopped working/)
    expect(screen.getByRole('button', { name: '3D workbench' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Terminal Battery 1 positive' })).toBeInTheDocument()

    mocks.crash = false
    await user.click(screen.getByRole('button', { name: 'Try 3D again' }))
    expect(await screen.findByTestId('fake-scene')).toHaveTextContent('scene with 1 parts')
  })

  it('falls back to the schematic with a message when the WebGL context is lost, keeps the circuit, and can retry', async () => {
    const user = userEvent.setup()
    useLabStore.getState().addComponent('battery')
    render(<LabWorkbench />)
    await screen.findByTestId('fake-scene')
    act(() => mocks.loseContext?.())
    expect(await screen.findByRole('alert')).toHaveTextContent(/graphics connection/)
    expect(screen.getByRole('button', { name: '3D workbench' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Terminal Battery 1 positive' })).toBeInTheDocument()
    // Focus is not left on <body> after the 3D view disappears.
    expect(screen.getByRole('button', { name: 'Try 3D again' })).toHaveFocus()
    await user.click(screen.getByRole('button', { name: 'Try 3D again' }))
    expect(await screen.findByTestId('fake-scene')).toHaveTextContent('scene with 1 parts')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: '3D workbench' })).toHaveFocus()
  })
  describe('first-frame watchdog', () => {
    afterEach(() => vi.useRealTimers())
    it('never leaves an empty stage: with no frame after the timeout it explains and shows the schematic, keeping the circuit', () => {
      vi.useFakeTimers()
      mocks.draw = false
      useLabStore.getState().addComponent('battery')
      render(<LabWorkbench />)
      expect(screen.getByTestId('fake-scene')).toBeInTheDocument()
      act(() => void vi.advanceTimersByTime(FIRST_FRAME_TIMEOUT_MS - 100))
      expect(screen.queryByTestId('fallback-note')).not.toBeInTheDocument()
      act(() => void vi.advanceTimersByTime(200))
      expect(screen.getByTestId('fallback-note')).toHaveTextContent(/did not draw anything/)
      expect(screen.queryByTestId('fake-scene')).not.toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Terminal Battery 1 positive' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Try 3D again' })).toBeInTheDocument()
    })
    it('keeps the 3D view when the first frame arrives in time', () => {
      vi.useFakeTimers()
      render(<LabWorkbench />)
      act(() => void vi.advanceTimersByTime(FIRST_FRAME_TIMEOUT_MS * 2))
      expect(screen.getByTestId('fake-scene')).toBeInTheDocument()
      expect(screen.queryByTestId('fallback-note')).not.toBeInTheDocument()
    })
    it('offers a manual switch to the schematic under the 3D stage', async () => {
      const user = userEvent.setup()
      render(<LabWorkbench />)
      await user.click(await screen.findByRole('button', { name: 'Use the schematic instead' }))
      expect(screen.queryByTestId('fake-scene')).not.toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Schematic' })).toHaveAttribute('aria-pressed', 'true')
    })
  })
})
