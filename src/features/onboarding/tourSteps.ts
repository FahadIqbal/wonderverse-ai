export interface TourStep {
  id: 'tray' | 'ports' | 'diagnostic' | 'tutor'
  title: string
  body: string
  /** The region this step points at (`data-tour` attribute). */
  target: string
}
export const TOUR_STEPS: readonly TourStep[] = [
  {
    id: 'tray',
    title: 'Add parts from the tray',
    body: 'The component tray adds a battery, lamp, resistor, switch or jumper wire to the workbench. Each button is a real button, so you can use the keyboard.',
    target: 'tray',
  },
  {
    id: 'ports',
    title: 'Join parts at their terminals',
    body: 'Every part has terminals (ports). Choose one terminal, then a second one, to connect them with a wire. Press Escape to cancel. You never need to drag.',
    target: 'ports',
  },
  {
    id: 'diagnostic',
    title: 'Check the circuit diagnostic',
    body: 'The diagnostic shows what the simulation found: its status and reason, and the voltage and current for each part. The lamps and the mission checks follow this report.',
    target: 'diagnostic',
  },
  {
    id: 'tutor',
    title: 'Ask Nova when you are stuck',
    body: 'Nova is a guide that reads the same simulation report. Ask a question, or use the mission hints. Nova cannot finish the mission for you.',
    target: 'tutor',
  },
]
