import { test, expect } from './fixtures'
import { LOOP_1, axeViolations, enterLab, openApp, openMission, selectView, wireByKeyboard } from './helpers'

test.describe('axe-core scan in a real browser (colour contrast included)', () => {
  test('portal, map, mission view and the erase dialog have no violations', async ({ page, browserName }) => {
    await openApp(page)
    expect(await axeViolations(page), 'portal').toEqual([])
    await enterLab(page)
    expect(await axeViolations(page), 'map').toEqual([])
    await page.getByRole('button', { name: 'Erase my progress' }).click()
    await expect(page.getByRole('alertdialog')).toBeVisible()
    expect(await axeViolations(page), 'erase dialog').toEqual([])
    await page.keyboard.press('Escape')
    // Playwright's Firefox build crashes the page ("Page crashed") when axe-core runs on the mission screen, with or
    // without WebGL and without app CSS (docs/18). The portal, map and dialog scans above still run on Firefox.
    if (browserName === 'firefox') return
    await openMission(page, 1)
    expect(await axeViolations(page), 'mission 1 default view').toEqual([])
    await selectView(page, 'schematic')
    for (const [a, b] of LOOP_1) await wireByKeyboard(page, 'schematic', a, b)
    expect(await axeViolations(page), 'mission 1 schematic').toEqual([])
    await selectView(page, '3d')
    await expect(page.getByTestId('scene-stage').locator('canvas')).toBeVisible()
    expect(await axeViolations(page), 'mission 1 3D').toEqual([])
  })
})

test.describe('touch and narrow screens', () => {
  test('no horizontal page scroll on any key screen', async ({ page }) => {
    const overflow = () => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    await openApp(page)
    expect(await overflow(), 'portal').toBeLessThanOrEqual(0)
    await enterLab(page)
    expect(await overflow(), 'map').toBeLessThanOrEqual(0)
    await openMission(page, 1)
    expect(await overflow(), 'mission').toBeLessThanOrEqual(0)
    await selectView(page, 'schematic')
    expect(await overflow(), 'mission schematic').toBeLessThanOrEqual(0)
    await selectView(page, '3d')
    await expect(page.getByTestId('scene-stage').locator('canvas')).toBeVisible()
    expect(await overflow(), 'mission 3D').toBeLessThanOrEqual(0)
  })

  test('primary controls are at least 44px tall and wide on touch projects', async ({ page, hasTouch }) => {
    test.skip(!hasTouch, 'Touch target size is checked on tablet and mobile projects')
    const small = async () =>
      page.evaluate(() => {
        const out: string[] = []
        const nodes = document.querySelectorAll<HTMLElement>('button, a[href], input, [role="button"]')
        for (const el of nodes) {
          const r = el.getBoundingClientRect()
          const style = getComputedStyle(el)
          if (r.width === 0 || r.height === 0 || style.visibility === 'hidden') continue
          if (el.closest('.sr-only') || el.matches('.sr-only') || (el.tagName === 'A' && r.width <= 1)) continue
          if (el instanceof HTMLInputElement && (el.type === 'radio' || el.type === 'checkbox')) {
            // The visible row (label) is the target.
            const label = el.closest('label')?.getBoundingClientRect()
            if (label && label.height >= 44) continue
          }
          // SVG terminals have a larger transparent hit circle than the painted dot.
          if (el instanceof SVGElement) {
            const hit = el.querySelector('circle')?.getBoundingClientRect()
            if (hit && hit.width >= 44 && hit.height >= 44) continue
          }
          if (r.height < 44 || r.width < 44) out.push(`${el.tagName} "${(el.getAttribute('aria-label') ?? el.textContent ?? '').trim().slice(0, 40)}" ${Math.round(r.width)}x${Math.round(r.height)}`)
        }
        return out
      })
    await openApp(page)
    expect(await small(), 'portal').toEqual([])
    await enterLab(page)
    expect(await small(), 'map').toEqual([])
    await openMission(page, 1)
    await selectView(page, 'schematic')
    expect(await small(), 'mission schematic').toEqual([])
    await selectView(page, '3d')
    expect(await small(), 'mission 3D').toEqual([])
  })

  test('mission 1 can be wired with taps and the lamp lights (touch flow)', async ({ page, hasTouch }) => {
    test.skip(!hasTouch, 'Tap flow runs on tablet and mobile projects')
    await openApp(page)
    await page.getByRole('button', { name: 'Enter the Lab' }).tap()
    await page.getByRole('button', { name: 'Start Mission 1' }).tap()
    await page.getByRole('button', { name: 'Start mission' }).tap()
    await selectView(page, 'schematic')
    for (const [a, b] of LOOP_1) {
      await page.getByRole('button', { name: `Terminal ${a}`, exact: true }).tap()
      await page.getByRole('button', { name: `Terminal ${b}`, exact: true }).tap()
    }
    await page.getByRole('button', { name: /^Switch 1 switch, currently open/ }).tap()
    await expect(page.getByTestId('diag-row-lamp-1')).toContainText('Energized')
  })
})
