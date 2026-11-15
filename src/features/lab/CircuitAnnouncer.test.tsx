import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import { CircuitAnnouncer } from './CircuitAnnouncer'
import { describeLampChange } from './announcements'
import { createEmptyGraph } from '../../domain/circuit'
import { resetStores, connect } from '../../test/helpers'
import { useLabStore } from './labStore'

describe('describeLampChange', () => {
  it('says nothing when the lit set is unchanged', () => {
    expect(describeLampChange(['Lamp 1'], ['Lamp 1'], 'OK')).toBeNull()
  })
  it('announces lit, dark and mixed changes with the solver reason', () => {
    expect(describeLampChange([], ['Lamp 1'], 'OK')).toBe('Circuit complete: Lamp 1 is lit.')
    expect(describeLampChange(['Lamp 1'], [], 'Switch is in off position')).toBe('Lamp 1 went dark. Switch is in off position.')
    expect(describeLampChange(['Lamp 1'], [], 'OK')).toBe('Lamp 1 went dark.')
    expect(describeLampChange(['Lamp 1', 'Lamp 2'], ['Lamp 2'], 'OK')).toBe('Lamp 1 went dark. Still lit: Lamp 2.')
  })
})

describe('CircuitAnnouncer', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    resetStores()
    useLabStore.setState({ graph: createEmptyGraph() })
  })
  afterEach(() => vi.useRealTimers())

  it('is silent at first, then announces once after the circuit settles (throttled, from the report only)', () => {
    const lab = () => useLabStore.getState()
    for (const t of ['battery', 'switch', 'lamp'] as const) lab().addComponent(t)
    render(<CircuitAnnouncer />)
    const region = screen.getByTestId('circuit-announcer')
    expect(region).toHaveAttribute('aria-live', 'polite')
    expect(region).toHaveTextContent('')

    act(() => {
      connect('battery-1-pos', 'switch-1-a')
      connect('switch-1-b', 'lamp-1-a')
      connect('lamp-1-b', 'battery-1-neg')
      lab().toggleSwitch('switch-1')
    })
    act(() => void vi.advanceTimersByTime(100))
    expect(region).toHaveTextContent('') // still settling
    act(() => void vi.advanceTimersByTime(400))
    expect(region).toHaveTextContent('Circuit complete: Lamp 1 is lit.')

    act(() => lab().toggleSwitch('switch-1'))
    act(() => void vi.advanceTimersByTime(500))
    expect(region.textContent).toMatch(/^Lamp 1 went dark\./)
  })

  it('does not announce a flicker that settles back to the same state', () => {
    const lab = () => useLabStore.getState()
    for (const t of ['battery', 'switch', 'lamp'] as const) lab().addComponent(t)
    render(<CircuitAnnouncer />)
    act(() => {
      lab().toggleSwitch('switch-1')
      lab().toggleSwitch('switch-1')
    })
    act(() => void vi.advanceTimersByTime(1000))
    expect(screen.getByTestId('circuit-announcer')).toHaveTextContent('')
  })
})
