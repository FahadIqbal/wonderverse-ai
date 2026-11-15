import { act, renderHook } from '@testing-library/react'
import fc from 'fast-check'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createFreshSession, parseSession, SESSION_KEY } from '../../domain/learning'
import { completeMission, playToQuiz, resetStores } from '../../test/helpers'
import { useLabStore } from '../lab/labStore'
import { useSettingsStore } from '../lab/settingsStore'
import { useMissionBridge, useMissionStore } from '../missions/missionStore'
import { eraseAllProgress, startSessionPersistence } from './persistence'
import { useSessionStatus } from './sessionStore'
const ms = () => useMissionStore.getState()
const stored = () => window.localStorage.getItem(SESSION_KEY)
let stop: (() => void) | undefined
/** Simulates closing and reopening the tab: stores go back to defaults, storage is kept, persistence restarts. */
function reload() {
  stop?.()
  const raw = stored()
  resetStores()
  if (raw !== null) window.localStorage.setItem(SESSION_KEY, raw)
  stop = startSessionPersistence()
}
describe('session persistence', () => {
  let bridge: ReturnType<typeof renderHook>
  beforeEach(() => {
    resetStores()
    stop = startSessionPersistence()
    bridge = renderHook(() => useMissionBridge())
  })
  afterEach(() => {
    bridge.unmount()
    stop?.()
    vi.restoreAllMocks()
  })
  it('writes nothing for a pristine visit (no data, no key)', () => {
    expect(stored()).toBeNull()
    ms().selectMission('mission-1')
    expect(stored()).toBeNull()
  })
  it('saves progress, the circuit and settings, and restores them after a reload', () => {
    act(() => {
      playToQuiz('mission-1')
      useSettingsStore.getState().setLowPower(true)
    })
    const before = { phase: ms().state.phase, graph: useLabStore.getState().graph, achieved: ms().state.achieved }
    expect(before.phase).toBe('quiz')
    const parsed = parseSession(stored())
    expect(parsed.outcome).toBe('restored')
    expect(parsed.session.settings.lowPower).toBe(true)
    expect(parsed.session.missions['mission-1'].state.phase).toBe('quiz')
    act(() => reload())
    expect(ms().state.phase).toBe('quiz')
    expect(ms().state.achieved).toEqual(before.achieved)
    expect(useLabStore.getState().graph.wires).toHaveLength(before.graph.wires.length)
    expect(useSettingsStore.getState().lowPower).toBe(true)
    expect(useSessionStatus.getState().loadOutcome).toBe('restored')
    // Reset still works after a reload because the baseline comes from the mission, not from storage.
    expect(useLabStore.getState().baseline).toBe(ms().mission.setupGraph)
    expect(useLabStore.getState().past).toHaveLength(0) // undo history is deliberately not persisted
  })
  it('keeps per-mission circuits separate when switching missions', () => {
    act(() => completeMission('mission-1'))
    act(() => playToQuiz('mission-2'))
    expect(useLabStore.getState().graph.wires).toHaveLength(3)
    act(() => {
      ms().selectMission('mission-1')
    })
    expect(ms().state.phase).toBe('complete')
    expect(useLabStore.getState().graph.wires).toHaveLength(3)
    act(() => {
      ms().selectMission('mission-2')
    })
    expect(ms().state.phase).toBe('quiz')
    act(() => reload())
    act(() => {
      ms().selectMission('mission-2')
    })
    expect(ms().state.phase).toBe('quiz')
    expect(useLabStore.getState().graph.wires).toHaveLength(3)
  })
  it('refuses to open a locked mission', () => {
    expect(ms().selectMission('mission-2')).toBe(false)
    expect(ms().missionId).toBe('mission-1')
    expect(ms().selectMission('mission-3')).toBe(false)
  })
  it('completion fires once and survives reload without re-firing', () => {
    act(() => completeMission('mission-1'))
    expect(ms().state.completions).toBe(1)
    expect(ms().completed).toEqual(['mission-1'])
    act(() => reload())
    const completedChanges: string[][] = []
    const unsub = useMissionStore.subscribe((s, p) => {
      if (s.completed !== p.completed) completedChanges.push(s.completed)
    })
    expect(ms().state.phase).toBe('complete')
    expect(ms().state.completions).toBe(1)
    act(() => {
      ms().send({ type: 'finish' })
      ms().send({ type: 'finish' })
      ms().send({ type: 'answerQuiz', optionId: 'interrupted-path' })
    })
    expect(ms().state.completions).toBe(1)
    expect(ms().completed).toEqual(['mission-1'])
    unsub()
    expect(completedChanges).toHaveLength(0) // nothing re-awarded after the reload
    expect(ms().selectMission('mission-2')).toBe(true)
  })
  it('replaying a completed mission keeps it completed and does not award twice', () => {
    act(() => completeMission('mission-1'))
    act(() => ms().restartMission())
    expect(ms().state.phase).toBe('briefing')
    expect(ms().completed).toEqual(['mission-1'])
    act(() => completeMission('mission-1'))
    expect(ms().completed).toEqual(['mission-1'])
    expect(ms().state.completions).toBe(1)
    act(() => reload())
    expect(ms().completed).toEqual(['mission-1'])
  })
  it('undo, redo and reset keep achieved objectives achieved and never complete a mission twice', () => {
    act(() => playToQuiz('mission-1'))
    const achieved = [...ms().state.achieved]
    expect(achieved).toEqual(['lamp-lit', 'switch-compare'])
    act(() => {
      const lab = useLabStore.getState()
      while (useLabStore.getState().past.length > 0) lab.undo() // back to an unwired bench
    })
    expect(ms().state.achieved).toEqual(achieved) // latched: undo cannot take progress away
    expect(ms().state.phase).toBe('quiz')
    act(() => {
      ms().send({ type: 'answerQuiz', optionId: 'interrupted-path' })
      ms().send({ type: 'finish' })
    })
    expect(ms().state.completions).toBe(1)
    act(() => {
      useLabStore.getState().redo()
      useLabStore.getState().undo()
      useLabStore.getState().resetToSetup()
      ms().send({ type: 'finish' })
    })
    expect(ms().state.completions).toBe(1)
    expect(ms().completed).toEqual(['mission-1'])
  })
  it('property: any mix of edits, undo, redo, reset, answers and finish completes at most once and never loses progress', () => {
    const op = fc.constantFrom('undo', 'redo', 'reset', 'toggle', 'wrong', 'right', 'finish', 'lamp', 'reload')
    fc.assert(
      fc.property(fc.array(op, { maxLength: 25 }), ops => {
        act(() => {
          stop?.()
          resetStores()
          stop = startSessionPersistence()
          playToQuiz('mission-1')
        })
        let prevAchieved: string[] = []
        for (const o of ops) {
          act(() => {
            const lab = useLabStore.getState()
            if (o === 'undo') lab.undo()
            else if (o === 'redo') lab.redo()
            else if (o === 'reset') lab.resetToSetup()
            else if (o === 'toggle') lab.toggleSwitch('switch-1')
            else if (o === 'lamp') lab.addComponent('lamp')
            else if (o === 'wrong') ms().send({ type: 'answerQuiz', optionId: 'used-all' })
            else if (o === 'right') ms().send({ type: 'answerQuiz', optionId: 'interrupted-path' })
            else if (o === 'finish') ms().send({ type: 'finish' })
            else reload()
          })
          expect(ms().state.completions).toBeLessThanOrEqual(1)
          expect(ms().completed.length).toBeLessThanOrEqual(1)
          expect(prevAchieved.every(a => ms().state.achieved.includes(a))).toBe(true)
          prevAchieved = ms().state.achieved
        }
      }),
      { numRuns: 40 },
    )
  })
  it('starts fresh on corrupt data without crashing, and discards the bad value', () => {
    stop?.()
    resetStores()
    window.localStorage.setItem(SESSION_KEY, '{"schemaVersion":1,"completed":')
    expect(() => (stop = startSessionPersistence())).not.toThrow()
    expect(useSessionStatus.getState().loadOutcome).toBe('corrupt')
    expect(ms().completed).toEqual([])
    expect(ms().state.phase).toBe('briefing')
    expect(stored()).toBeNull()
  })
  it('starts fresh on an unknown schema version without crashing', () => {
    stop?.()
    resetStores()
    window.localStorage.setItem(SESSION_KEY, JSON.stringify({ ...createFreshSession(), schemaVersion: 7 }))
    expect(() => (stop = startSessionPersistence())).not.toThrow()
    expect(useSessionStatus.getState().loadOutcome).toBe('unsupported-version')
    expect(ms().completed).toEqual([])
  })
  it('reports a storage failure instead of crashing and keeps the app usable', () => {
    vi.spyOn(window.localStorage, 'setItem').mockImplementation(() => {
      throw new DOMException('quota', 'QuotaExceededError')
    })
    expect(() => act(() => playToQuiz('mission-1'))).not.toThrow()
    expect(useSessionStatus.getState().storage).toBe('failed')
    expect(ms().state.phase).toBe('quiz')
  })
  it('erase clears every WonderVerse key, resets the stores, reports success, and leaves other keys alone', () => {
    act(() => completeMission('mission-1'))
    act(() => useSettingsStore.getState().setLowPower(true))
    window.localStorage.setItem('wonderverse:extra', '1')
    window.localStorage.setItem('unrelated', 'keep')
    expect(stored()).not.toBeNull()
    let ok = false
    act(() => {
      ok = eraseAllProgress()
    })
    expect(ok).toBe(true)
    expect(useSessionStatus.getState().eraseResult).toBe('done')
    expect(window.localStorage.getItem('wonderverse:extra')).toBeNull()
    expect(stored()).toBeNull()
    expect(window.localStorage.getItem('unrelated')).toBe('keep')
    expect(ms().completed).toEqual([])
    expect(ms().state.phase).toBe('briefing')
    expect(useSettingsStore.getState().lowPower).toBe(false)
    expect(useLabStore.getState().graph.components).toHaveLength(0)
    // The store reset itself must not have written a new blob.
    act(() => reload())
    expect(ms().completed).toEqual([])
  })
  it('reports when erase could not remove everything', () => {
    window.localStorage.setItem('wonderverse:stuck', '1')
    vi.spyOn(window.localStorage, 'removeItem').mockImplementation(() => {})
    let ok = true
    act(() => {
      ok = eraseAllProgress()
    })
    expect(ok).toBe(false)
    expect(useSessionStatus.getState().eraseResult).toBe('failed')
  })
  it('does not record the setup load as learner events when a mission is restored', () => {
    act(() => playToQuiz('mission-1'))
    const events = ms().state.eventLog.length
    act(() => reload())
    expect(ms().state.eventLog).toHaveLength(events)
  })
})
