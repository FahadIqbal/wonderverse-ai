import { beforeEach, describe, expect, it } from 'vitest'
import { createEmptyGraph, isLampIlluminated, SolverStatus } from '../../domain/circuit'
import { selectReport, useLabStore } from './labStore'

const reset = () =>
  useLabStore.setState({ graph: createEmptyGraph(), pendingTerminalId: null, feedback: null })

describe('labStore', () => {
  beforeEach(reset)

  it('adds components with unique component and terminal ids', () => {
    const s = useLabStore.getState()
    s.addComponent('lamp')
    s.addComponent('lamp')
    s.addComponent('battery')
    const { components } = useLabStore.getState().graph
    expect(new Set(components.map(c => c.id)).size).toBe(3)
    const terminalIds = components.flatMap(c => c.terminals.map(t => t.id))
    expect(new Set(terminalIds).size).toBe(terminalIds.length)
    const battery = components.find(c => c.type === 'battery')!
    expect(battery.terminals.map(t => t.name)).toEqual(['positive', 'negative'])
  })

  it('does not reuse an id after a component is removed while another remains', () => {
    const s = useLabStore.getState()
    const first = s.addComponent('lamp')
    const second = s.addComponent('lamp')
    s.removeComponent(first)
    const third = useLabStore.getState().addComponent('lamp')
    expect(third).not.toBe(second)
    expect(useLabStore.getState().graph.components.map(c => c.id).sort()).toEqual([second, third].sort())
  })

  it('does not store the report; it is derived from the graph', () => {
    expect('report' in useLabStore.getState()).toBe(false)
    const s = useLabStore.getState()
    s.addComponent('battery')
    s.addComponent('lamp')
    s.selectTerminal('battery-1-pos')
    s.selectTerminal('lamp-1-a')
    s.selectTerminal('lamp-1-b')
    s.selectTerminal('battery-1-neg')
    const state = useLabStore.getState()
    expect(state.graph.wires).toHaveLength(2)
    const report = selectReport(state)
    expect(report.status).toBe(SolverStatus.VALID)
    expect(isLampIlluminated(report, 'lamp-1')).toBe(true)
  })

  it('rejects a battery short, leaves the graph unchanged and reports the reason', () => {
    const s = useLabStore.getState()
    s.addComponent('battery')
    const before = useLabStore.getState().graph
    s.selectTerminal('battery-1-pos')
    s.selectTerminal('battery-1-neg')
    const state = useLabStore.getState()
    expect(state.graph).toBe(before)
    expect(state.pendingTerminalId).toBeNull()
    expect(state.feedback?.kind).toBe('error')
    expect(state.feedback?.text).toMatch(/short circuit/)
  })

  it('selecting the same terminal twice cancels; cancelConnection clears pending', () => {
    const s = useLabStore.getState()
    s.addComponent('lamp')
    s.selectTerminal('lamp-1-a')
    expect(useLabStore.getState().pendingTerminalId).toBe('lamp-1-a')
    s.selectTerminal('lamp-1-a')
    expect(useLabStore.getState().pendingTerminalId).toBeNull()
    s.selectTerminal('lamp-1-a')
    s.cancelConnection()
    expect(useLabStore.getState().pendingTerminalId).toBeNull()
  })

  it('removing a component removes its wires and clears a pending terminal on it', () => {
    const s = useLabStore.getState()
    s.addComponent('battery')
    s.addComponent('lamp')
    s.selectTerminal('battery-1-pos')
    s.selectTerminal('lamp-1-a')
    s.selectTerminal('lamp-1-b')
    useLabStore.getState().removeComponent('lamp-1')
    const state = useLabStore.getState()
    expect(state.graph.wires).toHaveLength(0)
    expect(state.pendingTerminalId).toBeNull()
  })

  it('toggles only switches', () => {
    const s = useLabStore.getState()
    s.addComponent('switch')
    s.addComponent('lamp')
    s.toggleSwitch('switch-1')
    s.toggleSwitch('lamp-1')
    const { components } = useLabStore.getState().graph
    expect(components.find(c => c.id === 'switch-1')!.isOn).toBe(true)
    expect(components.find(c => c.id === 'lamp-1')!.isOn).toBe(false)
  })
})
