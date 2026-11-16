import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { mission1, parseSession, serializeSession } from '../../domain/learning'
import { completeMissionHeadless, resetStores } from '../../test/helpers'
import { buildSession } from '../session/persistence'
import { MissionView } from './MissionView'
import { useMissionStore } from './missionStore'
vi.mock('../lab/scene/webgl', () => ({ isWebGLAvailable: () => false }))
describe('richer recap', () => {
  beforeEach(() => resetStores())
  it('shows what was built, the measured values from the final report, hints used, the idea tested and what to try next', () => {
    completeMissionHeadless('mission-1')
    render(<MissionView />)
    const dialog = screen.getByRole('dialog', { name: /Mission complete/ })
    expect(within(dialog).getByTestId('recap-counts')).toHaveTextContent('On your bench: 1 battery, 1 switch, 1 lamp, 3 wires.')
    // The helper leaves the switch open, so the report (and the recap) honestly says the lamp is idle.
    expect(within(dialog).getByTestId('recap-readings')).toHaveTextContent('Lamp 1: 0.00 V across, 0.0 mA through (idle)')
    expect(within(dialog).getByTestId('recap-hints')).toHaveTextContent('0 of 3')
    expect(within(dialog).getByTestId('recap-misconception')).toHaveTextContent(mission1.quiz.misconception)
    expect(dialog).toHaveTextContent(mission1.recap.tryNext)
  })
  it('stores the recap per mission and restores it through the session round trip', () => {
    completeMissionHeadless('mission-1')
    useMissionStore.getState().send({ type: 'requestHint' }) // ignored: mission is complete, so hints stay at 0
    const saved = useMissionStore.getState().recaps['mission-1']
    expect(saved.readings.map(r => r.label)).toEqual(['Battery 1', 'Lamp 1'])
    const restored = parseSession(serializeSession(buildSession())).session
    expect(restored.recaps['mission-1']).toEqual(saved)
    useMissionStore.getState().hydrate(restored)
    expect(useMissionStore.getState().recaps['mission-1']).toEqual(saved)
  })
})
