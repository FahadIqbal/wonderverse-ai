import { useMemo } from 'react'
import { solveCircuit, type SimulationReport } from '../../domain/circuit'
import { useLabStore } from './labStore'

/** Derives the report from the canonical graph; recomputed only when the graph changes. */
export function useSimulationReport(): SimulationReport {
  const graph = useLabStore(s => s.graph)
  return useMemo(() => solveCircuit(graph), [graph])
}
