import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createFreshSession, parseSession, SESSION_KEY } from '../domain/learning'
import { useLabStore } from '../features/lab/labStore'
import { useMissionStore } from '../features/missions/missionStore'
import { startSessionPersistence } from '../features/session'
import { completeMissionHeadless, resetStores } from '../test/helpers'
vi.mock('../features/lab/scene/webgl', () => ({ isWebGLAvailable: () => false }))
import { AppShell } from './AppShell'
type User = ReturnType<typeof userEvent.setup>
const terminal = (name: string) => screen.getByRole('button', { name: `Terminal ${name}` })
const connect = async (user: User, a: string, b: string) => {
  await user.click(terminal(a))
  await user.click(terminal(b))
}
const card = (id: string) => screen.getByTestId(`map-${id}`)
let stop: (() => void) | undefined
beforeEach(() => {
  resetStores()
  stop = startSessionPersistence()
})
afterEach(() => stop?.())
describe('mission map', () => {
  it('shows three missions; only mission 1 is open on a first visit, with text status', async () => {
    const user = userEvent.setup()
    render(<AppShell />)
    await user.click(screen.getByRole('button', { name: 'Enter the Lab' }))
    expect(screen.getByTestId('map-progress')).toHaveTextContent('0 of 3 missions complete')
    expect(card('mission-1')).toHaveAttribute('data-status', 'unlocked')
    expect(card('mission-2')).toHaveAttribute('data-status', 'locked')
    expect(card('mission-2')).toHaveTextContent('Status: Locked. Finish Mission 1 first.')
    expect(card('mission-3')).toHaveTextContent('Locked. Finish Mission 2 first.')
    expect(screen.getByRole('button', { name: 'Start Mission 2' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Start Mission 3' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Start Mission 2' })).toHaveAccessibleDescription(/Locked/)
    expect(screen.getByRole('button', { name: 'Start Mission 1' })).toBeEnabled()
  })
  it('unlocks mission N+1 only after mission N completes and shows Completed', async () => {
    completeMissionHeadless('mission-1')
    const user = userEvent.setup()
    render(<AppShell />)
    await user.click(screen.getByRole('button', { name: 'Enter the Lab' }))
    expect(card('mission-1')).toHaveTextContent('Status: Completed')
    expect(screen.getByRole('button', { name: 'Review Mission 1' })).toBeEnabled()
    expect(card('mission-2')).toHaveAttribute('data-status', 'unlocked')
    expect(card('mission-3')).toHaveAttribute('data-status', 'locked')
    expect(screen.getByTestId('map-progress')).toHaveTextContent('1 of 3 missions complete')
  })
  it('restores a finished mission after a reload', async () => {
    completeMissionHeadless('mission-1')
    stop?.()
    const raw = window.localStorage.getItem(SESSION_KEY)!
    resetStores()
    window.localStorage.setItem(SESSION_KEY, raw)
    stop = startSessionPersistence()
    const user = userEvent.setup()
    render(<AppShell />)
    await user.click(screen.getByRole('button', { name: 'Enter the Lab' }))
    expect(card('mission-2')).toHaveAttribute('data-status', 'unlocked')
    await user.click(screen.getByRole('button', { name: 'Review Mission 1' }))
    expect(await screen.findByTestId('mission-complete')).toBeInTheDocument()
    // Reviewing a finished mission opens its recap; it does not run the completion again.
    expect(screen.getByRole('dialog', { name: /Mission complete: Complete the Loop/ })).toBeInTheDocument()
    expect(useMissionStore.getState().state.completions).toBe(1)
  })
})
describe('Mission 2 end to end through the UI', () => {
  it('diagnoses, repairs, answers, finishes once, and unlocks mission 3', async () => {
    completeMissionHeadless('mission-1')
    useMissionStore.getState().selectMission('mission-1')
    const user = userEvent.setup()
    render(<AppShell />)
    await user.click(screen.getByRole('button', { name: 'Enter the Lab' }))
    await user.click(screen.getByRole('button', { name: 'Start Mission 2' }))
    expect(await screen.findByRole('heading', { level: 2, name: 'Mission 2: Fix the Fault' })).toBeInTheDocument()
    expect(screen.getByText('The museum lamp went out. Diagnose the circuit.')).toBeInTheDocument()
    await user.click(await screen.findByRole('button', { name: 'Start mission' }))
    // The prefilled circuit is dark and the diagnostic says why; nothing can be won by a click alone.
    expect(screen.getByTestId('objective-fault-repaired')).toHaveAttribute('data-done', 'false')
    expect(useLabStore.getState().graph.wires).toHaveLength(2)
    expect(screen.getByRole('button', { name: 'Finish mission' })).toBeDisabled()
    expect(screen.getByTestId('quiz-locked')).toHaveTextContent('Locked until you have repaired the circuit')
    await user.click(screen.getByRole('button', { name: /^Toggle Switch 1/ })) // open
    await user.click(screen.getByRole('button', { name: /^Toggle Switch 1/ })) // close again
    expect(screen.getByTestId('objective-fault-repaired')).toHaveAttribute('data-done', 'false')
    // Hint ladder: three levels, the last names the exact wire.
    for (let i = 0; i < 3; i++) await user.click(screen.getByRole('button', { name: /^Show (a|the next) hint/ }))
    expect(screen.getByRole('button', { name: 'Show the next hint' })).toBeDisabled()
    expect(within(screen.getByRole('list', { name: 'Hints' })).getAllByRole('listitem')).toHaveLength(3)
    // Repair.
    await connect(user, 'Lamp 1 right', 'Battery 1 negative')
    expect(screen.getByTestId('objective-fault-repaired')).toHaveAttribute('data-done', 'true')
    expect(screen.getByTestId('objective-announcement')).toHaveTextContent(/Objective complete: Repair the circuit/)
    expect(screen.getByRole('button', { name: 'Finish mission' })).toBeDisabled() // quiz still to do
    // Quiz: the docs distractor is wrong and explained.
    await user.click(screen.getByRole('radio', { name: 'The bulb needs more colors.' }))
    await user.click(screen.getByRole('button', { name: 'Check answer' }))
    expect(screen.getByTestId('quiz-feedback')).toHaveTextContent(/Not quite/)
    expect(screen.getByRole('button', { name: 'Finish mission' })).toBeDisabled()
    await user.click(screen.getByRole('radio', { name: 'There was no complete return path back to the battery.' }))
    await user.click(screen.getByRole('button', { name: 'Check answer' }))
    expect(screen.getByTestId('quiz-feedback')).toHaveTextContent(/Correct/)
    await user.click(screen.getByRole('button', { name: 'Finish mission' }))
    const dialog = screen.getByRole('dialog', { name: /Mission complete: Fix the Fault/ })
    expect(within(dialog).getByText(/You built:/)).toBeInTheDocument()
    expect(useMissionStore.getState().state.completions).toBe(1)
    expect(useMissionStore.getState().completed).toEqual(['mission-1', 'mission-2'])
    // Persisted for a reload.
    expect(parseSession(window.localStorage.getItem(SESSION_KEY)).session.completed).toEqual(['mission-1', 'mission-2'])
    // Recap offers the way forward and the way back.
    await user.click(within(dialog).getByRole('button', { name: 'Back to missions' }))
    expect(card('mission-2')).toHaveTextContent('Status: Completed')
    expect(card('mission-3')).toHaveAttribute('data-status', 'unlocked')
  })
  it('the recap can open the next mission directly', async () => {
    completeMissionHeadless('mission-1')
    useMissionStore.getState().selectMission('mission-1')
    const user = userEvent.setup()
    render(<AppShell />)
    await user.click(screen.getByRole('button', { name: 'Enter the Lab' }))
    await user.click(screen.getByRole('button', { name: 'Start Mission 2' }))
    await user.click(await screen.findByRole('button', { name: 'Start mission' }))
    await connect(user, 'Lamp 1 right', 'Battery 1 negative')
    await user.click(screen.getByRole('radio', { name: 'There was no complete return path back to the battery.' }))
    await user.click(screen.getByRole('button', { name: 'Check answer' }))
    await user.click(screen.getByRole('button', { name: 'Finish mission' }))
    await user.click(screen.getByRole('button', { name: 'Next mission: Light the City' }))
    expect(screen.getByRole('heading', { level: 2, name: 'Mission 3: Light the City' })).toBeInTheDocument()
    expect(useMissionStore.getState().missionId).toBe('mission-3')
  })
})
describe('Mission 3 through the UI', () => {
  it('parallel build: opening one branch keeps the other lamp lit; series is rejected by the objective', async () => {
    useMissionStore.getState().hydrate({ ...createFreshSession(), completed: ['mission-1', 'mission-2'] })
    const user = userEvent.setup()
    render(<AppShell />)
    await user.click(screen.getByRole('button', { name: 'Enter the Lab' }))
    await user.click(screen.getByRole('button', { name: 'Start Mission 3' }))
    await user.click(await screen.findByRole('button', { name: 'Start mission' }))
    const pairs: [string, string][] = [
      ['Battery 1 positive', 'Switch 1 left'],
      ['Battery 1 positive', 'Switch 2 left'],
      ['Switch 1 right', 'Lamp 1 left'],
      ['Switch 2 right', 'Lamp 2 left'],
      ['Lamp 1 right', 'Battery 1 negative'],
      ['Lamp 2 right', 'Battery 1 negative'],
    ]
    for (const [a, b] of pairs) await connect(user, a, b)
    expect(screen.getByTestId('objective-both-lit')).toHaveAttribute('data-done', 'true')
    expect(screen.getByTestId('objective-branch-off')).toHaveAttribute('data-done', 'false')
    await user.click(screen.getByRole('button', { name: /^Toggle Switch 1/ }))
    expect(screen.getByTestId('objective-branch-off')).toHaveAttribute('data-done', 'true')
    expect(screen.getByTestId('diag-row-lamp-2')).toHaveTextContent('Energized')
    expect(screen.getByTestId('diag-row-lamp-1')).toHaveTextContent('Idle')
    await user.click(screen.getByRole('radio', { name: /Each lamp has its own branch/ }))
    await user.click(screen.getByRole('button', { name: 'Check answer' }))
    await user.click(screen.getByRole('button', { name: 'Finish mission' }))
    expect(useMissionStore.getState().completed).toEqual(['mission-1', 'mission-2', 'mission-3'])
    expect(screen.queryByRole('button', { name: /^Next mission/ })).not.toBeInTheDocument()
  })
})
describe('undo, redo and reset controls', () => {
  async function openMission1(user: User) {
    render(<AppShell />)
    await user.click(screen.getByRole('button', { name: 'Enter the Lab' }))
    await user.click(screen.getByRole('button', { name: 'Start Mission 1' }))
    await user.click(await screen.findByRole('button', { name: 'Start mission' }))
  }
  it('has correct disabled states and documents the shortcuts', async () => {
    const user = userEvent.setup()
    await openMission1(user)
    const undo = screen.getByRole('button', { name: 'Undo' })
    const redo = screen.getByRole('button', { name: 'Redo' })
    const reset = screen.getByRole('button', { name: 'Reset circuit' })
    expect(undo).toBeDisabled()
    expect(redo).toBeDisabled()
    expect(reset).toBeDisabled() // already at setup
    expect(screen.getByText(/Ctrl\+Z or Cmd\+Z to undo, Shift\+Ctrl\+Z or Shift\+Cmd\+Z to redo/)).toBeInTheDocument()
    await connect(user, 'Battery 1 positive', 'Switch 1 left')
    expect(undo).toBeEnabled()
    expect(reset).toBeEnabled()
    await user.click(undo)
    expect(undo).toBeDisabled()
    expect(redo).toBeEnabled()
    expect(screen.getByTestId('feedback')).toHaveTextContent('Undid the last change.')
    await user.click(redo)
    expect(useLabStore.getState().graph.wires).toHaveLength(1)
    expect(redo).toBeDisabled()
  })
  it('Ctrl/Cmd+Z undoes and Shift+Ctrl/Cmd+Z redoes', async () => {
    const user = userEvent.setup()
    await openMission1(user)
    await connect(user, 'Battery 1 positive', 'Switch 1 left')
    await user.keyboard('{Control>}z{/Control}')
    expect(useLabStore.getState().graph.wires).toHaveLength(0)
    await user.keyboard('{Control>}{Shift>}z{/Shift}{/Control}')
    expect(useLabStore.getState().graph.wires).toHaveLength(1)
    await user.keyboard('{Meta>}z{/Meta}')
    expect(useLabStore.getState().graph.wires).toHaveLength(0)
    await user.keyboard('{Meta>}{Shift>}z{/Shift}{/Meta}')
    expect(useLabStore.getState().graph.wires).toHaveLength(1)
  })
  it('reset asks for confirmation, can be cancelled, and returns the circuit to the mission setup', async () => {
    const user = userEvent.setup()
    await openMission1(user)
    await connect(user, 'Battery 1 positive', 'Switch 1 left')
    await user.click(screen.getByRole('button', { name: 'Reset circuit' }))
    const dialog = screen.getByRole('alertdialog', { name: 'Reset the circuit?' })
    expect(within(dialog).getByRole('button', { name: 'Cancel' })).toHaveFocus()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reset circuit' })).toHaveFocus()
    expect(useLabStore.getState().graph.wires).toHaveLength(1)
    await user.click(screen.getByRole('button', { name: 'Reset circuit' }))
    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Reset circuit' }))
    expect(useLabStore.getState().graph.wires).toHaveLength(0)
    expect(screen.getByRole('button', { name: 'Reset circuit' })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: 'Undo' }))
    expect(useLabStore.getState().graph.wires).toHaveLength(1)
  })
  it('achieved objectives stay achieved after undo', async () => {
    const user = userEvent.setup()
    await openMission1(user)
    await connect(user, 'Battery 1 positive', 'Switch 1 left')
    await connect(user, 'Switch 1 right', 'Lamp 1 left')
    await connect(user, 'Lamp 1 right', 'Battery 1 negative')
    await user.click(screen.getByRole('button', { name: /^Toggle Switch 1/ }))
    expect(screen.getByTestId('objective-lamp-lit')).toHaveAttribute('data-done', 'true')
    for (let i = 0; i < 4; i++) await user.click(screen.getByRole('button', { name: 'Undo' }))
    expect(useLabStore.getState().graph.wires).toHaveLength(0)
    expect(screen.getByTestId('objective-lamp-lit')).toHaveAttribute('data-done', 'true')
  })
})
describe('erase my progress', () => {
  it('asks first, cancel keeps data, confirm erases everything and announces success', async () => {
    completeMissionHeadless('mission-1')
    const user = userEvent.setup()
    render(<AppShell />)
    await user.click(screen.getByRole('button', { name: 'Enter the Lab' }))
    expect(window.localStorage.getItem(SESSION_KEY)).not.toBeNull()
    await user.click(screen.getByRole('button', { name: 'Erase my progress' }))
    const dialog = screen.getByRole('alertdialog', { name: 'Erase all progress?' })
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(window.localStorage.getItem(SESSION_KEY)).not.toBeNull()
    expect(screen.getByTestId('erase-status')).toBeEmptyDOMElement()
    await user.click(screen.getByRole('button', { name: 'Erase my progress' }))
    await user.click(screen.getByRole('button', { name: 'Erase everything' }))
    expect(screen.getByTestId('erase-status')).toHaveTextContent('All saved progress on this device has been erased.')
    expect(window.localStorage.getItem(SESSION_KEY)).toBeNull()
    expect(screen.getByTestId('map-progress')).toHaveTextContent('0 of 3 missions complete')
    expect(card('mission-2')).toHaveAttribute('data-status', 'locked')
  })
  it('explains that data stays on the device and shows a notice when saved data was unreadable', async () => {
    stop?.()
    resetStores()
    window.localStorage.setItem(SESSION_KEY, 'not json')
    stop = startSessionPersistence()
    const user = userEvent.setup()
    render(<AppShell />)
    await user.click(screen.getByRole('button', { name: 'Enter the Lab' }))
    expect(screen.getByTestId('load-notice')).toHaveTextContent(/starting fresh/)
    expect(screen.getByText(/no account, no name and no tracking/)).toBeInTheDocument()
  })
})
