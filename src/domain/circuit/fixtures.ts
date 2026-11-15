// Predefined circuit fixtures for testing and missions
export const CircuitFixtures = {
  // Simple series circuit: battery -> wire -> lamp -> wire -> battery
  simpleSeries: {
    components: [
      {
        id: 'battery-1',
        type: 'battery' as const,
        label: 'Battery 9V',
        voltage: 9,
        isOn: true,
        terminals: [
          { id: 'battery-1-pos', name: 'positive', position: { x: 0, y: 0 } },
          { id: 'battery-1-neg', name: 'negative', position: { x: 0, y: 1 } }
        ]
      },
      {
        id: 'lamp-1',
        type: 'lamp' as const,
        label: 'Lamp',
        resistance: 100,
        isOn: false,
        terminals: [
          { id: 'lamp-1-a', name: 'terminal A', position: { x: 1, y: 0 } },
          { id: 'lamp-1-b', name: 'terminal B', position: { x: 1, y: 1 } }
        ]
      }
    ],
    wires: [
      { id: 'wire-1', fromTerminalId: 'battery-1-pos', toTerminalId: 'lamp-1-a' },
      { id: 'wire-2', fromTerminalId: 'lamp-1-b', toTerminalId: 'battery-1-neg' }
    ],
    version: 0
  },

  // Parallel circuit with two lamps
  parallel: {
    components: [
      {
        id: 'battery-1',
        type: 'battery' as const,
        label: 'Battery 9V',
        voltage: 9,
        isOn: true,
        terminals: [
          { id: 'battery-1-pos', name: 'positive', position: { x: 0, y: 0.5 } },
          { id: 'battery-1-neg', name: 'negative', position: { x: 0, y: 2.5 } }
        ]
      },
      {
        id: 'lamp-1',
        type: 'lamp' as const,
        label: 'Lamp 1',
        resistance: 100,
        isOn: false,
        terminals: [
          { id: 'lamp-1-a', name: 'terminal A', position: { x: 1, y: 0 } },
          { id: 'lamp-1-b', name: 'terminal B', position: { x: 1, y: 1 } }
        ]
      },
      {
        id: 'lamp-2',
        type: 'lamp' as const,
        label: 'Lamp 2',
        resistance: 100,
        isOn: false,
        terminals: [
          { id: 'lamp-2-a', name: 'terminal A', position: { x: 1, y: 2 } },
          { id: 'lamp-2-b', name: 'terminal B', position: { x: 1, y: 3 } }
        ]
      }
    ],
    wires: [
      { id: 'wire-1', fromTerminalId: 'battery-1-pos', toTerminalId: 'lamp-1-a' },
      { id: 'wire-2', fromTerminalId: 'battery-1-pos', toTerminalId: 'lamp-2-a' },
      { id: 'wire-3', fromTerminalId: 'lamp-1-b', toTerminalId: 'lamp-2-b' },
      { id: 'wire-4', fromTerminalId: 'lamp-1-b', toTerminalId: 'battery-1-neg' },
      { id: 'wire-5', fromTerminalId: 'lamp-2-b', toTerminalId: 'battery-1-neg' }
    ],
    version: 0
  },

  // Open circuit (broken connection)
  openCircuit: {
    components: [
      {
        id: 'battery-1',
        type: 'battery' as const,
        label: 'Battery 9V',
        voltage: 9,
        isOn: true,
        terminals: [
          { id: 'battery-1-pos', name: 'positive', position: { x: 0, y: 0 } },
          { id: 'battery-1-neg', name: 'negative', position: { x: 0, y: 1 } }
        ]
      },
      {
        id: 'lamp-1',
        type: 'lamp' as const,
        label: 'Lamp',
        resistance: 100,
        isOn: false,
        terminals: [
          { id: 'lamp-1-a', name: 'terminal A', position: { x: 1, y: 0 } },
          { id: 'lamp-1-b', name: 'terminal B', position: { x: 1, y: 1 } }
        ]
      }
    ],
    wires: [
      { id: 'wire-1', fromTerminalId: 'battery-1-pos', toTerminalId: 'lamp-1-a' }
      // Missing return wire - circuit is open
    ],
    version: 0
  }
}
