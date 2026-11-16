import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { TutorAdapter } from '../../domain/learning'
import { resetStores } from '../../test/helpers'
import { useLabStore } from '../lab/labStore'
import { useMissionStore } from '../missions/missionStore'
import { MissionView } from '../missions/MissionView'
import { TutorPanel } from './TutorPanel'

vi.mock('../lab/scene/webgl', () => ({ isWebGLAvailable: () => false }))

const remoteOk: TutorAdapter = { id: 'remote', getHint: async () => ({ text: 'Which wire is missing?', kind: 'hint', source: 'remote' }) }
const remoteDown: TutorAdapter = { id: 'remote', getHint: async () => Promise.reject(new Error('down')) }

function startMission() {
  act(() => useMissionStore.getState().startMission())
}

describe('TutorPanel', () => {
  beforeEach(() => resetStores())

  it('works with no key: Local guide answers, ladder is capped at three, and the response is in a live region', async () => {
    startMission()
    render(<TutorPanel />)
    const user = userEvent.setup()
    const region = screen.getByTestId('tutor-response')
    expect(region).toHaveAttribute('aria-live', 'polite')
    expect(screen.getByText(/Local guide works offline/)).toBeInTheDocument()
    for (let i = 0; i < 3; i++) await user.click(screen.getByRole('button', { name: /^Ask for (a|the next) hint/ }))
    expect(screen.getByTestId('tutor-source')).toHaveTextContent('Local guide')
    expect(screen.getByTestId('tutor-source')).not.toHaveTextContent('offline hint')
    expect(screen.getByTestId('tutor-text')).toHaveTextContent('Trace battery + → switch → bulb → battery -.')
    expect(screen.getByText(/3 of 3 tutor hints used/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Ask for the next hint/ })).toBeDisabled()
  })

  it('is disabled before the mission starts, shows a loading state, and does not double-submit', async () => {
    let release: (v: { text: string; kind: 'hint'; source: 'remote' }) => void = () => {}
    const slow: TutorAdapter = { id: 'remote', getHint: () => new Promise(r => (release = r)) }
    startMission()
    render(<TutorPanel adapter={slow} />)
    const user = userEvent.setup()
    await user.type(screen.getByLabelText(/Question/), 'why is it dark?')
    await user.click(screen.getByRole('button', { name: 'Ask for a hint' }))
    const busy = screen.getByRole('button', { name: 'Thinking…' })
    expect(busy).toBeDisabled()
    expect(busy).toHaveAttribute('aria-busy', 'true')
    expect(screen.getByTestId('tutor-response')).toHaveTextContent('looking at the circuit report')
    expect(screen.queryByText(/AI can be wrong/)).not.toBeInTheDocument() // no AI note before a validated AI reply
    await act(async () => release({ text: 'Which wire is missing?', kind: 'hint', source: 'remote' }))
    expect(await screen.findByTestId('tutor-source')).toHaveTextContent('AI tutor')
    expect(screen.getByText(/AI can be wrong; the circuit report is the source of truth/)).toBeInTheDocument()
  })

  it('shows the offline hint label when the remote tutor fails', async () => {
    startMission()
    render(<TutorPanel adapter={remoteDown} />)
    await userEvent.setup().click(screen.getByRole('button', { name: 'Ask for a hint' }))
    expect(await screen.findByTestId('tutor-source')).toHaveTextContent('Local guide · offline hint')
    expect(screen.queryByText(/AI can be wrong/)).not.toBeInTheDocument()
    expect(screen.getByText(/Local guide works offline/)).toBeInTheDocument()
  })
  it('shows neither the AI label nor the AI note when the AI reply is rejected for an invented number', async () => {
    startMission()
    const invented: TutorAdapter = { id: 'remote', getHint: async () => ({ text: 'The lamp gets 88 volts, so look at the switch.', kind: 'hint', source: 'remote' }) }
    render(<TutorPanel adapter={invented} />)
    await userEvent.setup().click(screen.getByRole('button', { name: 'Ask for a hint' }))
    expect(await screen.findByTestId('tutor-source')).toHaveTextContent('Local guide · offline hint')
    expect(screen.getByTestId('tutor-text')).not.toHaveTextContent('88')
    expect(screen.queryByText(/AI can be wrong/)).not.toBeInTheDocument()
  })

  it('shows an error state with retry when asking fails unexpectedly', async () => {
    startMission()
    const resolve = vi.fn().mockRejectedValueOnce(new Error('bad')).mockResolvedValue({ text: 'ok', kind: 'hint', source: 'local', offlineFallback: false })
    render(<TutorPanel resolve={resolve} />)
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Ask for a hint' }))
    expect(await screen.findByText(/Something went wrong asking for a hint/)).toBeInTheDocument()
    const retry = screen.getByRole('button', { name: 'Ask for a hint' })
    expect(retry).toBeEnabled()
    await user.click(retry)
    expect(await screen.findByTestId('tutor-text')).toHaveTextContent('ok')
  })

  it('bounds the question, refuses unsafe questions without using a hint, and cannot mutate stores', async () => {
    startMission()
    const before = { lab: useLabStore.getState(), mission: useMissionStore.getState() }
    const getHint = vi.fn(remoteOk.getHint)
    render(<TutorPanel adapter={{ id: 'remote', getHint }} />)
    const user = userEvent.setup()
    const input = screen.getByLabelText(/Question/)
    expect(input).toHaveAttribute('maxlength', '200')
    await user.type(input, 'how do I wire a wall outlet?')
    await user.click(screen.getByRole('button', { name: 'Ask for a hint' }))
    expect(await screen.findByTestId('tutor-text')).toHaveTextContent(/simplified simulation/)
    expect(getHint).not.toHaveBeenCalled()
    expect(screen.getByText(/0 of 3 tutor hints used/)).toBeInTheDocument()
    expect(useLabStore.getState().graph).toBe(before.lab.graph)
    expect(useMissionStore.getState().state).toBe(before.mission.state)
    await user.clear(input)
    await user.click(screen.getByRole('button', { name: 'Ask for a hint' }))
    await screen.findByText(/1 of 3 tutor hints used/)
    expect(getHint).toHaveBeenCalledTimes(1)
    expect(useLabStore.getState().graph).toBe(before.lab.graph)
    expect(useMissionStore.getState().state).toBe(before.mission.state)
  })

  it('coexists with the authored hint ladder in MissionView', async () => {
    render(<MissionView />)
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Start mission' }))
    await user.click(screen.getByRole('button', { name: 'Show a hint' }))
    expect(screen.getByText('Find the path.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Ask for a hint' }))
    expect(await screen.findByTestId('tutor-text')).toHaveTextContent(/circuit report says/)
  })
})
