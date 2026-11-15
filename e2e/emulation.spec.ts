import type { Locator, Page } from '@playwright/test'
import { test, expect } from './fixtures'
import { LOOP_1, enterLab, expectLampEnergized, openApp, openMission, selectView, wireByKeyboard } from './helpers'

/**
 * Automatable parts of docs/17 that need no real device. All of these are EMULATION or engine-level checks:
 * forced-colors and prefers-reduced-motion are media-feature overrides, and "zoom" is a smaller CSS viewport
 * (200% zoom at 1280 px is about 640 px wide, 400% is 320 px wide), not a real browser zoom. They do not replace
 * the NOT DONE items in docs/17.
 */
test.beforeEach(({ isMobile }) => {
  test.skip(!!isMobile, 'Emulation checks run once on desktop-class projects')
})

/**
 * Presses Tab (or Shift+Tab when the target comes earlier in the document) until the locator has focus.
 * Choosing the direction avoids relying on how a browser wraps focus past the last element.
 * Fails with the focus path if the target is never reached.
 */
async function tabTo(page: Page, target: Locator, max = 150) {
  const trail: string[] = []
  for (let i = 0; i < max; i++) {
    const where = await target.evaluate(el => {
      const active = document.activeElement
      if (el === active) return 'here'
      if (!active || active === document.body) return 'after'
      return active.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_PRECEDING ? 'before' : 'after'
    })
    if (where === 'here') return
    await page.keyboard.press(where === 'before' ? 'Shift+Tab' : 'Tab')
    trail.push(await page.evaluate(() => (document.activeElement?.getAttribute('aria-label') ?? document.activeElement?.textContent ?? document.activeElement?.tagName ?? '').trim().slice(0, 30)))
  }
  throw new Error(`Keyboard never reached the target in ${max} presses. Last stops: ${trail.slice(-8).join(' | ')}`)
}
async function keyActivate(page: Page, target: Locator, key: 'Enter' | 'Space' = 'Enter') {
  await tabTo(page, target)
  await page.keyboard.press(key)
}

test.describe('keyboard-only walk of mission 1 (no mouse, no programmatic focus)', () => {
  test('portal to completion dialog using only Tab, Enter, Space and arrow keys', async ({ page, browserName }) => {
    // WebKit on macOS does not Tab to buttons unless the OS option is on, so this cannot be run there.
    test.skip(browserName === 'webkit', 'Safari/WebKit does not Tab to buttons by default')
    await openApp(page)
    await keyActivate(page, page.getByRole('button', { name: 'Enter the Lab' }))
    await expect(page.getByRole('heading', { level: 1, name: 'Electricity Lab missions' })).toBeVisible()
    await keyActivate(page, page.getByRole('button', { name: 'Start Mission 1' }))
    await keyActivate(page, page.getByRole('button', { name: 'Start mission' }))
    await expect(page.getByRole('region', { name: 'Lab workbench' })).toBeVisible()
    // Choose the schematic with the keyboard, then wire the loop by Tabbing to each terminal.
    await keyActivate(page, page.getByRole('group', { name: 'Lab view' }).getByRole('button', { name: 'Schematic', exact: true }))
    await expect(page.getByRole('group', { name: 'Lab view' }).getByRole('button', { name: 'Schematic', exact: true })).toHaveAttribute('aria-pressed', 'true')
    for (const [a, b] of LOOP_1) {
      await keyActivate(page, page.getByRole('button', { name: `Terminal ${a}`, exact: true }))
      await keyActivate(page, page.getByRole('button', { name: `Terminal ${b}`, exact: true }))
    }
    await expectLampEnergized(page, 'lamp-1', false) // loop is complete but the switch is open
    await keyActivate(page, page.getByRole('button', { name: /^Switch 1 switch, currently open/ }))
    await expectLampEnergized(page, 'lamp-1', true)
    await keyActivate(page, page.getByRole('button', { name: /^Switch 1 switch, currently closed/ }))
    await expectLampEnergized(page, 'lamp-1', false)
    await keyActivate(page, page.getByRole('button', { name: /^Switch 1 switch, currently open/ }))
    await expectLampEnergized(page, 'lamp-1', true)
    // Quiz: arrow keys move between radio options, Space/Enter activates the buttons.
    const options = page.getByRole('radio')
    await tabTo(page, options.first())
    const right = page.getByRole('radio', { name: 'It interrupted the complete path.' })
    for (let i = 0; i < 6 && !(await right.isChecked()); i++) await page.keyboard.press('ArrowDown')
    await expect(right).toBeChecked()
    await keyActivate(page, page.getByRole('button', { name: 'Check answer' }), 'Space')
    await expect(page.getByTestId('quiz-feedback')).toContainText('Correct.')
    await keyActivate(page, page.getByRole('button', { name: 'Finish mission' }))
    const dialog = page.getByRole('dialog', { name: /Mission complete: Complete the Loop/ })
    await expect(dialog).toBeVisible()
    await expect(dialog.getByRole('heading')).toBeFocused()
    // Focus stays inside the dialog while it is open, and Escape returns to the page.
    for (let i = 0; i < 6; i++) {
      await page.keyboard.press('Tab')
      expect(await page.evaluate(() => !!document.activeElement?.closest('[role="dialog"]')), `Tab ${i + 1} stays in the dialog`).toBe(true)
    }
    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
    await expect(page.getByTestId('mission-complete')).toBeVisible()
  })
})

test.describe('forced colors (Windows High Contrast) emulation', () => {
  test('focus ring survives, disabled controls differ, state stays in text, nothing overflows', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'forced-colors emulation is only supported by Chromium in Playwright')
    await page.emulateMedia({ forcedColors: 'active' })
    await openApp(page)
    expect(await page.evaluate(() => matchMedia('(forced-colors: active)').matches), 'emulation is on').toBe(true)
    await enterLab(page)
    await openMission(page, 1)
    await selectView(page, 'schematic')
    // Focus ring: a real, visible outline on the keyboard-focused control.
    await page.getByRole('button', { name: 'Terminal Battery 1 positive', exact: true }).focus()
    await page.keyboard.press('Shift+Tab')
    await page.keyboard.press('Tab')
    const ring = await page.evaluate(() => {
      const s = getComputedStyle(document.activeElement as Element)
      return { style: s.outlineStyle, width: parseFloat(s.outlineWidth) }
    })
    expect(ring.style).not.toBe('none')
    expect(ring.width).toBeGreaterThanOrEqual(2)
    // Disabled Finish button gets its own forced-colour treatment (GrayText), different from an enabled button.
    const finish = page.getByRole('button', { name: 'Finish mission' })
    await expect(finish).toBeDisabled()
    const colours = await page.evaluate(() => {
      const dis = Array.from(document.querySelectorAll('button')).find(b => b.disabled && b.textContent?.includes('Finish mission'))!
      const en = Array.from(document.querySelectorAll('button')).find(b => !b.disabled)!
      return { disabled: getComputedStyle(dis).color, enabled: getComputedStyle(en).color }
    })
    expect(colours.disabled).not.toBe(colours.enabled)
    // Meaning is not carried by colour alone: lamp state is text in the report table.
    for (const [a, b] of LOOP_1) await wireByKeyboard(page, 'schematic', a, b)
    await page.getByRole('button', { name: /^Switch 1 switch, currently open/ }).focus()
    await page.keyboard.press('Enter')
    await expect(page.getByTestId('diag-row-lamp-1')).toContainText('Energized')
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0)
    await test.info().attach('forced-colors-mission-1.png', { body: await page.screenshot(), contentType: 'image/png' })
  })
})

test.describe('prefers-reduced-motion emulation', () => {
  test('reduce switches the app to calm motion, and the setting is followed live', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await openApp(page)
    await enterLab(page)
    await openMission(page, 1)
    await selectView(page, 'schematic')
    for (const [a, b] of LOOP_1) await wireByKeyboard(page, 'schematic', a, b)
    await page.getByRole('button', { name: /^Switch 1 switch, currently open/ }).focus()
    await page.keyboard.press('Enter')
    await expectLampEnergized(page, 'lamp-1', true)
    await expect(page.locator('html')).toHaveAttribute('data-motion', 'calm')
    // The app follows the OS setting live. (Flow-dot animation in the 3D scene runs in the JS frame loop, so it is
    // not observable from the DOM; the unit tests cover resolveMotion. This check covers the OS-to-app wiring.)
    await page.emulateMedia({ reducedMotion: 'no-preference' })
    await expect(page.locator('html')).not.toHaveAttribute('data-motion', 'calm')
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await expect(page.locator('html')).toHaveAttribute('data-motion', 'calm')
  })
  test('without the preference the app is not in calm mode (control)', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' })
    await openApp(page)
    await expect(page.locator('html')).not.toHaveAttribute('data-motion', 'calm')
  })
})

test.describe('zoom and reflow emulation (viewport sized to 200% and 400% zoom of 1280x800)', () => {
  for (const [label, width, height] of [
    ['200% zoom (640x400)', 640, 400],
    ['400% zoom / WCAG reflow width (320x256)', 320, 256],
  ] as const) {
    test(`${label}: no page-level horizontal scroll, controls reachable, mission 1 lights the lamp`, async ({ page }) => {
      await page.setViewportSize({ width, height })
      const overflow = () => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
      await openApp(page)
      expect(await overflow(), 'portal').toBeLessThanOrEqual(0)
      const enter = page.getByRole('button', { name: 'Enter the Lab' })
      await enter.scrollIntoViewIfNeeded()
      await expect(enter).toBeInViewport()
      await enterLab(page)
      expect(await overflow(), 'map').toBeLessThanOrEqual(0)
      await openMission(page, 1)
      await selectView(page, 'schematic')
      expect(await overflow(), 'mission').toBeLessThanOrEqual(0)
      for (const [a, b] of LOOP_1) await wireByKeyboard(page, 'schematic', a, b)
      const sw = page.getByRole('button', { name: /^Switch 1 switch, currently open/ })
      await sw.focus()
      await page.keyboard.press('Enter')
      await expectLampEnergized(page, 'lamp-1', true)
      const row = page.getByTestId('diag-row-lamp-1')
      await row.scrollIntoViewIfNeeded()
      await expect(row).toBeInViewport()
      expect(await overflow(), 'mission after wiring').toBeLessThanOrEqual(0)
      // Nothing visible is clipped off the left edge of the page.
      const clipped = await page.evaluate(() => Array.from(document.querySelectorAll<HTMLElement>('h1, h2, button')).filter(e => e.offsetParent && e.getBoundingClientRect().right < 0).length)
      expect(clipped).toBe(0)
    })
  }
})
