import { Mission } from './schemas'
function part(id: string, type: 'switch' | 'lamp', label: string, x: number, y: number, resistance?: number) {
  const base = {
    id,
    type,
    label,
    isOn: type === 'switch', // switches start closed so wiring a branch lights its lamp straight away
    ...(resistance === undefined ? {} : { resistance }),
    terminals: [
      { id: `${id}-a`, name: 'left', position: { x: x - 35, y } },
      { id: `${id}-b`, name: 'right', position: { x: x + 35, y } },
    ],
  }
  return base
}
/**
 * Mission 3 content comes from docs/13-CONTENT-AND-MISSIONS.md. The parts (one battery, two lamps, one switch per
 * lamp) are supplied unwired. The learner builds two branches across the battery. Series is the contrast case: in a
 * single loop, opening any switch darkens both lamps, which the objective rejects and the quiz explains.
 */
export const mission3 = Mission.parse({
  id: 'mission-3',
  title: 'Light the City',
  opening: 'Light two neighborhoods so one street can go dark while the other stays on.',
  partsNote:
    'You have a 3 V battery, two 6 Ω lamps and a switch for each lamp. Give each lamp its own branch across the battery, then open one switch.',
  safetyNote:
    'This lab uses a simplified model of a small battery circuit. Real electrical systems can be dangerous, and this is not a wiring guide.',
  quizLockedNote: 'Locked until both lamps have lit and you have opened one branch while the other stayed on.',
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
      part('switch-1', 'switch', 'Switch 1', 330, 70),
      part('lamp-1', 'lamp', 'Lamp 1', 550, 70, 6),
      part('switch-2', 'switch', 'Switch 2', 110, 200),
      part('lamp-2', 'lamp', 'Lamp 2', 330, 200, 6),
    ],
    wires: [],
    version: 0,
  },
  objectives: [
    {
      id: 'both-lit',
      category: 'circuit',
      title: 'Light both lamps',
      predicate: { type: 'allLampsEnergized', minLamps: 2 },
    },
    {
      id: 'branch-off',
      category: 'circuit',
      title: 'Open one switch while the other lamp stays lit',
      predicate: { type: 'branchIndependence' },
    },
    {
      id: 'concept-check',
      category: 'learning',
      title: 'Explain why the other lamp stayed lit',
      predicate: { type: 'quizCorrect', quizId: 'quiz-branches' },
    },
  ],
  hints: [
    'Each lamp needs its own route from the battery and back.',
    'Both branches start at battery + and end at battery -. Put a lamp and its switch on each branch.',
    'Connect battery + to Switch 1 left and Switch 2 left. Then Switch 1 right to Lamp 1 left, Switch 2 right to Lamp 2 left, and each lamp right to battery -.',
  ],
  quiz: {
    id: 'quiz-branches',
    prompt: 'One switch is open and its lamp is dark, but the other lamp is still lit. Why?',
    correctOptionId: 'separate-branches',
    misconception: 'The battery sends all its electricity to one lamp. In the model, each closed branch gets the battery voltage.',
    options: [
      {
        id: 'single-loop',
        text: 'The two lamps share one single loop, and the open switch only affects its own lamp.',
        explanation:
          'Not quite. If both lamps shared one loop (a series circuit), opening any switch would break the only path and both lamps would go dark in this model.',
      },
      {
        id: 'separate-branches',
        text: 'Each lamp has its own branch across the battery, so the other branch is still a complete path.',
        explanation:
          'Yes. Parallel lamps sit on separate branches across the same battery. Opening one branch breaks only that path, so the other lamp keeps its complete loop.',
      },
      {
        id: 'battery-sends-all',
        text: 'The battery sends all its electricity to the lamp that is still on.',
        explanation:
          'Not quite. The battery does not pick a favorite. Each closed branch gets the battery voltage, and the open branch just has no path.',
      },
    ],
  },
  recap: {
    built: 'a parallel circuit: two lamp-and-switch branches across one battery.',
    observed:
      'both lamps lit together, and when you opened one branch the other lamp stayed lit, as reported by the simulation.',
    explained: 'parallel lamps have separate branches across the battery, so opening one branch leaves the other path complete.',
    tryNext:
      'You finished all three missions. Replay one and try wiring the lamps in series to compare what opening a switch does.',
  },
})
