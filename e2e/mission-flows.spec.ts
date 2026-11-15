import { test, expect } from './fixtures'
import {
  LOOP_1,
  PARALLEL_3,
  answerQuiz,
  enterLab,
  expectLampEnergized,
  openApp,
  openMission,
  readSession,
  selectView,
  toggleSwitch,
  wireByKeyboard,
} from './helpers'

test.describe('mission 1 (R2, R3, R4, R6) through the keyboard-only schematic', () => {
  test('wire, light, compare, answer, finish, then progress survives a reload without firing twice', async ({ page }) => {
    await openApp(page)
    await enterLab(page)
    await openMission(page, 1)
    await selectView(page, 'schematic')

    // R4: nothing is wired, so nothing is lit, and the report says so.
    await expectLampEnergized(page, 'lamp-1', false)
    await expect(page.getByRole('button', { name: 'Finish mission' })).toBeDisabled()
    await expect(page.getByTestId('finish-reason')).toContainText('Still to do')

    // R4: two of three wires leave an open loop, even with the switch closed.
    await wireByKeyboard(page, 'schematic', ...LOOP_1[0])
    await wireByKeyboard(page, 'schematic', ...LOOP_1[1])
    await toggleSwitch(page, 'schematic', 'Switch 1', 'open') // now closed
    await expectLampEnergized(page, 'lamp-1', false)
    await expect(page.locator('[data-component-id="lamp-1"]')).toHaveAttribute('data-lit', 'false')
    await expect(page.getByTestId('diag-reason')).not.toHaveText('')
    await toggleSwitch(page, 'schematic', 'Switch 1', 'closed') // open again

    // R4: a complete loop with the switch open is dark. Closing the switch lights the lamp.
    await wireByKeyboard(page, 'schematic', ...LOOP_1[2])
    await expectLampEnergized(page, 'lamp-1', false)
    await toggleSwitch(page, 'schematic', 'Switch 1', 'open') // closed
    await expectLampEnergized(page, 'lamp-1', true)
    await expect(page.getByTestId('diag-status')).toHaveText(/^valid$/i)
    await expect(page.locator('[data-component-id="lamp-1"]')).toHaveAttribute('data-lit', 'true')
    await expect(page.getByTestId('objective-lamp-lit')).toHaveAttribute('data-done', 'true')

    // Open the switch: dark, from the report. Close it again so both outcomes were seen.
    await toggleSwitch(page, 'schematic', 'Switch 1', 'closed') // open
    await expectLampEnergized(page, 'lamp-1', false)
    await expect(page.locator('[data-component-id="lamp-1"]')).toHaveAttribute('data-lit', 'false')
    await toggleSwitch(page, 'schematic', 'Switch 1', 'open') // closed
    await expectLampEnergized(page, 'lamp-1', true)
    await expect(page.getByTestId('objective-switch-compare')).toHaveAttribute('data-done', 'true')

    // Quiz: locked until both outcomes were seen; a wrong answer does not complete.
    await page.getByRole('radio', { name: 'It made the battery weaker.' }).check()
    await page.getByRole('button', { name: 'Check answer' }).click()
    await expect(page.getByTestId('quiz-feedback')).toContainText('Not quite')
    await expect(page.getByRole('button', { name: 'Finish mission' })).toBeDisabled()
    await answerQuiz(page, 'It interrupted the complete path.')
    await expect(page.getByRole('button', { name: 'Finish mission' })).toBeEnabled()
    await page.getByRole('button', { name: 'Finish mission' }).click()

    const dialog = page.getByRole('dialog', { name: /Mission complete: Complete the Loop/ })
    await expect(dialog).toBeVisible()
    await expect(dialog.getByRole('heading')).toBeFocused()
    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
    await expect(page.getByTestId('mission-complete')).toBeVisible()

    expect((await readSession(page))?.completed).toEqual(['mission-1'])

    // Reload: progress persists and the completion is not counted again.
    await page.reload()
    await enterLab(page)
    await expect(page.getByTestId('map-progress')).toContainText('1 of 3 missions complete')
    await expect(page.getByTestId('map-mission-1')).toHaveAttribute('data-status', 'completed')
    await expect(page.getByTestId('map-mission-2')).toHaveAttribute('data-status', 'unlocked')
    await page.getByRole('button', { name: 'Review Mission 1' }).click()
    await expect(page.getByTestId('mission-complete')).toBeVisible()
    await page.getByRole('dialog').getByRole('button', { name: 'Close' }).click()
    await expectLampEnergized(page, 'lamp-1', true)
    const after = await readSession(page)
    expect(after?.completed).toEqual(['mission-1'])
    expect(after?.missions['mission-1'].state.completions).toBe(1)
    expect(after?.missions['mission-1'].state.phase).toBe('complete')
  })

  test('the 3D view port list drives the same graph and reports the lamp from the solver', async ({ page, isMobile }) => {
    test.skip(!!isMobile && page.viewportSize()!.width < 640, 'Phones default to the schematic; the 3D port list is covered on desktop and tablet')
    await openApp(page)
    await enterLab(page)
    await openMission(page, 1)
    await selectView(page, '3d')
    await expect(page.getByTestId('scene-stage').locator('canvas')).toBeVisible()
    for (const [a, b] of LOOP_1) await wireByKeyboard(page, '3d', a, b)
    await expect(page.getByText('Lamp 1 (not lit)')).toBeVisible()
    await toggleSwitch(page, '3d', 'Switch 1', 'open')
    await expect(page.getByText('Lamp 1 (lit)')).toBeVisible()
    await expectLampEnergized(page, 'lamp-1', true)
    await expect(page.getByTestId('scene-stage')).toHaveAccessibleName(/Lamp 1 is lit/)
    await toggleSwitch(page, '3d', 'Switch 1', 'closed')
    await expect(page.getByText('Lamp 1 (not lit)')).toBeVisible()
    await expect(page.getByTestId('scene-stage')).toHaveAccessibleName(/Lamp 1 is not lit/)
  })
})

test.describe('missions 2 and 3', () => {
  async function completeMission1(page: import('@playwright/test').Page) {
    await openMission(page, 1)
    await selectView(page, 'schematic')
    for (const [a, b] of LOOP_1) await wireByKeyboard(page, 'schematic', a, b)
    await toggleSwitch(page, 'schematic', 'Switch 1', 'open')
    await toggleSwitch(page, 'schematic', 'Switch 1', 'closed')
    await toggleSwitch(page, 'schematic', 'Switch 1', 'open')
    await answerQuiz(page, 'It interrupted the complete path.')
    await page.getByRole('button', { name: 'Finish mission' }).click()
    await page.getByRole('dialog').getByRole('button', { name: /^Next mission:/ }).click()
  }

  test('mission 1 -> 2 -> 3 end to end, then the final map shows 3 of 3', async ({ page }) => {
    await openApp(page)
    await enterLab(page)
    await completeMission1(page)

    // Mission 2: the lamp starts dark because the return wire is missing.
    await expect(page.getByRole('heading', { name: /Mission 2: Fix the Fault/ })).toBeVisible()
    await page.getByRole('button', { name: 'Start mission' }).click()
    await selectView(page, 'schematic')
    await expectLampEnergized(page, 'lamp-1', false)
    await expect(page.getByTestId('diag-reason')).not.toHaveText('')
    await expect(page.getByRole('button', { name: 'Finish mission' })).toBeDisabled()
    await wireByKeyboard(page, 'schematic', 'Lamp 1 right', 'Battery 1 negative')
    await expectLampEnergized(page, 'lamp-1', true)
    await expect(page.getByTestId('objective-fault-repaired')).toHaveAttribute('data-done', 'true')
    await answerQuiz(page, 'There was no complete return path back to the battery.')
    await page.getByRole('button', { name: 'Finish mission' }).click()
    await page.getByRole('dialog').getByRole('button', { name: /^Next mission:/ }).click()

    // Mission 3: two branches; open one switch and the other lamp stays lit.
    await expect(page.getByRole('heading', { name: /Mission 3: Light the City/ })).toBeVisible()
    await page.getByRole('button', { name: 'Start mission' }).click()
    await selectView(page, 'schematic')
    for (const [a, b] of PARALLEL_3) await wireByKeyboard(page, 'schematic', a, b)
    await expectLampEnergized(page, 'lamp-1', true)
    await expectLampEnergized(page, 'lamp-2', true)
    await toggleSwitch(page, 'schematic', 'Switch 1', 'closed')
    await expectLampEnergized(page, 'lamp-1', false)
    await expectLampEnergized(page, 'lamp-2', true)
    await answerQuiz(page, 'Each lamp has its own branch across the battery, so the other branch is still a complete path.')
    await page.getByRole('button', { name: 'Finish mission' }).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toContainText('Light the City')
    await expect(dialog.getByRole('button', { name: /^Next mission:/ })).toHaveCount(0)
    await dialog.getByRole('button', { name: 'Back to missions' }).click()
    await expect(page.getByTestId('map-progress')).toContainText('3 of 3 missions complete')

    const session = await readSession(page)
    expect(session?.completed).toEqual(['mission-1', 'mission-2', 'mission-3'])

    await page.reload()
    await enterLab(page)
    await expect(page.getByTestId('map-progress')).toContainText('3 of 3 missions complete')
  })

  test('mission 3 series wiring does not satisfy the branch objective', async ({ page }) => {
    await openApp(page)
    await enterLab(page)
    await completeMission1(page)
    await page.getByRole('button', { name: 'Start mission' }).click() // mission 2 briefing
    await selectView(page, 'schematic')
    await wireByKeyboard(page, 'schematic', 'Lamp 1 right', 'Battery 1 negative')
    await answerQuiz(page, 'There was no complete return path back to the battery.')
    await page.getByRole('button', { name: 'Finish mission' }).click()
    await page.getByRole('dialog').getByRole('button', { name: /^Next mission:/ }).click()
    await page.getByRole('button', { name: 'Start mission' }).click()
    await selectView(page, 'schematic')
    // One loop through both lamps: opening a switch darkens both.
    const series: [string, string][] = [
      ['Battery 1 positive', 'Switch 1 left'],
      ['Switch 1 right', 'Lamp 1 left'],
      ['Lamp 1 right', 'Lamp 2 left'],
      ['Lamp 2 right', 'Battery 1 negative'],
    ]
    for (const [a, b] of series) await wireByKeyboard(page, 'schematic', a, b)
    await toggleSwitch(page, 'schematic', 'Switch 1', 'closed')
    await expectLampEnergized(page, 'lamp-1', false)
    await expectLampEnergized(page, 'lamp-2', false)
    await expect(page.getByTestId('objective-branch-off')).toHaveAttribute('data-done', 'false')
  })
})
