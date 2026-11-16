import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { parseSession, serializeSession } from '../../domain/learning'
import { resetStores } from '../../test/helpers'
import { useSettingsStore } from '../lab/settingsStore'
import { MissionView } from '../missions/MissionView'
import { buildSession } from '../session/persistence'
vi.mock('../lab/scene/webgl', () => ({ isWebGLAvailable: () => false }))
const tour = () => screen.queryByTestId('onboarding-tour')
async function startFirstVisit() {
  const user = userEvent.setup()
  useSettingsStore.setState({ tourSeen: false })
  render(<MissionView />)
  await user.click(screen.getByRole('button', { name: 'Start mission' }))
  return user
}
describe('first-visit tour', () => {
  beforeEach(() => resetStores())
  it('does not appear on the briefing, then opens once the mission starts with focus on its heading', async () => {
    useSettingsStore.setState({ tourSeen: false })
    render(<MissionView />)
    expect(tour()).not.toBeInTheDocument()
    await userEvent.setup().click(screen.getByRole('button', { name: 'Start mission' }))
    expect(tour()).toBeInTheDocument()
    expect(screen.getByTestId('tour-progress')).toHaveTextContent('step 1 of 4')
    expect(screen.getByRole('heading', { name: 'Add parts from the tray' })).toHaveFocus()
  })
  it('walks all four steps by keyboard, marks the tour seen, and returns focus to How to play', async () => {
    const user = await startFirstVisit()
    for (const title of ['Join parts at their terminals', 'Check the circuit diagnostic', 'Ask Nova when you are stuck']) {
      await user.click(screen.getByRole('button', { name: 'Next' }))
      expect(screen.getByRole('heading', { name: title })).toBeInTheDocument()
    }
    expect(screen.queryByRole('button', { name: 'Next' })).not.toBeInTheDocument()
    expect(document.querySelector('[data-tour="tutor"]')).toHaveAttribute('data-tour-active', 'true')
    await user.click(screen.getByRole('button', { name: 'Back' }))
    expect(screen.getByTestId('tour-progress')).toHaveTextContent('step 3 of 4')
    await user.click(screen.getByRole('button', { name: 'Next' }))
    await user.click(screen.getByRole('button', { name: 'Done' }))
    expect(tour()).not.toBeInTheDocument()
    expect(useSettingsStore.getState().tourSeen).toBe(true)
    expect(document.querySelector('[data-tour-active]')).toBeNull()
    expect(await screen.findByRole('button', { name: 'How to play' })).toHaveFocus()
  })
  it('can be skipped with the button or Escape, and the flag is saved in the session', async () => {
    const user = await startFirstVisit()
    await user.click(screen.getByRole('button', { name: 'Skip tour' }))
    expect(tour()).not.toBeInTheDocument()
    expect(parseSession(serializeSession(buildSession())).session.settings.tourSeen).toBe(true)
    await user.click(screen.getByRole('button', { name: 'How to play' }))
    expect(tour()).toBeInTheDocument()
    await user.keyboard('{Escape}')
    expect(tour()).not.toBeInTheDocument()
  })
  it('does not open for a returning learner, but How to play reopens it at step 1', async () => {
    const user = userEvent.setup()
    render(<MissionView />)
    await user.click(screen.getByRole('button', { name: 'Start mission' }))
    expect(tour()).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'How to play' }))
    expect(screen.getByTestId('tour-progress')).toHaveTextContent('step 1 of 4')
  })
})
