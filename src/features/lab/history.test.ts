import fc from 'fast-check'
import { beforeEach, describe, expect, it } from 'vitest'
import { createEmptyGraph } from '../../domain/circuit'
import { mission1 } from '../../domain/learning'
import { resetStores } from '../../test/helpers'
import { graphsEqual, HISTORY_LIMIT, useLabStore } from './labStore'
const lab = () => useLabStore.getState()
const count = () => lab().graph.components.length
describe('labStore undo / redo / reset', () => {
  beforeEach(resetStores)
  it('undoes and redoes a part; a new edit clears redo', () => {
    lab().addComponent('lamp')
    lab().addComponent('resistor')
    expect(count()).toBe(2)
    lab().undo()
    expect(count()).toBe(1)
    expect(lab().future).toHaveLength(1)
    lab().redo()
    expect(count()).toBe(2)
    lab().undo()
    lab().addComponent('switch')
    expect(lab().future).toHaveLength(0)
    lab().redo() // nothing to redo
    expect(count()).toBe(2)
  })
  it('does nothing and keeps feedback intact when there is nothing to undo or redo', () => {
    lab().undo()
    lab().redo()
    expect(lab().feedback).toBeNull()
    expect(lab().graph).toEqual(createEmptyGraph())
  })
  it('records switch toggles and wires as edits, and undo clears a pending connection', () => {
    lab().loadGraph(mission1.setupGraph, mission1.setupGraph)
    lab().toggleSwitch('switch-1')
    lab().selectTerminal('battery-1-pos')
    expect(lab().pendingTerminalId).toBe('battery-1-pos')
    lab().undo()
    expect(lab().pendingTerminalId).toBeNull()
    expect(lab().graph.components.find(c => c.id === 'switch-1')?.isOn).toBe(false)
  })
  it(`keeps at most ${HISTORY_LIMIT} undo steps and drops the oldest`, () => {
    lab().addComponent('switch')
    for (let i = 0; i < HISTORY_LIMIT + 9; i++) lab().toggleSwitch('switch-1')
    expect(lab().past).toHaveLength(HISTORY_LIMIT)
    for (let i = 0; i < HISTORY_LIMIT + 5; i++) lab().undo()
    expect(count()).toBe(1) // the 10 oldest edits (the add and 9 toggles) can no longer be undone
    expect(lab().graph.components[0].isOn).toBe(true)
    expect(lab().past).toHaveLength(0)
  })
  it('loadGraph replaces the circuit without history and sets the reset baseline', () => {
    lab().addComponent('lamp')
    lab().loadGraph(mission1.setupGraph, mission1.setupGraph)
    expect(lab().past).toHaveLength(0)
    expect(lab().future).toHaveLength(0)
    expect(lab().baseline).toBe(mission1.setupGraph)
  })
  it('reset returns to the setup, is itself undoable, and is a no-op at the setup or without a baseline', () => {
    lab().addComponent('lamp')
    lab().resetToSetup() // no baseline
    expect(count()).toBe(1)
    lab().loadGraph(mission1.setupGraph, mission1.setupGraph)
    lab().resetToSetup() // already at setup
    expect(lab().past).toHaveLength(0)
    lab().addComponent('lamp')
    lab().selectTerminal('battery-1-pos')
    lab().selectTerminal('lamp-1-a')
    expect(lab().graph.wires.length).toBeGreaterThan(0)
    lab().resetToSetup()
    expect(graphsEqual(lab().graph, mission1.setupGraph)).toBe(true)
    lab().undo()
    expect(lab().graph.wires.length).toBeGreaterThan(0)
  })
  it('property: undoing every edit restores the initial circuit and redoing restores the final one', () => {
    const op = fc.constantFrom('lamp', 'resistor', 'switch', 'toggle', 'removeFirst', 'wire')
    fc.assert(
      fc.property(fc.array(op, { maxLength: 30 }), ops => {
        resetStores()
        lab().loadGraph(mission1.setupGraph, mission1.setupGraph)
        const start = lab().graph
        for (const o of ops) {
          const s = lab()
          if (o === 'toggle') s.toggleSwitch('switch-1')
          else if (o === 'removeFirst') {
            if (s.graph.components[0]) s.removeComponent(s.graph.components[0].id)
          }
          else if (o === 'wire') {
            const ts = s.graph.components.flatMap(c => c.terminals.map(t => t.id))
            if (ts.length > 1) {
              s.selectTerminal(ts[0])
              useLabStore.getState().selectTerminal(ts[ts.length - 1])
            }
          } else s.addComponent(o)
        }
        const end = lab().graph
        const steps = lab().past.length
        for (let i = 0; i < steps; i++) lab().undo()
        expect(graphsEqual(lab().graph, start)).toBe(true)
        for (let i = 0; i < steps; i++) lab().redo()
        expect(graphsEqual(lab().graph, end)).toBe(true)
      }),
      { numRuns: 50 },
    )
  })
})
