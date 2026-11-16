import { isLampIlluminated, solveCircuit, SolverStatus, ReasonCode, type CircuitComponent, type CircuitGraph, type SimulationReport } from '../circuit'
/** The slice of mission progress the guidance needs. A MissionState plus the mission id satisfies it. */
export interface NextStepMissionState {
  phase: 'briefing' | 'building' | 'quiz' | 'complete'
  missionId: string
  achieved: readonly string[]
  lastAnswer: { correct: boolean } | null
}
export interface NextStep {
  /** Stable identifier of the situation, for tests and analytics-free debugging. */
  id: string
  /** One concrete suggestion in plain words for a 10 to 14 year old. */
  text: string
}
const name = (c: CircuitComponent) => c.label ?? c.id
function connectedTerminals(graph: CircuitGraph): Set<string> {
  return new Set(graph.wires.flatMap(w => [w.fromTerminalId, w.toTerminalId]))
}
/** First part terminal with no wire on it. The battery comes first so the suggestion follows the loop. */
function firstLooseTerminal(graph: CircuitGraph): string | null {
  const wired = connectedTerminals(graph)
  const ordered = [...graph.components].sort((a, b) => Number(b.type === 'battery') - Number(a.type === 'battery'))
  for (const c of ordered) {
    for (const t of c.terminals) {
      if (wired.has(t.id)) continue
      const mark = c.type === 'battery' ? (t.name === 'positive' ? ' + (positive)' : ' − (negative)') : ` ${t.name} terminal`
      return `${name(c)}${mark} is not connected to anything.`
    }
  }
  return null
}
function closedCopy(graph: CircuitGraph): CircuitGraph {
  return { ...graph, components: graph.components.map(c => (c.type === 'switch' ? { ...c, isOn: true } : c)) }
}
/** The wiring problem to point at when no current flows and the cause is not an open switch. */
function wiringStep(graph: CircuitGraph): NextStep {
  if (!graph.components.some(c => c.type === 'lamp' || c.type === 'resistor')) {
    return { id: 'add-load', text: 'There is no lamp or resistor in the loop yet. Add a lamp from the tray and wire it in.' }
  }
  const loose = firstLooseTerminal(graph)
  if (loose) return { id: 'loose-terminal', text: `${loose} Wire it to the next part in the loop.` }
  return {
    id: 'no-route',
    text: 'Every terminal has a wire, but the simulation finds no route from battery + back to battery −. Check both ends of each wire.',
  }
}
function litLamps(graph: CircuitGraph, report: SimulationReport): CircuitComponent[] {
  if (report.status !== SolverStatus.VALID) return []
  return graph.components.filter(c => c.type === 'lamp' && isLampIlluminated(report, c.id))
}
function validStep(report: SimulationReport, graph: CircuitGraph, m: NextStepMissionState): NextStep {
  const lamps = graph.components.filter(c => c.type === 'lamp')
  if (lamps.length === 0) {
    return { id: 'valid-no-lamp', text: 'Current flows, but there is no lamp yet. Add a lamp to see the loop do something visible.' }
  }
  const lit = litLamps(graph, report)
  const dark = lamps.filter(l => !lit.includes(l))
  const switches = graph.components.filter(c => c.type === 'switch')
  if (lit.length === 0) {
    return {
      id: 'valid-lamp-dark',
      text: `Current flows somewhere, but ${name(dark[0])} is not lit. Check that both of its terminals are wired into the loop.`,
    }
  }
  if (m.missionId === 'mission-3' && !m.achieved.includes('both-lit')) {
    if (lamps.length < 2) return { id: 'need-second-lamp', text: `${name(lit[0])} is lit. Add a second lamp with its own switch on a separate branch.` }
    if (dark.length > 0) return { id: 'second-lamp-dark', text: `${name(dark[0])} is not lit. Give it its own route from battery + to battery −.` }
  }
  if (dark.length === 0 && m.missionId === 'mission-3' && !m.achieved.includes('branch-off') && switches.length > 0) {
    const closed = switches.find(s => s.isOn) ?? switches[0]
    return { id: 'try-branch', text: `${lit.length > 1 ? 'Both lamps are' : `${name(lit[0])} is`} lit. Open ${name(closed)} and see whether the other lamp stays lit.` }
  }
  if (dark.length > 0) {
    const open = switches.filter(s => !s.isOn)
    // Blame an open switch only when the solver agrees that closing every switch lights every lamp.
    if (open.length > 0) {
      const closedReport = solveCircuit(closedCopy(graph))
      if (lamps.every(l => closedReport.status === SolverStatus.VALID && isLampIlluminated(closedReport, l.id))) {
        return { id: 'open-switch-dark', text: `${name(lit[0])} is lit and ${name(dark[0])} is not lit while ${name(open[0])} is open. Close it to light the lamp again.` }
      }
    }
    return { id: 'some-dark', text: `${name(lit[0])} is lit, but ${name(dark[0])} is not lit. Check how ${name(dark[0])} is wired.` }
  }
  if (!m.achieved.includes('switch-compare') && switches.length > 0 && m.missionId === 'mission-1') {
    const closed = switches.find(s => s.isOn)
    return closed
      ? { id: 'toggle-switch', text: `${name(lit[0])} is lit. Now open ${name(closed)} to see it go dark, then close it again.` }
      : { id: 'toggle-switch', text: `${name(lit[0])} is lit. Toggle ${name(switches[0])} to compare open and closed.` }
  }
  return { id: 'all-lit', text: `${name(lit[0])} is lit. Check the objectives to see what is left.` }
}
/**
 * One concrete next step, chosen from the solver report, the graph and mission progress.
 * It states a lamp is lit only when the report says so (VALID and that lamp energized).
 */
export function nextStep(report: SimulationReport, graph: CircuitGraph, m: NextStepMissionState): NextStep {
  switch (m.phase) {
    case 'briefing':
      return { id: 'briefing', text: 'Read the briefing, then press Start mission.' }
    case 'complete':
      return { id: 'complete', text: 'Mission complete. Open the recap, or head to the next mission.' }
    case 'quiz':
      if (m.lastAnswer && !m.lastAnswer.correct) {
        return { id: 'quiz-retry', text: 'That answer was not right. Read the explanation, then choose another one.' }
      }
      if (m.lastAnswer?.correct) return { id: 'finish', text: 'All objectives are met. Press Finish mission.' }
      return { id: 'quiz-answer', text: 'Your circuit work is done. Answer the concept check, then press Finish mission.' }
    case 'building':
      break
  }
  switch (report.status) {
    case SolverStatus.NO_BATTERY:
      return graph.components.some(c => c.type === 'battery')
        ? { id: 'battery-unusable', text: 'The battery has no usable voltage. Remove it and add a new one from the tray.' }
        : { id: 'add-battery', text: 'There is no battery on the bench. Add one from the tray.' }
    case SolverStatus.OPEN_CIRCUIT:
      return wiringStep(graph)
    case SolverStatus.SHORT_CIRCUIT:
      return {
        id: 'short',
        text: 'Battery + and battery − are joined by wires or closed switches only, with no lamp or resistor between them. Undo the last wire or remove the one that skips the lamp.',
      }
    case SolverStatus.UNSUPPORTED_TOPOLOGY:
      return report.reason === ReasonCode.MULTIPLE_PATHS
        ? { id: 'extra-battery', text: 'The simulator supports one battery. Remove the extra one.' }
        : { id: 'unsolvable', text: 'The simulator cannot solve this arrangement. Undo your last change.' }
    case SolverStatus.NO_PATH:
      if (report.reason === ReasonCode.SWITCH_OFF) {
        const open = graph.components.filter(c => c.type === 'switch' && !c.isOn)
        // Only say the loop is complete when closing the switches really would complete it, as the solver sees it.
        if (open.length > 0 && solveCircuit(closedCopy(graph)).status === SolverStatus.VALID) {
          return { id: 'close-switch', text: `The loop is complete but ${name(open[0])} is open. Close it to let current through.` }
        }
      }
      return wiringStep(graph)
    case SolverStatus.VALID:
      return validStep(report, graph, m)
  }
}
