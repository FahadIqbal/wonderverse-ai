import type { Mission } from './schemas'
import { mission1 } from './mission1'
import { mission2 } from './mission2'
import { mission3 } from './mission3'
/** The authored mission order. Mission N+1 unlocks only after mission N is completed. */
export const MISSIONS: readonly Mission[] = [mission1, mission2, mission3]
export const FIRST_MISSION_ID = MISSIONS[0].id
export type MissionAvailability = 'locked' | 'unlocked' | 'completed'
export function getMission(id: string): Mission | undefined {
  return MISSIONS.find(m => m.id === id)
}
export function missionIndex(id: string): number {
  return MISSIONS.findIndex(m => m.id === id)
}
export function nextMission(id: string): Mission | undefined {
  const i = missionIndex(id)
  return i >= 0 ? MISSIONS[i + 1] : undefined
}
/** Pure unlock rule: the first mission is always open; every other one needs its predecessor completed. */
export function missionAvailability(id: string, completed: readonly string[]): MissionAvailability {
  const i = missionIndex(id)
  if (i < 0) return 'locked'
  if (completed.includes(id)) return 'completed'
  return i === 0 || completed.includes(MISSIONS[i - 1].id) ? 'unlocked' : 'locked'
}
export const isMissionUnlocked = (id: string, completed: readonly string[]) => missionAvailability(id, completed) !== 'locked'
