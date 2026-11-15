import { isLampIlluminated, type CircuitGraph, type SimulationReport } from '../circuit'
import type { Mission, Objective, ObjectiveCategory, SemanticEvent } from './schemas'

export interface ObjectiveStatus {
  id: string
  category: ObjectiveCategory
  title: string
  /** Whether the predicate holds right now for this report, graph and log. */
  met: boolean
  /** Short, learner-facing explanation of the current state. */
  detail: string
}

export interface MissionEvaluation {
  objectives: ObjectiveStatus[]
}

export type MissionEvaluator = (
  report: SimulationReport,
  graph: CircuitGraph,
  eventLog: readonly SemanticEvent[],
) => MissionEvaluation

function evaluateObjective(
  mission: Mission,
  objective: Objective,
  report: SimulationReport,
  graph: CircuitGraph,
  eventLog: readonly SemanticEvent[],
): { met: boolean; detail: string } {
  const p = objective.predicate
  switch (p.type) {
    case 'lampEnergized': {
      const lamps = graph.components.filter(c => c.type === 'lamp' && (!p.lampId || c.id === p.lampId))
      if (lamps.length === 0) return { met: false, detail: 'No lamp on the workbench yet.' }
      const lit = report.status === 'VALID' && lamps.some(l => isLampIlluminated(report, l.id))
      return lit
        ? { met: true, detail: 'The simulation says the lamp is energized.' }
        : { met: false, detail: `The lamp is not lit. Simulation: ${report.reason}.` }
    }
    case 'switchOutcomesObserved': {
      const toggles = eventLog.filter(
        (e): e is Extract<SemanticEvent, { type: 'switch_toggled' }> =>
          e.type === 'switch_toggled' && (!p.switchId || e.componentId === p.switchId),
      )
      const sawLit = toggles.some(e => e.lampLit)
      const sawDark = toggles.some(e => !e.lampLit)
      if (sawLit && sawDark) return { met: true, detail: 'You saw the lamp lit and dark by toggling the switch.' }
      if (toggles.length === 0) return { met: false, detail: 'Toggle the switch to compare open and closed.' }
      return {
        met: false,
        detail: sawLit ? 'You saw the lamp lit. Now open the switch to see it go dark.' : 'You saw the lamp dark. Now close the switch to light it.',
      }
    }
    case 'allLampsEnergized': {
      const lamps = graph.components.filter(c => c.type === 'lamp')
      if (lamps.length < p.minLamps) {
        return { met: false, detail: `Put at least ${p.minLamps} lamps on the workbench. You have ${lamps.length}.` }
      }
      const lit = lamps.filter(l => report.status === 'VALID' && isLampIlluminated(report, l.id))
      return lit.length === lamps.length
        ? { met: true, detail: 'The simulation says every lamp is energized.' }
        : { met: false, detail: `${lit.length} of ${lamps.length} lamps are lit. Simulation: ${report.reason}.` }
    }
    case 'lampDarkToLit': {
      const ok = eventLog.some(
        e => e.type === 'lamp_state_changed' && e.litBefore.length === 0 && e.litAfter.length > 0,
      )
      return ok
        ? { met: true, detail: 'Your change took the circuit from dark to lit.' }
        : { met: false, detail: `No lamp has lit up after a change of yours yet. Simulation: ${report.reason}.` }
    }
    case 'branchIndependence': {
      const toggles = eventLog.filter(
        (e): e is Extract<SemanticEvent, { type: 'switch_toggled' }> => e.type === 'switch_toggled' && !e.isOn,
      )
      const ok = toggles.some(e => {
        const before = e.litBefore ?? []
        const after = e.litAfter ?? []
        return before.length >= 2 && after.length >= 1 && after.length < before.length
      })
      if (ok) return { met: true, detail: 'You opened one branch and the other lamp stayed lit.' }
      const sawAllDark = toggles.some(e => (e.litBefore?.length ?? 0) >= 2 && (e.litAfter?.length ?? 0) === 0)
      return {
        met: false,
        detail: sawAllDark
          ? 'Opening that switch darkened every lamp, so they share one path. Give each lamp its own branch.'
          : 'Light both lamps, then open one lamp\'s switch and see whether the other stays lit.',
      }
    }
    case 'quizCorrect': {
      const correct = mission.quiz.correctOptionId
      const ok = eventLog.some(e => e.type === 'quiz_answered' && e.quizId === p.quizId && e.optionId === correct)
      return ok ? { met: true, detail: 'Concept check answered correctly.' } : { met: false, detail: 'Concept check not answered yet.' }
    }
  }
}

/** Builds the pure evaluator for a mission: (report, graph, eventLog) -> per-objective status. */
export function createMissionEvaluator(mission: Mission): MissionEvaluator {
  return (report, graph, eventLog) => ({
    objectives: mission.objectives.map(o => ({
      id: o.id,
      category: o.category,
      title: o.title,
      ...evaluateObjective(mission, o, report, graph, eventLog),
    })),
  })
}
