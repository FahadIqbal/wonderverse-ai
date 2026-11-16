import { z } from 'zod'
import { CircuitGraph } from '../circuit'
import { getMission, MISSIONS } from './missions'
import { SemanticEvent } from './schemas'
/**
 * Versioned guest session (docs/03: key `wonderverse:session:v1`). It stores only mission progress, the circuit
 * layout per mission and UI preferences. There is no name, id, timestamp, chat text or analytics. Everything read
 * back from storage is untrusted: it is size-limited, Zod-validated and cross-checked against the authored missions.
 */
export const SESSION_KEY = 'wonderverse:session:v1'
/** Every key the app writes starts with this prefix, so erase can clear them all (R8). */
export const STORAGE_PREFIX = 'wonderverse:'
/** v2 added `settings.tourSeen` and the per-mission `recaps`. v1 sessions are migrated on load, never discarded. */
export const SESSION_SCHEMA_VERSION = 2
export const MAX_SESSION_BYTES = 400_000
export const MAX_EVENTS = 1000
const MAX_COMPONENTS = 40
const MAX_WIRES = 120

function graphIsSane(g: CircuitGraph): boolean {
  const finite = (n: number | undefined) => n === undefined || Number.isFinite(n)
  const unique = (ids: string[]) => new Set(ids).size === ids.length
  return (
    g.components.every(c => finite(c.resistance) && finite(c.voltage) && c.terminals.every(t => finite(t.position.x) && finite(t.position.y))) &&
    unique(g.components.map(c => c.id)) &&
    unique(g.components.flatMap(c => c.terminals.map(t => t.id))) &&
    unique(g.wires.map(w => w.id))
  )
}
export const PersistedGraph = CircuitGraph.refine(g => g.components.length <= MAX_COMPONENTS && g.wires.length <= MAX_WIRES, {
  message: 'Circuit is too large',
}).refine(graphIsSane, { message: 'Circuit has duplicate ids or non-finite numbers' })
export const PersistedMissionState = z.object({
  phase: z.enum(['briefing', 'building', 'quiz', 'complete']),
  eventLog: z.array(SemanticEvent).max(MAX_EVENTS),
  achieved: z.array(z.string()).max(20),
  lastAchieved: z.string().nullable(),
  hintsShown: z.number().int().min(0).max(3),
  lastAnswer: z.object({ optionId: z.string(), correct: z.boolean() }).nullable(),
  completions: z.number().int().min(0).max(1),
})
export type PersistedMissionState = z.infer<typeof PersistedMissionState>
export const PersistedMission = z.object({ state: PersistedMissionState, graph: PersistedGraph })
export type PersistedMission = z.infer<typeof PersistedMission>
/** What the learner built and measured at the moment a mission was completed. Counts and readings only. */
export const MissionRecap = z.object({
  /** Component counts by type, from the graph at completion. */
  counts: z.record(z.string(), z.number().int().min(0).max(MAX_COMPONENTS)),
  wires: z.number().int().min(0).max(MAX_WIRES),
  /** Readings copied from the final SimulationReport (batteries and lamps). */
  readings: z
    .array(
      z.object({
        label: z.string().max(60),
        voltage: z.number().finite(),
        current: z.number().finite(),
        energized: z.boolean(),
      }),
    )
    .max(MAX_COMPONENTS),
  hintsUsed: z.number().int().min(0).max(3),
})
export type MissionRecap = z.infer<typeof MissionRecap>
export const Session = z.object({
  schemaVersion: z.literal(SESSION_SCHEMA_VERSION),
  completed: z.array(z.string()).max(50),
  settings: z.object({ lowPower: z.boolean(), tourSeen: z.boolean() }),
  missions: z.record(z.string(), PersistedMission),
  recaps: z.record(z.string(), MissionRecap),
})
export type Session = z.infer<typeof Session>
export function createFreshSession(): Session {
  return { schemaVersion: SESSION_SCHEMA_VERSION, completed: [], settings: { lowPower: false, tourSeen: false }, missions: {}, recaps: {} }
}
/** True when there is nothing worth saving, so storage can hold no key at all. */
export function isPristine(s: Session): boolean {
  return (
    s.completed.length === 0 &&
    Object.keys(s.missions).length === 0 &&
    Object.keys(s.recaps).length === 0 &&
    !s.settings.lowPower &&
    !s.settings.tourSeen
  )
}
export function serializeSession(s: Session): string {
  const missions: Session['missions'] = {}
  for (const [id, m] of Object.entries(s.missions)) {
    missions[id] = { ...m, state: { ...m.state, eventLog: m.state.eventLog.slice(-MAX_EVENTS) } }
  }
  return JSON.stringify({ ...s, missions })
}
export type SessionLoadOutcome = 'empty' | 'restored' | 'corrupt' | 'unsupported-version'
export interface SessionLoadResult {
  session: Session
  outcome: SessionLoadOutcome
}
/** A saved mission is usable only if it agrees with the authored mission it claims to belong to. */
function missionEntryMatches(id: string, entry: PersistedMission): boolean {
  const mission = getMission(id)
  if (!mission) return false
  const { state } = entry
  const objectiveIds = new Set(mission.objectives.map(o => o.id))
  const optionIds = new Set(mission.quiz.options.map(o => o.id))
  return (
    state.achieved.every(a => objectiveIds.has(a)) &&
    (state.lastAchieved === null || objectiveIds.has(state.lastAchieved)) &&
    state.hintsShown <= mission.hints.length &&
    (state.lastAnswer === null || optionIds.has(state.lastAnswer.optionId)) &&
    (state.phase !== 'complete' || state.completions === 1)
  )
}
/**
 * v1 -> v2. A learner who already has progress has seen the app, so the tour is marked seen for them; everyone
 * else gets it once. Malformed v1 data is left as is and fails validation (corrupt) like any other bad input.
 */
function migrateV1(json: unknown): unknown {
  const v1 = json as { completed?: unknown; missions?: unknown; settings?: unknown }
  const hasProgress =
    (Array.isArray(v1.completed) && v1.completed.length > 0) ||
    (typeof v1.missions === 'object' && v1.missions !== null && Object.keys(v1.missions).length > 0)
  const settings = typeof v1.settings === 'object' && v1.settings !== null ? v1.settings : {}
  return { ...v1, schemaVersion: SESSION_SCHEMA_VERSION, settings: { ...settings, tourSeen: hasProgress }, recaps: {} }
}
/**
 * Never throws. Missing, corrupt, oversized or unknown-version data yields a fresh session and says why.
 * Unusable single missions are dropped while the rest of the session is kept.
 */
export function parseSession(raw: string | null): SessionLoadResult {
  const fresh = (outcome: SessionLoadOutcome): SessionLoadResult => ({ session: createFreshSession(), outcome })
  if (raw === null) return fresh('empty')
  if (raw.length > MAX_SESSION_BYTES) return fresh('corrupt')
  let json: unknown
  try {
    json = JSON.parse(raw)
  } catch {
    return fresh('corrupt')
  }
  if (typeof json !== 'object' || json === null || Array.isArray(json)) return fresh('corrupt')
  const version = (json as { schemaVersion?: unknown }).schemaVersion
  if (version === 1) json = migrateV1(json)
  else if (version !== SESSION_SCHEMA_VERSION) return fresh(typeof version === 'number' ? 'unsupported-version' : 'corrupt')
  const envelope = Session.omit({ missions: true, recaps: true })
    .extend({ missions: z.record(z.string(), z.unknown()), recaps: z.record(z.string(), z.unknown()) })
    .safeParse(json)
  if (!envelope.success) return fresh('corrupt')
  const known = new Set(MISSIONS.map(m => m.id))
  const missions: Session['missions'] = {}
  for (const [id, value] of Object.entries(envelope.data.missions)) {
    const entry = PersistedMission.safeParse(value)
    if (entry.success && missionEntryMatches(id, entry.data)) missions[id] = entry.data
  }
  const recaps: Session['recaps'] = {}
  for (const [id, value] of Object.entries(envelope.data.recaps)) {
    const recap = MissionRecap.safeParse(value)
    if (recap.success && known.has(id)) recaps[id] = recap.data
  }
  return {
    outcome: 'restored',
    session: {
      schemaVersion: SESSION_SCHEMA_VERSION,
      completed: [...new Set(envelope.data.completed.filter(id => known.has(id)))],
      settings: envelope.data.settings,
      missions,
      recaps,
    },
  }
}
