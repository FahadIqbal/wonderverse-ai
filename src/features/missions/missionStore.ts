import { useEffect } from 'react'
import { create } from 'zustand'
import { createEmptyGraph, solveCircuit, type CircuitGraph } from '../../domain/circuit'
import {
  createFreshSession,
  diffGraphEvents,
  FIRST_MISSION_ID,
  getMission,
  isMissionUnlocked,
  mission1,
  buildRecap,
  type Mission,
  type MissionRecap,
  type Session,
} from '../../domain/learning'
import { useLabStore } from '../lab/labStore'
import { initialMissionState, missionReducer, type MissionInput, type MissionState } from './missionMachine'

/** A mission's saved progress plus the circuit the learner left on the bench. */
export interface SavedMission {
  state: MissionState
  graph: CircuitGraph
}
interface MissionStore {
  missionId: string
  mission: Mission
  state: MissionState
  /** Ids of missions finished at least once. A set in effect: an id is added once and never removed by replay. */
  completed: string[]
  /** Saved progress of missions other than the live one (the live one is read from `state` and the lab). */
  saved: Record<string, SavedMission>
  /** What was built and measured when each mission was completed. Kept after a replay until the next completion. */
  recaps: Record<string, MissionRecap>
  send: (input: MissionInput) => void
  /** Loads the setup graph into the lab, then starts the mission. */
  startMission: () => void
  /** Reloads the setup graph and returns to the briefing. Only effective after completion. */
  restartMission: () => void
  /** Makes an unlocked mission the live one, saving the current one first. Returns false if it is locked. */
  selectMission: (id: string) => boolean
  /** Replaces all progress from a validated session (the first mission becomes live). */
  hydrate: (session: Pick<Session, 'completed' | 'missions' | 'recaps'>) => void
  /** Back to a first-visit state. Used by Erase my progress. */
  resetAll: () => void
}
let bridgeSuspended = 0
/** Runs a programmatic graph load without the bridge turning it into learner events. */
function quietly(fn: () => void) {
  bridgeSuspended++
  try {
    fn()
  } finally {
    bridgeSuspended--
  }
}
function loadSetup(mission: Mission) {
  quietly(() => useLabStore.getState().loadGraph(mission.setupGraph, mission.setupGraph))
  useLabStore.setState({ feedback: { kind: 'info', text: 'Mission parts are on the workbench.' } })
}
/** Pure: the saved-mission map as it should be persisted, including the live mission unless it is at the briefing. */
export function snapshotMissions(
  s: Pick<MissionStore, 'missionId' | 'state' | 'saved'>,
  graph: CircuitGraph,
): Record<string, SavedMission> {
  const out = { ...s.saved }
  if (s.state.phase === 'briefing') delete out[s.missionId]
  else out[s.missionId] = { state: s.state, graph }
  return out
}
export const useMissionStore = create<MissionStore>((set, get) => ({
  missionId: FIRST_MISSION_ID,
  mission: mission1,
  state: initialMissionState,
  completed: [],
  saved: {},
  recaps: {},
  send: input => {
    const { mission, state, completed } = get()
    const graph = useLabStore.getState().graph
    const next = missionReducer(state, input, { mission, graph, report: solveCircuit(graph) })
    if (next === state) return
    const justCompleted = next.phase === 'complete' && state.phase !== 'complete'
    set({
      state: next,
      ...(justCompleted && !completed.includes(mission.id) ? { completed: [...completed, mission.id] } : {}),
      ...(justCompleted ? { recaps: { ...get().recaps, [mission.id]: buildRecap(graph, solveCircuit(graph), next.hintsShown) } } : {}),
    })
  },
  startMission: () => {
    const { mission, state, send } = get()
    if (state.phase !== 'briefing') return
    loadSetup(mission)
    send({ type: 'start' })
  },
  restartMission: () => {
    const { mission, state, send, saved } = get()
    if (state.phase !== 'complete') return
    loadSetup(mission)
    const rest = { ...saved }
    delete rest[mission.id]
    set({ saved: rest })
    send({ type: 'restart' })
  },
  selectMission: id => {
    const s = get()
    const target = getMission(id)
    if (!target || !isMissionUnlocked(id, s.completed)) return false
    if (id === s.missionId) return true
    const saved = snapshotMissions(s, useLabStore.getState().graph)
    const entry = saved[id]
    quietly(() => {
      if (entry) useLabStore.getState().loadGraph(entry.graph, target.setupGraph)
      else useLabStore.getState().loadGraph(createEmptyGraph(), null)
      set({ missionId: id, mission: target, state: entry?.state ?? initialMissionState, saved })
    })
    return true
  },
  hydrate: session => {
    const mission = getMission(FIRST_MISSION_ID) ?? mission1
    const entry = session.missions[mission.id]
    quietly(() => {
      if (entry) useLabStore.getState().loadGraph(entry.graph, mission.setupGraph)
      else useLabStore.getState().loadGraph(createEmptyGraph(), null)
      useLabStore.setState({ feedback: null })
      set({
        missionId: mission.id,
        mission,
        state: entry?.state ?? initialMissionState,
        completed: [...session.completed],
        saved: { ...session.missions },
        recaps: { ...session.recaps },
      })
    })
  },
  resetAll: () => get().hydrate(createFreshSession()),
}))
/** Turns lab graph changes into semantic events while the mission is in progress. */
export function useMissionBridge() {
  useEffect(() => {
    return useLabStore.subscribe((lab, prev) => {
      if (lab.graph === prev.graph || bridgeSuspended > 0) return
      const { phase } = useMissionStore.getState().state
      if (phase !== 'building' && phase !== 'quiz') return
      for (const event of diffGraphEvents(prev.graph, lab.graph)) {
        useMissionStore.getState().send({ type: 'record', event })
      }
    })
  }, [])
}
