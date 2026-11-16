import { Mission } from './schemas'

/**
 * Mission 1 content comes from docs/13-CONTENT-AND-MISSIONS.md. Parts are placed but unwired and the
 * switch starts open, so the learner must build the loop and sees a dark lamp first.
 * Positions match the lab's grid slots so the schematic lays out cleanly.
 */
export const mission1 = Mission.parse({
  id: 'mission-1',
  title: 'Complete the Loop',
  opening: "Nova's city is dim. Can you make one lamp glow?",
  partsNote:
    'You have a 3 V battery, a 6 Ω bulb, a switch and wires. Connect them into one path, then open and close the switch to compare.',
  safetyNote:
    'This lab uses a simplified model of a small battery circuit. Real electrical systems can be dangerous, and this is not a wiring guide.',
  quizLockedNote: 'Locked until your lamp has glowed and you have seen the switch open and closed.',
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
        isOn: false,
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
    wires: [],
    version: 0,
  },
  objectives: [
    {
      id: 'lamp-lit',
      category: 'circuit',
      title: 'Make the lamp glow with a complete loop',
      predicate: { type: 'lampEnergized' },
    },
    {
      id: 'switch-compare',
      category: 'circuit',
      title: 'Open and close the switch to see both outcomes',
      predicate: { type: 'switchOutcomesObserved' },
    },
    {
      id: 'concept-check',
      category: 'learning',
      title: 'Answer the concept check',
      predicate: { type: 'quizCorrect', quizId: 'quiz-switch-off' },
    },
  ],
  hints: [
    'Find the path.',
    'Every circuit needs a return route.',
    'Trace battery + → switch → bulb → battery -.',
  ],
  quiz: {
    id: 'quiz-switch-off',
    prompt: 'Why did opening the switch turn off the lamp?',
    correctOptionId: 'interrupted-path',
    misconception: 'Opening a switch uses up the electricity. In the model, the battery is unchanged and only the path is broken.',
    options: [
      {
        id: 'used-all',
        text: 'It used all the electricity.',
        explanation:
          'Not quite. The battery was still there. Opening the switch left a gap in the path, so current had no complete route.',
      },
      {
        id: 'interrupted-path',
        text: 'It interrupted the complete path.',
        explanation:
          'Yes. In this simple circuit a closed path lets current flow. An open switch is a gap in the loop, so the current stops and the lamp goes dark.',
      },
      {
        id: 'battery-stronger',
        text: 'It made the battery weaker.',
        explanation:
          'Not quite. The battery stays the same in the model. What changed is the path: the open switch breaks the loop.',
      },
    ],
  },
  recap: {
    built: 'a series loop: battery, switch, lamp, and the wires that join them.',
    observed:
      'the lamp lit when the switch was closed and went dark when it was open, as reported by the simulation.',
    explained: 'an open switch interrupts the complete path, so current stops.',
    tryNext: 'Mission 2: Fix the Fault. Find what is missing in a circuit that went dark.',
  },
})
