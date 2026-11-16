import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { createFreshSession, isPristine, SESSION_SCHEMA_VERSION, MAX_SESSION_BYTES, parseSession, serializeSession, SESSION_KEY, type Session } from './session'
import { mission2 } from './mission2'
function sampleSession(): Session {
  return {
    ...createFreshSession(),
    completed: ['mission-1'],
    settings: { lowPower: true, tourSeen: true },
    recaps: {
      'mission-1': {
        counts: { battery: 1, switch: 1, lamp: 1 },
        wires: 3,
        readings: [{ label: 'Lamp 1', voltage: 3, current: 0.5, energized: true }],
        hintsUsed: 1,
      },
    },
    missions: {
      'mission-2': {
        state: {
          phase: 'quiz',
          eventLog: [
            { type: 'wire_added', wireId: 'wire-3' },
            { type: 'lamp_state_changed', litBefore: [], litAfter: ['lamp-1'] },
          ],
          achieved: ['fault-repaired'],
          lastAchieved: 'fault-repaired',
          hintsShown: 2,
          lastAnswer: { optionId: 'more-colors', correct: false },
          completions: 0,
        },
        graph: mission2.setupGraph,
      },
    },
  }
}
const withMission = (patch: (m: Record<string, unknown>) => void) => {
  const json = JSON.parse(serializeSession(sampleSession()))
  patch(json.missions['mission-2'])
  return JSON.stringify(json)
}
describe('session persistence schema', () => {
  it('uses the documented versioned key', () => {
    expect(SESSION_KEY).toBe('wonderverse:session:v1')
  })
  it('round-trips a session exactly', () => {
    const s = sampleSession()
    const out = parseSession(serializeSession(s))
    expect(out.outcome).toBe('restored')
    expect(out.session).toEqual(s)
  })
  it('stores no personal fields', () => {
    const keys = JSON.stringify(Object.keys(JSON.parse(serializeSession(sampleSession()))))
    expect(keys).toBe('["schemaVersion","completed","settings","missions","recaps"]')
  })
  it('treats missing data as an empty fresh session', () => {
    const out = parseSession(null)
    expect(out.outcome).toBe('empty')
    expect(out.session).toEqual(createFreshSession())
    expect(isPristine(out.session)).toBe(true)
  })
  it.each(['{', '', 'null', '[]', '"text"', '42', '{"schemaVersion":1}', '{"schemaVersion":1,"completed":"x","settings":{},"missions":{}}'])(
    'falls back to a fresh session for corrupt data %j',
    raw => {
      const out = parseSession(raw)
      expect(out.outcome).toBe('corrupt')
      expect(out.session).toEqual(createFreshSession())
    },
  )
  it('falls back for an unknown or future schema version, and for a non-numeric version', () => {
    expect(parseSession(JSON.stringify({ ...sampleSession(), schemaVersion: 3 })).outcome).toBe('unsupported-version')
    expect(parseSession(JSON.stringify({ ...sampleSession(), schemaVersion: 0 })).outcome).toBe('unsupported-version')
    expect(parseSession(JSON.stringify({ ...sampleSession(), schemaVersion: '1' })).outcome).toBe('corrupt')
  })
  describe('v1 -> v2 migration', () => {
    const v1 = (over: Record<string, unknown> = {}) =>
      JSON.stringify({ schemaVersion: 1, completed: [], settings: { lowPower: false }, missions: {}, ...over })
    it('keeps progress and settings, adds empty recaps, and marks the tour seen for a learner with progress', () => {
      const missions = JSON.parse(serializeSession(sampleSession())).missions
      const out = parseSession(v1({ completed: ['mission-1'], settings: { lowPower: true }, missions }))
      expect(out.outcome).toBe('restored')
      expect(out.session.schemaVersion).toBe(SESSION_SCHEMA_VERSION)
      expect(out.session.completed).toEqual(['mission-1'])
      expect(out.session.settings).toEqual({ lowPower: true, tourSeen: true })
      expect(Object.keys(out.session.missions)).toEqual(['mission-2'])
      expect(out.session.recaps).toEqual({})
    })
    it('leaves the tour unseen for a v1 session with no progress', () => {
      const out = parseSession(v1({ settings: { lowPower: true } }))
      expect(out.outcome).toBe('restored')
      expect(out.session.settings).toEqual({ lowPower: true, tourSeen: false })
    })
    it('still treats malformed v1 data as corrupt', () => {
      expect(parseSession(v1({ settings: { lowPower: 'yes' } })).outcome).toBe('corrupt')
      expect(parseSession(v1({ completed: 'x' })).outcome).toBe('corrupt')
    })
  })
  it('drops an invalid or unknown-mission recap but keeps the rest', () => {
    const json = JSON.parse(serializeSession(sampleSession()))
    json.recaps['mission-99'] = json.recaps['mission-1']
    json.recaps['mission-2'] = { counts: 'x' }
    const out = parseSession(JSON.stringify(json))
    expect(Object.keys(out.session.recaps)).toEqual(['mission-1'])
    expect(out.session.completed).toEqual(['mission-1'])
  })
  it('a session whose only content is the tour flag is not pristine, so it is saved', () => {
    expect(isPristine({ ...createFreshSession(), settings: { lowPower: false, tourSeen: true } })).toBe(false)
  })
  it('rejects oversized payloads', () => {
    expect(parseSession('x'.repeat(MAX_SESSION_BYTES + 1)).outcome).toBe('corrupt')
  })
  it('drops completed ids that name no mission and removes duplicates', () => {
    const raw = JSON.stringify({ ...sampleSession(), completed: ['mission-1', 'mission-1', 'ghost'] })
    expect(parseSession(raw).session.completed).toEqual(['mission-1'])
  })
  it('keeps the session but drops a saved mission that disagrees with the authored mission', () => {
    const bad = [
      (m: Record<string, any>) => (m.state.achieved = ['not-an-objective']), // eslint-disable-line @typescript-eslint/no-explicit-any
      (m: Record<string, any>) => (m.state.phase = 'cheating'), // eslint-disable-line @typescript-eslint/no-explicit-any
      (m: Record<string, any>) => (m.state.hintsShown = 9), // eslint-disable-line @typescript-eslint/no-explicit-any
      (m: Record<string, any>) => (m.state.lastAnswer = { optionId: 'nope', correct: true }), // eslint-disable-line @typescript-eslint/no-explicit-any
      (m: Record<string, any>) => ((m.state.phase = 'complete'), (m.state.completions = 0)), // eslint-disable-line @typescript-eslint/no-explicit-any
      (m: Record<string, any>) => m.graph.components.push(m.graph.components[0]), // eslint-disable-line @typescript-eslint/no-explicit-any
    ]
    for (const patch of bad) {
      const out = parseSession(withMission(patch))
      expect(out.outcome).toBe('restored')
      expect(out.session.completed).toEqual(['mission-1'])
      expect(out.session.missions['mission-2']).toBeUndefined()
    }
  })
  it('drops a saved mission whose id is not authored', () => {
    const json = JSON.parse(serializeSession(sampleSession()))
    json.missions['mission-99'] = json.missions['mission-2']
    expect(Object.keys(parseSession(JSON.stringify(json)).session.missions)).toEqual(['mission-2'])
  })
  it('rejects a non-finite number that survives JSON as 1e999', () => {
    const raw = serializeSession(sampleSession()).replace('"resistance":6', '"resistance":1e999')
    expect(raw).toContain('1e999')
    expect(parseSession(raw).session.missions['mission-2']).toBeUndefined()
  })
  it('property: any string parses without throwing and yields a valid session', () => {
    fc.assert(
      fc.property(fc.oneof(fc.string(), fc.json(), fc.jsonValue().map(v => JSON.stringify(v))), raw => {
        const out = parseSession(raw)
        expect(out.session.schemaVersion).toBe(SESSION_SCHEMA_VERSION)
        expect(Array.isArray(out.session.completed)).toBe(true)
      }),
      { numRuns: 200 },
    )
  })
})
