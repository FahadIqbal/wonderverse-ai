import { beforeEach, describe, expect, it } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import { createEmptyGraph } from '../../domain/circuit'
import { SchematicEditor } from './SchematicEditor'
import { useLabStore } from './labStore'
import { useSettingsStore } from './settingsStore'

const select = (id: string) => act(() => useLabStore.getState().selectTerminal(id))
const wire = (from: string, to: string) => {
  select(from)
  select(to)
}
const setup = () => {
  act(() => {
    useLabStore.getState().addComponent('battery')
    useLabStore.getState().addComponent('lamp')
  })
}

describe('feedback motion in the schematic', () => {
  beforeEach(() => {
    useLabStore.setState({ graph: createEmptyGraph(), pendingTerminalId: null, feedback: null, past: [], future: [] })
    useSettingsStore.setState({ lowPower: false })
    render(<SchematicEditor />)
  })

  it('highlights a newly connected wire and animates it when motion is allowed', () => {
    setup()
    wire('battery-1-pos', 'lamp-1-a')
    const path = document.querySelector('[data-wire-id="wire-1"] path')!
    expect(path).toHaveAttribute('data-fresh', 'true')
    expect(path).toHaveClass('wire-snap')
  })

  it('keeps the colour highlight but adds no animation class under Low-power', () => {
    act(() => useSettingsStore.setState({ lowPower: true }))
    setup()
    wire('battery-1-pos', 'lamp-1-a')
    const path = document.querySelector('[data-wire-id="wire-1"] path')!
    expect(path).toHaveAttribute('data-fresh', 'true')
    expect(path).not.toHaveClass('wire-snap')
  })

  it('pulses the lamp glow only when the report says the lamp is lit', () => {
    setup()
    wire('battery-1-pos', 'lamp-1-a')
    expect(screen.getByTestId('glow-lamp-1')).toHaveAttribute('data-pulse', 'false')
    wire('lamp-1-b', 'battery-1-neg')
    expect(screen.getByTestId('glow-lamp-1')).toHaveAttribute('data-pulse', 'true')
    act(() => useSettingsStore.setState({ lowPower: true }))
    expect(screen.getByTestId('glow-lamp-1')).toHaveAttribute('data-pulse', 'false')
    expect(screen.getByTestId('glow-lamp-1')).toHaveAttribute('opacity', '0.35')
  })

  it('shakes the stage on a rejected connection unless motion is calm', () => {
    setup()
    wire('battery-1-pos', 'battery-1-pos')
    wire('battery-1-pos', 'battery-1-neg')
    expect(screen.getByTestId('feedback')).toHaveAttribute('data-kind', 'error')
    expect(screen.getByTestId('schematic-stage')).toHaveAttribute('data-rejected', 'true')
  })
})
