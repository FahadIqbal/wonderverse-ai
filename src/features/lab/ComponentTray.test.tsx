import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { resetStores } from '../../test/helpers'
import { ComponentTray } from './ComponentTray'
import { FeedbackBar } from './FeedbackBar'
import { BENCH_FULL_TEXT, useLabStore } from './labStore'
function Harness() {
  const feedback = useLabStore(s => s.feedback)
  return (
    <>
      <ComponentTray />
      <FeedbackBar feedback={feedback} />
    </>
  )
}
describe('ComponentTray when the bench fills up', () => {
  beforeEach(resetStores)
  it('adds parts until the bench is full, then says so and adds nothing', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    const add = screen.getByRole('button', { name: /add lamp/i })
    for (let i = 0; i < 30 && useLabStore.getState().feedback?.kind !== 'error'; i++) await user.click(add)
    expect(screen.getByTestId('feedback')).toHaveTextContent(BENCH_FULL_TEXT)
    expect(screen.getByTestId('feedback')).toHaveAttribute('data-kind', 'error')
    const count = useLabStore.getState().graph.components.length
    await user.click(add)
    expect(useLabStore.getState().graph.components).toHaveLength(count)
  })
})
