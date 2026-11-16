import { Mission } from './schemas'
/**
 * Mission 2 content comes from docs/13-CONTENT-AND-MISSIONS.md. The fault is a fixed, seeded fixture (never random):
 * the return wire from the lamp to the battery negative terminal is missing. The switch starts closed so the missing
 * wire is the only fault. The solver reports status NO_PATH with reason "No energized path from battery to component"
 * (docs/13 calls this MISSING_RETURN_PATH; the solver has no code with that name, see docs/12 ADR-007).
 */
export const mission2 = Mission.parse({
  id: 'mission-2',
  title: 'Fix the Fault',
  opening: 'The museum lamp went out. Diagnose the circuit.',
  partsNote:
    'The 3 V battery, closed switch and 6 Ω bulb are already placed, and two wires are connected. Read the circuit diagnostic, find where the loop stops, then repair it.',
  safetyNote:
    'This lab uses a simplified model of a small battery circuit. Real electrical systems can be dangerous, and this is not a wiring guide.',
  quizLockedNote: 'Locked until you have repaired the circuit and the lamp has lit.',
  setupGraph: {
    components: [
      {
        id: 'battery-1',
        type: 'battery',
        label: 'Battery 1',
        voltage: 3,
        isOn: true,
        terminals: [
          { id: 'battery-1-pos', name: 'positive', position: { x: 75, y: 70 } },
          { id: 'battery-1-neg', name: 'negative', position: { x: 145, y: 70 } },
        ],
      },
      {
        id: 'switch-1',
        type: 'switch',
        label: 'Switch 1',
        isOn: true,
        terminals: [
          { id: 'switch-1-a', name: 'left', position: { x: 295, y: 70 } },
          { id: 'switch-1-b', name: 'right', position: { x: 365, y: 70 } },
        ],
      },
      {
        id: 'lamp-1',
        type: 'lamp',
        label: 'Lamp 1',
        resistance: 6,
        isOn: false,
        terminals: [
          { id: 'lamp-1-a', name: 'left', position: { x: 515, y: 70 } },
          { id: 'lamp-1-b', name: 'right', position: { x: 585, y: 70 } },
        ],
      },
    ],
    wires: [
      { id: 'wire-1', fromTerminalId: 'battery-1-pos', toTerminalId: 'switch-1-a' },
      { id: 'wire-2', fromTerminalId: 'switch-1-b', toTerminalId: 'lamp-1-a' },
    ],
    version: 0,
  },
  objectives: [
    {
      id: 'fault-repaired',
      category: 'circuit',
      title: 'Repair the circuit so the lamp lights',
      predicate: { type: 'lampDarkToLit' },
    },
    {
      id: 'concept-check',
      category: 'learning',
      title: 'Diagnose why the lamp was dark',
      predicate: { type: 'quizCorrect', quizId: 'quiz-diagnosis' },
    },
  ],
  hints: [
    'Read the circuit diagnostic. What does the Reason say?',
    'Follow the loop from battery + through the switch and lamp. Where does it stop?',
    'The lamp has nothing joined to its right terminal. Connect Lamp 1 right to Battery 1 negative.',
  ],
  quiz: {
    id: 'quiz-diagnosis',
    prompt: 'What was wrong with the circuit at the start?',
    correctOptionId: 'missing-return',
    misconception: 'A dark lamp means the battery has run out. In the model, the battery is unchanged and the path was incomplete.',
    options: [
      {
        id: 'more-colors',
        text: 'The bulb needs more colors.',
        explanation:
          'Not quite. Color does not decide whether a lamp lights in this model. The diagnostic pointed at the path, not at the bulb.',
      },
      {
        id: 'missing-return',
        text: 'There was no complete return path back to the battery.',
        explanation:
          'Yes. The loop stopped at the lamp. With no wire back to the battery negative terminal, the simulation found no energized path, and the wire you added closed the loop.',
      },
      {
        id: 'battery-empty',
        text: 'The battery had run out of electricity.',
        explanation:
          'Not quite. The battery in the model never changed. Once the gap was closed, the same battery lit the lamp.',
      },
    ],
  },
  recap: {
    built: 'a repaired series loop: battery, closed switch, lamp, and the return wire you added.',
    observed:
      'the simulation reported no energized path while the return wire was missing, and the lamp lit after you connected it.',
    explained: 'a lamp needs a complete path back to the battery, and a single missing wire breaks it.',
    tryNext: 'Mission 3: Light the City. Power two lamps so one can go dark while the other stays on.',
  },
})
