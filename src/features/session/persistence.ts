import { createFreshSession, SESSION_SCHEMA_VERSION, type Session } from '../../domain/learning'
import { useLabStore } from '../lab/labStore'
import { useSettingsStore } from '../lab/settingsStore'
import { snapshotMissions, useMissionStore } from '../missions/missionStore'
import { useSessionStatus } from './sessionStore'
import { discardSavedSession, eraseAllStoredData, loadSession, saveSession } from './storage'
let suspended = false
/** The session as it should be saved right now. Pure read of the stores; nothing here is derived from the report. */
export function buildSession(): Session {
  const ms = useMissionStore.getState()
  return {
    schemaVersion: SESSION_SCHEMA_VERSION,
    completed: [...ms.completed],
    settings: { lowPower: useSettingsStore.getState().lowPower },
    missions: snapshotMissions(ms, useLabStore.getState().graph),
  }
}
export function persistNow(): void {
  if (suspended) return
  const storage = saveSession(buildSession())
  if (useSessionStatus.getState().storage !== storage) useSessionStatus.setState({ storage })
}
/**
 * Restores the saved session into the stores, then saves on every change. Call once at startup.
 * Corrupt or unknown-version data is ignored, so the app starts fresh instead of crashing.
 */
export function startSessionPersistence(): () => void {
  const { session, outcome, storage } = loadSession()
  if (outcome === 'corrupt') discardSavedSession()
  suspended = true
  try {
    useSettingsStore.getState().setLowPower(session.settings.lowPower)
    useMissionStore.getState().hydrate(session)
  } finally {
    suspended = false
  }
  useSessionStatus.setState({ loadOutcome: outcome, storage })
  const unsubs = [useLabStore.subscribe(persistNow), useMissionStore.subscribe(persistNow), useSettingsStore.subscribe(persistNow)]
  return () => unsubs.forEach(u => u())
}
/** R8: clears every WonderVerse key and returns the stores to a first-visit state. */
export function eraseAllProgress(): boolean {
  suspended = true
  try {
    const cleared = eraseAllStoredData()
    useSettingsStore.getState().setLowPower(false)
    useMissionStore.getState().hydrate(createFreshSession())
    useSessionStatus.setState({ loadOutcome: 'empty', storage: 'ok', eraseResult: cleared ? 'done' : 'failed' })
    return cleared
  } finally {
    suspended = false
  }
}
