import type { Locator, Page } from '@playwright/test'
import { test, expect } from './fixtures'
import { VIEW_WIDTH } from '../src/features/lab/stageScale'
import { LOOP_1, axeViolations, benchPointOnScreen, enterLab, expectLampEnergized, openApp, openMission, selectView, wireByKeyboard } from './helpers'

const part = (page: Page, id: string) => page.locator(`[data-component-id="${id}"]`)
async function cell(loc: Locator) {
  return { x: Number(await loc.getAttribute('data-x')), y: Number(await loc.getAttribute('data-y')) }
}
async function startMission1(page: Page, view: 'schematic' | '3d' = 'schematic') {
  await openApp(page)
  await enterLab(page)
  await openMission(page, 1)
  await page.getByRole('button', { name: 'Skip tour' }).click()
  await selectView(page, view)
  await centerStage(page, view)
}
/** Mouse and touch coordinates are viewport-relative, so the part of the page being driven must be on screen. */
async function centerStage(page: Page, view: 'schematic' | '3d') {
  await page.getByTestId(view === '3d' ? 'scene-stage' : 'schematic-stage').evaluate(el => el.scrollIntoView({ block: 'center' }))
}
/** Units per CSS pixel in the schematic svg, so pixel drags can be turned into expected grid positions. */
async function unitsPerPixel(page: Page) {
  const box = await page.getByRole('group', { name: 'Circuit schematic' }).boundingBox()
  return VIEW_WIDTH / box!.width
}
async function dragBy(page: Page, from: { x: number; y: number }, to: { x: number; y: number }, steps = 12) {
  await page.mouse.move(from.x, from.y)
  await page.mouse.down()
  await page.mouse.move(to.x, to.y, { steps })
}
const center = (b: { x: number; y: number; width: number; height: number }) => ({ x: b.x + b.width / 2, y: b.y + b.height / 2 })

test.describe('moving parts: keyboard in the schematic', () => {
  test('arrow keys move a part, wires follow, the circuit stays lit, axe is clean, and the layout survives a reload', async ({ page }) => {
    await startMission1(page)
    for (const pair of LOOP_1) await wireByKeyboard(page, 'schematic', ...pair)
    await page.getByRole('button', { name: /^Toggle Switch 1/ }).click()
    await expectLampEnergized(page, 'lamp-1', true)
    const lamp = part(page, 'lamp-1')
    expect(await cell(lamp)).toEqual({ x: 550, y: 70 })
    const wire = page.locator('[data-wire-id="wire-2"] path')
    const before = await wire.getAttribute('d')

    await lamp.focus()
    await page.keyboard.press('ArrowLeft')
    await page.keyboard.press('Shift+ArrowDown')
    expect(await cell(lamp)).toEqual({ x: 540, y: 120 })
    await expect(lamp).toBeFocused()
    await expect(page.getByTestId('feedback')).toContainText('Moved Lamp 1 to column 54, row 12')
    await expect(page.getByTestId('feedback')).toHaveAttribute('aria-live', 'polite')
    expect(await wire.getAttribute('d')).not.toBe(before)
    await expectLampEnergized(page, 'lamp-1', true)
    expect(await axeViolations(page)).toEqual([])

    // The part cannot leave the bench, and a blocked or no-op move says so.
    for (let i = 0; i < 6; i++) await page.keyboard.press('Shift+ArrowRight')
    expect((await cell(lamp)).x).toBe(580)
    await expect(page.getByTestId('feedback')).toContainText('edge of the bench')

    await expect.poll(async () => {
      const session = (await page.evaluate(() => window.localStorage.getItem('wonderverse:session:v1'))) ?? ''
      return session.includes('"schemaVersion":3') && session.includes('"x":580')
    }).toBe(true)
    await page.reload()
    await enterLab(page)
    await openMission(page, 1)
    await selectView(page, 'schematic')
    expect(await cell(part(page, 'lamp-1'))).toEqual({ x: 580, y: 120 })
    expect(await page.locator('[data-wire-id]').count()).toBe(3)
    await expectLampEnergized(page, 'lamp-1', true)
  })

  test('moving a part onto another part is rejected with a message, and nothing changes', async ({ page }) => {
    await startMission1(page)
    const lamp = part(page, 'lamp-1')
    await lamp.focus()
    // Switch 1 sits at x=330 and Lamp 1 at x=550. Walk left in Shift steps until the next step would overlap.
    await page.keyboard.press('Shift+ArrowLeft')
    await page.keyboard.press('Shift+ArrowLeft')
    expect((await cell(lamp)).x).toBe(450)
    // 400 would be 70 from Switch 1, closer than the 90 footprint width.
    await page.keyboard.press('Shift+ArrowLeft')
    expect((await cell(lamp)).x).toBe(450)
    await expect(page.getByTestId('feedback')).toHaveAttribute('data-kind', 'error')
    await expect(page.getByTestId('feedback')).toContainText('Move rejected: Lamp 1 would overlap Switch 1')
  })
})

test.describe('moving parts: mouse and touch drag in the schematic', () => {
  test('dragging moves the part and its wire as one undo step; a blocked drop is rejected; dragging a switch does not toggle it', async ({ page, isMobile }) => {
    test.skip(isMobile, 'Phones are covered by the touch test below')
    await startMission1(page)
    await wireByKeyboard(page, 'schematic', 'Battery 1 positive', 'Switch 1 left')
    const battery = part(page, 'battery-1')
    const scale = await unitsPerPixel(page)
    const start = await cell(battery)
    const wire = page.locator('[data-wire-id="wire-1"] path')
    const wireBefore = await wire.getAttribute('d')
    const box = center((await battery.boundingBox())!)

    // Hover shows the grab cursor class and the halo.
    await page.mouse.move(box.x, box.y)
    await expect(battery).toHaveClass(/cursor-grab/)

    await dragBy(page, box, { x: box.x + 20 / scale, y: box.y + 100 / scale })
    await expect(battery).toHaveAttribute('data-dragging', 'true')
    await expect(page.getByTestId('snap-preview')).toHaveAttribute('data-valid', 'true')
    // The wire follows during the drag, before the drop.
    expect(await wire.getAttribute('d')).not.toBe(wireBefore)
    await page.mouse.up()
    await expect(battery).not.toHaveAttribute('data-dragging', 'true')
    const moved = await cell(battery)
    expect(Math.abs(moved.x - (start.x + 20))).toBeLessThanOrEqual(10)
    expect(Math.abs(moved.y - (start.y + 100))).toBeLessThanOrEqual(10)
    expect(moved.x % 10).toBe(0)
    expect(moved.y % 10).toBe(0)
    await expect(page.getByTestId('feedback')).toContainText('Moved Battery 1 to column')

    // One drag is one undo step.
    await page.getByRole('button', { name: 'Undo' }).click()
    expect(await cell(battery)).toEqual(start)
    expect(await wire.getAttribute('d')).toBe(wireBefore)
    await page.getByRole('button', { name: 'Redo' }).click()
    expect(await cell(battery)).toEqual(moved)

    // A drop on another part shows a blocked preview and is rejected on release. (Clicking Redo scrolled the page.)
    await centerStage(page, 'schematic')
    const sw = part(page, 'switch-1')
    const swBox = center((await sw.boundingBox())!)
    const batBox = center((await battery.boundingBox())!)
    await dragBy(page, batBox, swBox)
    await expect(page.getByTestId('snap-preview')).toHaveAttribute('data-valid', 'false')
    await expect(page.getByTestId('snap-preview')).toContainText('Taken')
    await page.mouse.up()
    await expect(page.getByTestId('feedback')).toHaveAttribute('data-kind', 'error')
    await expect(page.getByTestId('feedback')).toContainText('Move rejected: Battery 1 would overlap Switch 1')
    expect(await cell(battery)).toEqual(moved)

    // Dragging a switch moves it without toggling it; a plain click still toggles.
    const pressed = await sw.getAttribute('aria-pressed')
    const swStart = await cell(sw)
    await dragBy(page, swBox, { x: swBox.x, y: swBox.y + 90 / scale })
    await page.mouse.up()
    expect((await cell(sw)).y).toBeGreaterThan(swStart.y)
    await expect(sw).toHaveAttribute('aria-pressed', pressed!)
    // Wait for the message (it can change the height of the feedback bar and shift the stage) before measuring.
    await expect(page.getByTestId('feedback')).toContainText('Moved Switch 1')
    await centerStage(page, 'schematic')
    const swNow = center((await sw.boundingBox())!)
    await page.mouse.click(swNow.x, swNow.y)
    await expect(sw).not.toHaveAttribute('aria-pressed', pressed!)
  })

  test('a single finger drags a part (Chromium touch events)', async ({ page, browserName, hasTouch }) => {
    test.skip(browserName !== 'chromium' || !hasTouch, 'Touch events are sent through the Chrome DevTools Protocol, on the touch projects')
    await startMission1(page)
    const battery = part(page, 'battery-1')
    const start = await cell(battery)
    const scale = await unitsPerPixel(page)
    const from = center((await battery.boundingBox())!)
    const stageScroll = () => page.getByTestId('schematic-stage').evaluate(el => el.scrollLeft)
    const scrollBefore = await stageScroll()
    const cdp = await page.context().newCDPSession(page)
    const touch = (type: 'touchStart' | 'touchMove' | 'touchEnd', x: number, y: number) =>
      cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y }] })
    await touch('touchStart', from.x, from.y)
    for (let i = 1; i <= 10; i++) await touch('touchMove', from.x, from.y + (i * 80) / scale / 10)
    await touch('touchEnd', from.x, from.y + 80 / scale)
    await expect.poll(async () => (await cell(battery)).y).toBeGreaterThan(start.y + 50)
    expect((await cell(battery)).x).toBe(start.x)
    // The stage did not scroll sideways under the finger. (Page scrollY is not asserted: the feedback bar appearing above
    // the stage shifts the layout and the browser anchors the scroll position to it.)
    expect(await stageScroll()).toBe(scrollBefore)
    await page.getByRole('button', { name: 'Undo' }).click()
    expect(await cell(battery)).toEqual(start)
  })
})

test.describe('moving parts: 3D bench', () => {
  test('hover cursor, port and switch clicks still work, a drag moves one part in one undo step, and the move shows in the schematic', async ({ page, isMobile }) => {
    test.skip(isMobile, 'The 3D drag is driven with a mouse on the desktop project; phones default to the schematic')
    await startMission1(page, '3d')
    const stage = page.getByTestId('scene-stage')
    await expect(stage.locator('canvas')).toBeVisible()

    // Hover the battery body: grab cursor.
    const batteryAt = await benchPointOnScreen(page, { x: 110, y: 70 })
    await page.mouse.move(batteryAt.x, batteryAt.y)
    await expect.poll(() => page.evaluate(() => document.body.style.cursor)).toBe('grab')

    // A click on a port still selects it (a click is not a drag).
    const portAt = await benchPointOnScreen(page, { x: 75, y: 70 })
    await page.mouse.click(portAt.x, portAt.y)
    await expect(page.getByTestId('feedback')).toContainText('Selected Battery 1 positive')
    await page.keyboard.press('Escape')
    // A click on the switch still toggles it.
    const switchAt = await benchPointOnScreen(page, { x: 330, y: 70 })
    await page.mouse.click(switchAt.x, switchAt.y)
    await expect(page.getByTestId('feedback')).toContainText('Switch 1 is now')

    // Drag the battery to a free spot on the bench: one undo step, no camera orbit.
    const target = { x: 230, y: 180 }
    const to = await benchPointOnScreen(page, target)
    await dragBy(page, batteryAt, to, 20)
    await expect.poll(() => page.evaluate(() => document.body.style.cursor)).toBe('grabbing')
    await page.mouse.up()
    await expect(page.getByTestId('feedback')).toContainText('Moved Battery 1 to column')
    await selectView(page, 'schematic')
    const moved = await cell(part(page, 'battery-1'))
    expect(Math.abs(moved.x - target.x)).toBeLessThanOrEqual(50)
    expect(Math.abs(moved.y - target.y)).toBeLessThanOrEqual(50)
    await page.getByRole('button', { name: 'Undo' }).click()
    expect(await cell(part(page, 'battery-1'))).toEqual({ x: 110, y: 70 })
  })
})
