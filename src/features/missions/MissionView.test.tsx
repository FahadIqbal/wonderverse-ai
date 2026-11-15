import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { resetStores } from '../../test/helpers'
import { MissionView } from './MissionView'
import { useMissionStore } from './missionStore'

vi.mock('../lab/scene/webgl', () => ({ isWebGLAvailable: () => false }))
type User = ReturnType<typeof userEvent.setup>
const terminal = (name: string) => screen.getByRole('button', { name: `Terminal ${name}` })
async function connect(user: User, from: string, to: string) {
  await user.click(terminal(from))
  await user.click(terminal(to))
}
const objective = (id: string) => screen.getByTestId(`objective-${id}`)

describe('Mission 1 end to end', () => {
  beforeEach(() => {
    resetStores()
    render(<MissionView />)
  })

  it('completes through the UI with disabled reasons, quiz feedback and an accessible dialog', async () => {
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Start mission' }))

    // Building: nothing done, Finish and quiz are blocked with visible reasons.
    expect(objective('lamp-lit')).toHaveAttribute('data-done', 'false')
    expect(screen.getByRole('button', { name: 'Finish mission' })).toBeDisabled()
    expect(screen.getByTestId('finish-reason')).toHaveTextContent(/Still to do: Make the lamp glow/)
    expect(screen.getByTestId('quiz-locked')).toBeInTheDocument()

    // Hint ladder.
    await user.click(screen.getByRole('button', { name: 'Show a hint' }))
    expect(screen.getByText('Find the path.')).toBeInTheDocument()

    // Wire the loop. The lamp lights only once the switch is closed.
    await connect(user, 'Battery 1 positive', 'Switch 1 left')
    await connect(user, 'Switch 1 right', 'Lamp 1 left')
    await connect(user, 'Lamp 1 right', 'Battery 1 negative')
    expect(objective('lamp-lit')).toHaveAttribute('data-done', 'false')

    await user.click(screen.getByRole('button', { name: /^Toggle Switch 1/ }))
    expect(objective('lamp-lit')).toHaveAttribute('data-done', 'true')
    expect(screen.getByTestId('objective-announcement')).toHaveTextContent(/Objective complete: Make the lamp glow/)
    expect(objective('switch-compare')).toHaveAttribute('data-done', 'false')
    expect(screen.getByTestId('quiz-locked')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /^Toggle Switch 1/ }))
    expect(objective('switch-compare')).toHaveAttribute('data-done', 'true')

    // Quiz: Check answer is disabled until an option is chosen; a wrong answer explains and allows retry.
    const check = screen.getByRole('button', { name: 'Check answer' })
    expect(check).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Finish mission' })).toBeDisabled()
    await user.click(screen.getByRole('radio', { name: 'It used all the electricity.' }))
    expect(check).toBeEnabled()
    await user.click(check)
    expect(screen.getByTestId('quiz-feedback')).toHaveTextContent(/Not quite/)
    expect(screen.getByRole('button', { name: 'Finish mission' })).toBeDisabled()

    await user.click(screen.getByRole('radio', { name: 'It interrupted the complete path.' }))
    await user.click(check)
    expect(screen.getByTestId('quiz-feedback')).toHaveTextContent(/Correct/)
    expect(objective('concept-check')).toHaveAttribute('data-done', 'true')

    // Finish: completes once and opens the dialog with focus inside.
    const finish = screen.getByRole('button', { name: 'Finish mission' })
    expect(finish).toBeEnabled()
    await user.click(finish)
    const dialog = screen.getByRole('dialog', { name: /Mission complete/ })
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(dialog).toContainElement(document.activeElement as HTMLElement)
    expect(within(dialog).getByText(/You built:/)).toBeInTheDocument()
    expect(useMissionStore.getState().state.completions).toBe(1)

    // Escape closes the dialog; focus moves to the recap button; mission stays complete.
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'View recap' })).toHaveFocus()
    expect(useMissionStore.getState().state.completions).toBe(1)

    await user.click(screen.getByRole('button', { name: 'View recap' }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('does not count removing the switch or answering early as progress', async () => {
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Start mission' }))
    await user.click(screen.getByRole('button', { name: /^Toggle Switch 1/ }))
    // Switch toggled, but lamp was never lit (no loop), so only a "dark" observation exists.
    expect(objective('switch-compare')).toHaveAttribute('data-done', 'false')
    expect(objective('switch-compare')).toHaveTextContent(/You saw the lamp dark/)
  })
})
