import { solveCircuit, type CircuitGraph } from '../../domain/circuit'
import { buildTutorContext as build, type Mission } from '../../domain/learning'

export { buildTutorContext, localTutor, resolveHint, mission1 } from '../../domain/learning'

/** Test helper: the input for `buildTutorContext` for a graph at hint level 1. */
export function solveCircuitForTest(graph: CircuitGraph, mission: Mission): Parameters<typeof build>[0] {
  return {
    missionId: mission.id,
    report: solveCircuit(graph),
    graph,
    phase: 'building',
    hintLevel: 1,
    events: [],
    objectives: mission.objectives.map(o => ({ id: o.id, title: o.title, category: o.category, met: false })),
  }
}
