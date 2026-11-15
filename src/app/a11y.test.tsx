import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import axe from 'axe-core'

const mocks = vi.hoisted(() => ({ webgl: false }))
vi.mock('../features/lab/scene/webgl', () => ({ isWebGLAvailable: () => mocks.webgl, attachContextLossHandler: () => () => {} }))
vi.mock('../features/lab/scene/LabScene', () => ({
  default: () => <div data-testid="fake-scene">scene</div>,
}))

import { AppShell } from './AppShell'
import { resetStores, completeMissionHeadless } from '../test/helpers'
import { useMissionStore } from '../features/missions/missionStore'
import { useLabStore } from '../features/lab/labStore'

/**
 * Automated WCAG 2.x A/AA rules from axe-core on the real screens. jsdom has no layout engine, so colour
 * contrast is excluded here and checked from the palette values in src/ui/palette.test.ts instead.
 * Automated checks find only part of the problems (docs/14), so keyboard and screen-reader paths are also
 * covered by the role/label tests next to each feature, and a manual pass is still listed as open.
 */
async function violations(root: Element = document.body): Promise<string[]> {
  const results = await axe.run(root, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'] },
    rules: { 'color-contrast': { enabled: false } },
  })
  return results.violations.map(v => `${v.id} (${v.impact}): ${v.help}\n  ${v.nodes.map(n => n.html.slice(0, 120)).join('\n  ')}`)
}

async function toMissionBuilding(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: 'Enter the Lab' }))
  await user.click(screen.getByRole('button', { name: /Start Mission 1/ }))
  await user.click(screen.getByRole('button', { name: 'Start mission' }))
}

describe('automated accessibility audit (axe-core)', () => {
  beforeEach(() => {
    resetStores()
    mocks.webgl = false
  })

  it('portal', async () => {
    render(<AppShell />)
    expect(await violations()).toEqual([])
  })

  it('mission map', async () => {
    const user = userEvent.setup()
    render(<AppShell />)
    await user.click(screen.getByRole('button', { name: 'Enter the Lab' }))
    expect(await violations()).toEqual([])
  })

  it('mission briefing and the schematic workbench, including the tutor and quiz panels', async () => {
    const user = userEvent.setup()
    render(<AppShell />)
    await user.click(screen.getByRole('button', { name: 'Enter the Lab' }))
    await user.click(screen.getByRole('button', { name: /Start Mission 1/ }))
    expect(await violations()).toEqual([])
    await user.click(screen.getByRole('button', { name: 'Start mission' }))
    await user.click(screen.getByRole('button', { name: 'Add Battery' }))
    await user.click(screen.getByRole('button', { name: 'Add Switch' }))
    expect(await violations()).toEqual([])
  })

  it('the 3D workbench DOM (tray, port list, diagnostic) with the canvas stubbed', async () => {
    mocks.webgl = true
    const user = userEvent.setup()
    render(<AppShell />)
    await toMissionBuilding(user)
    await user.click(screen.getByRole('button', { name: 'Add Lamp' }))
    await user.click(screen.getByRole('button', { name: 'Add Switch' }))
    expect(await screen.findByTestId('fake-scene')).toBeInTheDocument()
    expect(await violations()).toEqual([])
  })

  it('the reset confirm dialog and the erase confirm dialog', async () => {
    const user = userEvent.setup()
    render(<AppShell />)
    await toMissionBuilding(user)
    await user.click(screen.getByRole('button', { name: 'Add Lamp' }))
    await user.click(screen.getByRole('button', { name: 'Reset circuit' }))
    expect(screen.getByRole('alertdialog')).toBeInTheDocument()
    expect(await violations()).toEqual([])
    await user.keyboard('{Escape}')
    await user.click(screen.getByRole('button', { name: 'Back to missions' }))
    await user.click(screen.getByRole('button', { name: 'Erase my progress' }))
    expect(screen.getByRole('alertdialog')).toBeInTheDocument()
    expect(await violations()).toEqual([])
  })

  it('the mission recap dialog', async () => {
    const user = userEvent.setup()
    render(<AppShell />)
    await toMissionBuilding(user)
    completeMissionHeadless('mission-1')
    expect(await screen.findByRole('dialog', { name: /Mission complete/ })).toBeInTheDocument()
    expect(await violations()).toEqual([])
    // Only the dialog is reachable by assistive tech while it is open.
    expect(screen.queryByRole('main')).not.toBeInTheDocument()
    expect(useMissionStore.getState().completed).toContain('mission-1')
    expect(useLabStore.getState().graph.components.length).toBeGreaterThan(0)
  })
})

describe('touch targets', () => {
  beforeEach(() => resetStores())

  it('every button in the lab screens has the 44px minimum height class', async () => {
    const user = userEvent.setup()
    render(<AppShell />)
    expect(screen.getByRole('button', { name: 'Enter the Lab' }).className).toContain('min-h-[')
    await toMissionBuilding(user)
    await user.click(screen.getByRole('button', { name: 'Add Switch' }))
    await user.click(screen.getByRole('button', { name: 'Add Lamp' }))
    const small = Array.from(document.querySelectorAll('button')).filter(b => !/min-h-\[(44|48)px\]/.test(b.className))
    expect(small.map(b => b.textContent)).toEqual([])
  })
})
