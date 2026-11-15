import { describe, it, expect, beforeEach } from 'vitest'
import { circuitReducer, createEmptyGraph, validateConnection } from './circuitReducer'
import { CircuitAction } from './types'
import { CircuitFixtures } from './fixtures'

describe('circuitReducer', () => {
  let graph: ReturnType<typeof createEmptyGraph>

  beforeEach(() => {
    graph = createEmptyGraph()
  })

  describe('ADD_COMPONENT', () => {
    it('should add a component to empty graph', () => {
      const action: CircuitAction = {
        type: 'ADD_COMPONENT',
        component: {
          id: 'battery-1',
          type: 'battery',
          label: 'Battery 9V',
          voltage: 9,
          isOn: true,
          terminals: [
            { id: 'bat-pos', name: 'positive', position: { x: 0, y: 0 } },
            { id: 'bat-neg', name: 'negative', position: { x: 0, y: 1 } }
          ]
        }
      }

      const result = circuitReducer(graph, action)

      expect(result.components).toHaveLength(1)
      expect(result.components[0].id).toBe('battery-1')
      expect(result.version).toBe(1)
    })

    it('should not add duplicate component', () => {
      const action: CircuitAction = {
        type: 'ADD_COMPONENT',
        component: {
          id: 'battery-1',
          type: 'battery',
          voltage: 9,
          isOn: true,
          terminals: [
            { id: 'bat-pos', name: 'positive', position: { x: 0, y: 0 } }
          ]
        }
      }

      const withComponent = circuitReducer(graph, action)
      const result = circuitReducer(withComponent, action)

      expect(result.components).toHaveLength(1)
    })
  })

  describe('ADD_WIRE', () => {
    it('should add a wire between two terminals', () => {
      // First add two components
      let result = circuitReducer(graph, {
        type: 'ADD_COMPONENT',
        component: {
          id: 'bat-1',
          type: 'battery',
          voltage: 9,
          isOn: true,
          terminals: [
            { id: 'bat-pos', name: 'positive', position: { x: 0, y: 0 } },
            { id: 'bat-neg', name: 'negative', position: { x: 0, y: 1 } }
          ]
        }
      })

      result = circuitReducer(result, {
        type: 'ADD_COMPONENT',
        component: {
          id: 'lamp-1',
          type: 'lamp',
          resistance: 100,
          isOn: false,
          terminals: [
            { id: 'lamp-a', name: 'A', position: { x: 1, y: 0 } },
            { id: 'lamp-b', name: 'B', position: { x: 1, y: 1 } }
          ]
        }
      })

      // Now add wire
      result = circuitReducer(result, {
        type: 'ADD_WIRE',
        wire: { id: 'wire-1', fromTerminalId: 'bat-pos', toTerminalId: 'lamp-a' }
      })

      expect(result.wires).toHaveLength(1)
      expect(result.wires[0].fromTerminalId).toBe('bat-pos')
    })

    it('should not allow wire to same terminal', () => {
      const result = validateConnection(graph, 'term-1', 'term-1')
      expect(result.isValid).toBe(false)
      expect(result.reason).toContain('itself')
    })
  })

  describe('REMOVE_COMPONENT', () => {
    it('should remove component and its connected wires', () => {
      // Setup: add battery, lamp, and wire
      let result = circuitReducer(graph, {
        type: 'ADD_COMPONENT',
        component: {
          id: 'bat-1',
          type: 'battery',
          voltage: 9,
          isOn: true,
          terminals: [
            { id: 'bat-pos', name: 'positive', position: { x: 0, y: 0 } },
            { id: 'bat-neg', name: 'negative', position: { x: 0, y: 1 } }
          ]
        }
      })

      result = circuitReducer(result, {
        type: 'ADD_COMPONENT',
        component: {
          id: 'lamp-1',
          type: 'lamp',
          resistance: 100,
          isOn: false,
          terminals: [
            { id: 'lamp-a', name: 'A', position: { x: 1, y: 0 } },
            { id: 'lamp-b', name: 'B', position: { x: 1, y: 1 } }
          ]
        }
      })

      result = circuitReducer(result, {
        type: 'ADD_WIRE',
        wire: { id: 'wire-1', fromTerminalId: 'bat-pos', toTerminalId: 'lamp-a' }
      })

      // Remove the battery
      result = circuitReducer(result, {
        type: 'REMOVE_COMPONENT',
        componentId: 'bat-1'
      })

      expect(result.components).toHaveLength(1) // lamp remains
      expect(result.wires).toHaveLength(0) // wire removed
    })
  })

  describe('CLEAR_CIRCUIT', () => {
    it('should clear all components and wires', () => {
      // Add some stuff
      let result = circuitReducer(graph, {
        type: 'ADD_COMPONENT',
        component: {
          id: 'bat-1',
          type: 'battery',
          voltage: 9,
          isOn: true,
          terminals: [{ id: 't1', name: 'pos', position: { x: 0, y: 0 } }]
        }
      })

      result = circuitReducer(result, {
        type: 'CLEAR_CIRCUIT'
      })

      expect(result.components).toHaveLength(0)
      expect(result.wires).toHaveLength(0)
    })
  })

  describe('fixtures', () => {
    it('should load simple series fixture', () => {
      const action: CircuitAction = {
        type: 'LOAD_CIRCUIT',
        graph: CircuitFixtures.simpleSeries
      }

      const result = circuitReducer(graph, action)

      expect(result.components).toHaveLength(2)
      expect(result.wires).toHaveLength(2)
    })
  })
})
