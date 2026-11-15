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
export const SESSION_SCHEMA_VERSION = 1
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
export const Session = z.object({
  schemaVersion: z.literal(SESSION_SCHEMA_VERSION),
  completed: z.array(z.string()).max(50),
  settings: z.object({ lowPower: z.boolean() }),
  missions: z.record(z.string(), PersistedMission),
})
export type Session = z.infer<typeof Session>
export function createFreshSession(): Session {
  return { schemaVersion: SESSION_SCHEMA_VERSION, completed: [], settings: { lowPower: false }, missions: {} }
}
/** True when there is nothing worth saving, so storage can hold no key at all. */
export function isPristine(s: Session): boolean {
  return s.completed.length === 0 && Object.keys(s.missions).length === 0 && !s.settings.lowPower
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
  if (version !== SESSION_SCHEMA_VERSION) return fresh(typeof version === 'number' ? 'unsupported-version' : 'corrupt')
  const envelope = Session.omit({ missions: true })
    .extend({ missions: z.record(z.string(), z.unknown()) })
    .safeParse(json)
  if (!envelope.success) return fresh('corrupt')
  const known = new Set(MISSIONS.map(m => m.id))
  const missions: Session['missions'] = {}
  for (const [id, value] of Object.entries(envelope.data.missions)) {
    const entry = PersistedMission.safeParse(value)
    if (entry.success && missionEntryMatches(id, entry.data)) missions[id] = entry.data
  }
  return {
    outcome: 'restored',
    session: {
      schemaVersion: SESSION_SCHEMA_VERSION,
      completed: [...new Set(envelope.data.completed.filter(id => known.has(id)))],
      settings: envelope.data.settings,
      missions,
    },
  }
}
