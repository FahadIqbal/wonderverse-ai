import { test, expect } from './fixtures'
import { enterLab, openApp, openMission, selectView } from './helpers'
// Phone layout, schematic fit, Back button and the 3D fallback. Written for a 390 px wide phone; the 3D fallback
// test runs on every project.
const phone = (page: import('@playwright/test').Page) => (page.viewportSize()?.width ?? 1280) < 640
test.describe('phone layout (390 px)', () => {
  test.beforeEach(({ page }) => {
    test.skip(!phone(page), 'These checks are for phone-sized screens')
  })
  test('the circuit is on the first screen after entering a mission, with a compact toolbar and a floating tour', async ({ page }) => {
    await openApp(page)
    await enterLab(page)
    await openMission(page, 1)
    const vh = page.viewportSize()!.height
    const stage = page.getByTestId('schematic-stage')
    await expect(stage).toBeVisible()
    const box = (await stage.boundingBox())!
    expect(box.y, 'stage starts in the first screen').toBeLessThan(vh * 0.5)
    expect(box.y + box.height, 'the whole stage is inside the first screen').toBeLessThanOrEqual(vh)
    // The tour is a floating coachmark: it does not push the stage down, and it sits over the bottom of the screen.
    const tour = page.getByTestId('onboarding-tour')
    await expect(tour).toBeVisible()
    expect(await tour.evaluate(el => getComputedStyle(el).position)).toBe('fixed')
    // One toolbar row for the view toggle and How to play, one for undo, redo and reset, all on the first screen.
    for (const name of ['Undo', 'Redo', 'Reset circuit', 'How to play']) {
      const b = (await page.getByRole('button', { name, exact: true }).boundingBox())!
      expect(b.y + b.height, `${name} on the first screen`).toBeLessThanOrEqual(vh)
      expect(b.height).toBeGreaterThanOrEqual(44)
    }
    // Keyboard shortcut text is not shown on touch screens (it stays in the page for screen readers).
    const shortcuts = page.locator('#history-help span').first()
    expect(await shortcuts.evaluate(el => el.getBoundingClientRect().width)).toBeLessThanOrEqual(1)
    // The long instructions are folded behind a Help button.
    const help = page.getByRole('button', { name: 'Help: building and moving parts' })
    await expect(help).toHaveAttribute('aria-expanded', 'false')
    await expect(page.getByText(/Connect two terminals: click, tap or press Enter/)).toBeHidden()
    await help.click()
    await expect(page.getByText(/Connect two terminals: click, tap or press Enter/)).toBeVisible()
  })
  test('the schematic fits the screen: every part and terminal is inside the stage, no sideways scroll, targets are 44 px', async ({ page }) => {
    await openApp(page)
    await enterLab(page)
    await openMission(page, 1)
    await page.getByRole('button', { name: /Skip tour|Done/ }).click()
    await selectView(page, 'schematic')
    // Fill the bench: parts the tray places anywhere on it must also be inside the stage.
    for (const name of ['Add Lamp', 'Add Resistor', 'Add Switch', 'Add Jumper wire']) await page.getByRole('button', { name }).click()
    const stage = page.getByTestId('schematic-stage')
    const sb = (await stage.boundingBox())!
    expect(await stage.evaluate(el => el.scrollWidth - el.clientWidth), 'no horizontal scroll inside the stage').toBeLessThanOrEqual(0)
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0)
    const terminals = stage.locator('[data-terminal-id]')
    expect(await terminals.count()).toBeGreaterThanOrEqual(14)
    for (const t of await terminals.all()) {
      const dot = (await t.locator('circle').nth(1).boundingBox())!
      expect(dot.x, 'terminal inside left edge').toBeGreaterThanOrEqual(sb.x)
      expect(dot.x + dot.width, 'terminal inside right edge').toBeLessThanOrEqual(sb.x + sb.width)
      expect(dot.y + dot.height).toBeLessThanOrEqual(sb.y + sb.height)
      const hit = (await t.locator('circle').first().boundingBox())!
      expect(Math.min(hit.width, hit.height), 'terminal touch target').toBeGreaterThanOrEqual(43.5)
    }
    for (const part of await stage.locator('[data-component-id]').all()) {
      const b = (await part.boundingBox())!
      expect(b.x).toBeGreaterThanOrEqual(sb.x)
      expect(b.x + b.width).toBeLessThanOrEqual(sb.x + sb.width)
    }
    // The mission's own lamp, the one that used to be cut off at the right edge.
    const lamp = (await stage.locator('[data-component-id="lamp-1"]').boundingBox())!
    expect(lamp.x + lamp.width).toBeLessThanOrEqual(sb.x + sb.width)
  })
  test('a phone held sideways (844 x 390): the circuit stage is on the first screen and touch targets stay 44 px', async ({ page }) => {
    await openApp(page)
    await enterLab(page)
    await openMission(page, 1)
    await page.getByRole('button', { name: /Skip tour|Done/ }).click()
    await page.setViewportSize({ width: 844, height: 390 })
    await selectView(page, 'schematic')
    const stage = page.getByTestId('schematic-stage')
    const box = (await stage.boundingBox())!
    expect(box.y + box.height, 'whole stage inside the 390 px high screen').toBeLessThanOrEqual(390)
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0)
    for (const t of await stage.locator('[data-terminal-id]').all()) {
      const hit = (await t.locator('circle').first().boundingBox())!
      expect(Math.min(hit.width, hit.height)).toBeGreaterThanOrEqual(43.5)
    }
    // Dragging still maps the finger to the right model position when the drawing is letterboxed.
    const battery = page.locator('[data-component-id="battery-1"]')
    const before = Number(await battery.getAttribute('data-x'))
    const b = (await battery.boundingBox())!
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2)
    await page.mouse.down()
    await page.mouse.move(b.x + b.width / 2 + 60, b.y + b.height / 2, { steps: 8 })
    await page.mouse.up()
    await expect.poll(async () => Number(await battery.getAttribute('data-x'))).toBeGreaterThan(before)
  })
  test('Android Back closes the tour first, then goes mission to map, then leaves nothing stranded', async ({ page }) => {
    await openApp(page)
    await enterLab(page)
    await openMission(page, 1)
    await expect(page.getByTestId('onboarding-tour')).toBeVisible()
    await page.goBack()
    await expect(page.getByTestId('onboarding-tour')).toBeHidden()
    await expect(page.getByRole('region', { name: 'Lab workbench' })).toBeVisible()
    await page.goBack()
    await expect(page.getByRole('heading', { level: 1, name: 'Electricity Lab missions' })).toBeVisible()
    await page.goBack()
    await expect(page.getByRole('heading', { level: 1, name: 'Welcome to the Electricity Lab' })).toBeVisible()
  })
  test('Android Back closes an open dialog and stays on the page', async ({ page }) => {
    await openApp(page)
    await enterLab(page)
    await page.getByRole('button', { name: 'Erase my progress' }).click()
    await expect(page.getByRole('alertdialog')).toBeVisible()
    await page.goBack()
    await expect(page.getByRole('alertdialog')).toBeHidden()
    await expect(page.getByRole('heading', { level: 1, name: 'Electricity Lab missions' })).toBeVisible()
  })
})
test.describe('3D view never stays blank', () => {
  test('when no frame is ever drawn, the schematic takes over with an explanation and keeps the circuit', async ({ page }) => {
    test.setTimeout(90_000)
    // A scene whose render loop never runs: requestAnimationFrame never calls back, so the 3D canvas stays empty.
    await page.addInitScript(() => {
      window.requestAnimationFrame = () => 0
    })
    await openApp(page)
    await enterLab(page)
    await openMission(page, 1)
    await page.getByRole('button', { name: /Skip tour|Done/ }).click()
    // Tablets and desktops start in 3D already; phones start on the schematic.
    if (phone(page)) await selectView(page, '3d')
    await expect(page.getByTestId('fallback-note')).toContainText('did not draw anything', { timeout: 20_000 })
    await expect(page.getByTestId('schematic-stage')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Try 3D again' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Terminal Battery 1 positive', exact: true })).toBeVisible()
  })
})
