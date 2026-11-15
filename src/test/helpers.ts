import { createEmptyGraph } from '../domain/circuit'
import { createFreshSession } from '../domain/learning'
import { useLabStore } from '../features/lab/labStore'
import { useSettingsStore } from '../features/lab/settingsStore'
import { act, renderHook } from '@testing-library/react'
import { useMissionBridge, useMissionStore } from '../features/missions/missionStore'
import { useSessionStatus } from '../features/session/sessionStore'
/** Returns every store to a first-visit state and clears browser storage. For tests only. */
export function resetStores() {
  window.localStorage.clear()
  useSettingsStore.setState({ lowPower: false })
  useMissionStore.getState().hydrate(createFreshSession())
  useLabStore.setState({ graph: createEmptyGraph(), past: [], future: [], baseline: null, pendingTerminalId: null, feedback: null })
  useSessionStatus.setState({ loadOutcome: 'empty', storage: 'ok', eraseResult: 'none' })
}
/** Wires two terminals through the same store action the schematic and 3D views use. */
export function connect(from: string, to: string) {
  const lab = useLabStore.getState()
  lab.selectTerminal(from)
  useLabStore.getState().selectTerminal(to)
}
const LOOP_1: [string, string][] = [
  ['battery-1-pos', 'switch-1-a'],
  ['switch-1-b', 'lamp-1-a'],
  ['lamp-1-b', 'battery-1-neg'],
]
const PARALLEL_3: [string, string][] = [
  ['battery-1-pos', 'switch-1-a'],
  ['battery-1-pos', 'switch-2-a'],
  ['switch-1-b', 'lamp-1-a'],
  ['switch-2-b', 'lamp-2-a'],
  ['lamp-1-b', 'battery-1-neg'],
  ['lamp-2-b', 'battery-1-neg'],
]
/** Plays the authored winning path for a mission through the store API (needs the mission bridge mounted). */
export function playToQuiz(missionId: 'mission-1' | 'mission-2' | 'mission-3') {
  const ms = useMissionStore.getState()
  const lab = () => useLabStore.getState()
  if (!ms.selectMission(missionId)) throw new Error(`${missionId} is locked`)
  useMissionStore.getState().startMission()
  if (missionId === 'mission-1') {
    LOOP_1.forEach(([a, b]) => connect(a, b))
    lab().toggleSwitch('switch-1')
    lab().toggleSwitch('switch-1')
  } else if (missionId === 'mission-2') {
    connect('lamp-1-b', 'battery-1-neg')
  } else {
    PARALLEL_3.forEach(([a, b]) => connect(a, b))
    lab().toggleSwitch('switch-1')
  }
}
const CORRECT: Record<string, string> = { 'mission-1': 'interrupted-path', 'mission-2': 'missing-return', 'mission-3': 'separate-branches' }
export function completeMission(missionId: 'mission-1' | 'mission-2' | 'mission-3') {
  playToQuiz(missionId)
  const { send } = useMissionStore.getState()
  send({ type: 'answerQuiz', optionId: CORRECT[missionId] })
  useMissionStore.getState().send({ type: 'finish' })
}
/** Completes a mission with a temporary mission bridge, for UI tests that mount their own. */
export function completeMissionHeadless(missionId: 'mission-1' | 'mission-2' | 'mission-3') {
  const { unmount } = renderHook(() => useMissionBridge())
  try {
    act(() => completeMission(missionId))
  } finally {
    unmount()
  }
}
