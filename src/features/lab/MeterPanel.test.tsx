import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { mission1 } from '../../domain/learning'
import { resetStores, connect } from '../../test/helpers'
const mocks = vi.hoisted(() => ({ webgl: false }))
vi.mock('./scene/webgl', () => ({ isWebGLAvailable: () => mocks.webgl }))
vi.mock('./scene/LabScene', () => ({ default: () => <div data-testid="fake-scene">scene</div> }))
import { LabWorkbench } from './LabWorkbench'
import { useLabStore } from './labStore'
function wireMission1(closed: boolean) {
  useLabStore.getState().loadGraph(mission1.setupGraph, mission1.setupGraph)
  connect('battery-1-pos', 'switch-1-a')
  connect('switch-1-b', 'lamp-1-a')
  connect('lamp-1-b', 'battery-1-neg')
  if (closed) useLabStore.getState().toggleSwitch('switch-1')
}
describe('Meter panel', () => {
  beforeEach(() => {
    mocks.webgl = false
    resetStores()
  })
  it('is labelled as an ideal meter in a simplified model and starts with nothing chosen', () => {
    render(<LabWorkbench />)
    const panel = screen.getByTestId('meter-panel')
    expect(panel).toHaveTextContent('Ideal meter in a simplified model')
    expect(within(panel).getByRole('combobox', { name: 'Place the meter on a part' })).toBeDisabled()
    expect(screen.getByTestId('meter-readout')).toHaveTextContent('Choose a part')
  })
  it('shows the report values for a lit lamp and updates when the switch opens', async () => {
    const user = userEvent.setup()
    wireMission1(true)
    render(<LabWorkbench />)
    await user.selectOptions(screen.getByRole('combobox', { name: 'Place the meter on a part' }), 'Lamp 1')
    const readout = screen.getByTestId('meter-readout')
    expect(readout).toHaveAttribute('aria-live', 'polite')
    expect(readout).toHaveTextContent('Lamp 1: 3.00 V across, 499.9 mA through. The simulation says this part is energized.')
    await user.click(screen.getByRole('button', { name: /^Toggle Switch 1/ }))
    expect(readout).toHaveTextContent('Lamp 1: 0.00 V across, 0.0 mA through.')
    expect(readout).toHaveTextContent('Switch is in off position')
  })
  it('reads the battery, and falls back to the prompt when the chosen part is removed', async () => {
    const user = userEvent.setup()
    wireMission1(true)
    render(<LabWorkbench />)
    const select = screen.getByRole('combobox', { name: 'Place the meter on a part' })
    await user.selectOptions(select, 'Battery 1')
    expect(screen.getByTestId('meter-readout')).toHaveTextContent('Battery 1: 3.00 V across, 499.9 mA through')
    await user.click(screen.getByRole('button', { name: 'Remove Battery 1' }))
    expect(screen.getByTestId('meter-readout')).toHaveTextContent('Choose a part')
    expect(select).toHaveValue('')
  })
  it('is also present with the 3D view and reads the same report', async () => {
    mocks.webgl = true
    const user = userEvent.setup()
    wireMission1(true)
    render(<LabWorkbench />)
    expect(await screen.findByTestId('fake-scene')).toBeInTheDocument()
    await user.selectOptions(screen.getByRole('combobox', { name: 'Place the meter on a part' }), 'Lamp 1')
    expect(screen.getByTestId('meter-readout')).toHaveTextContent('3.00 V across, 499.9 mA through')
  })
})
