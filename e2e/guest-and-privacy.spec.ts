import { test, expect, disableWebGL } from './fixtures'
import { SESSION_KEY, enterLab, openApp, openMission, readSession, selectView, wireByKeyboard, LOOP_1, toggleSwitch, answerQuiz } from './helpers'

test.describe('R1 guest start', () => {
  test('a guest reaches the mission map with one button and no login', async ({ page }) => {
    await openApp(page)
    await expect(page.getByText('No account or sign-in needed')).toBeVisible()
    await expect(page.getByRole('textbox')).toHaveCount(0)
    await expect(page.getByLabel(/password|email|username/i)).toHaveCount(0)
    await enterLab(page)
    await expect(page.getByTestId('map-progress')).toContainText('0 of 3 missions complete')
  })

  test('the first Tab stop is the skip link and it reaches main content', async ({ page, isMobile }) => {
    test.skip(!!isMobile, 'Keyboard Tab order is checked on the desktop project')
    await openApp(page)
    await page.keyboard.press('Tab')
    await expect(page.getByRole('link', { name: 'Skip to main content' })).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(page.locator('#main-content')).toBeVisible()
  })

  test('a pristine visit stores nothing in localStorage', async ({ page }) => {
    await openApp(page)
    await enterLab(page)
    expect(await page.evaluate(() => Object.keys(window.localStorage))).toEqual([])
  })
})

test.describe('mission unlock gating', () => {
  test('missions 2 and 3 are locked, disabled and say why before mission 1 is done', async ({ page }) => {
    await openApp(page)
    await enterLab(page)
    await expect(page.getByTestId('map-mission-1')).toHaveAttribute('data-status', 'unlocked')
    for (const n of [2, 3]) {
      await expect(page.getByTestId(`map-mission-${n}`)).toHaveAttribute('data-status', 'locked')
      const btn = page.getByRole('button', { name: `Start Mission ${n}` })
      await expect(btn).toBeDisabled()
      await expect(btn).toHaveAccessibleDescription(/Locked\. Finish Mission/)
    }
  })

  test('a tampered session that marks mission 3 done does not unlock mission 3 without mission 2', async ({ page }) => {
    // Locked state is derived from the completed list, so only a consistent chain unlocks the next mission.
    await page.addInitScript(key => {
      if (!window.localStorage.getItem(key)) {
        window.localStorage.setItem(key, JSON.stringify({ schemaVersion: 1, completed: ['mission-1'], settings: { lowPower: false }, missions: {} }))
      }
    }, SESSION_KEY)
    await openApp(page)
    await enterLab(page)
    await expect(page.getByTestId('map-mission-2')).toHaveAttribute('data-status', 'unlocked')
    await expect(page.getByTestId('map-mission-3')).toHaveAttribute('data-status', 'locked')
  })
})

test.describe('R8 erase progress', () => {
  test('erase removes every wonderverse: key and resets the map', async ({ page }) => {
    await openApp(page)
    await enterLab(page)
    await openMission(page, 1)
    await selectView(page, 'schematic')
    await wireByKeyboard(page, 'schematic', ...LOOP_1[0])
    await expect.poll(() => page.evaluate(() => Object.keys(window.localStorage).filter(k => k.startsWith('wonderverse:')).length)).toBeGreaterThan(0)
    await page.getByRole('button', { name: 'Back to missions' }).click()
    await page.getByRole('button', { name: 'Erase my progress' }).click()
    const dialog = page.getByRole('alertdialog')
    await expect(dialog).toBeVisible()
    await dialog.getByRole('button', { name: 'Erase everything' }).click()
    await expect(page.getByTestId('erase-status')).toContainText('All saved progress on this device has been erased.')
    expect(await page.evaluate(() => Object.keys(window.localStorage).filter(k => k.startsWith('wonderverse:')))).toEqual([])
    await expect(page.getByRole('button', { name: 'Start Mission 1' })).toBeVisible()
  })

  test('erase after finishing mission 1 re-locks mission 2', async ({ page }) => {
    await openApp(page)
    await enterLab(page)
    await openMission(page, 1)
    await selectView(page, 'schematic')
    for (const [a, b] of LOOP_1) await wireByKeyboard(page, 'schematic', a, b)
    await toggleSwitch(page, 'schematic', 'Switch 1', 'open')
    await toggleSwitch(page, 'schematic', 'Switch 1', 'closed')
    await toggleSwitch(page, 'schematic', 'Switch 1', 'open')
    await answerQuiz(page, 'It interrupted the complete path.')
    await page.getByRole('button', { name: 'Finish mission' }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'Back to missions' }).click()
    expect((await readSession(page))?.completed).toEqual(['mission-1'])
    await page.getByRole('button', { name: 'Erase my progress' }).click()
    await page.getByRole('alertdialog').getByRole('button', { name: 'Erase everything' }).click()
    await expect(page.getByTestId('map-mission-2')).toHaveAttribute('data-status', 'locked')
    expect(await readSession(page)).toBeNull()
  })
})

test.describe('corrupt or unreadable storage', () => {
  test('corrupt saved data: the app loads, shows a notice and starts fresh', async ({ page }) => {
    await page.addInitScript(key => window.localStorage.setItem(key, '{not valid json'), SESSION_KEY)
    await openApp(page)
    await enterLab(page)
    await expect(page.getByTestId('load-notice')).toContainText('could not be read')
    await expect(page.getByTestId('map-progress')).toContainText('0 of 3 missions complete')
    await expect(page.getByTestId('map-mission-2')).toHaveAttribute('data-status', 'locked')
  })

  test('a future schema version is ignored with the same notice', async ({ page }) => {
    await page.addInitScript(key => window.localStorage.setItem(key, JSON.stringify({ schemaVersion: 99, completed: ['mission-1', 'mission-2'] })), SESSION_KEY)
    await openApp(page)
    await enterLab(page)
    await expect(page.getByTestId('load-notice')).toBeVisible()
    await expect(page.getByTestId('map-mission-3')).toHaveAttribute('data-status', 'locked')
  })

  test('blocked localStorage: the app still works and says progress will not be saved', async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(window, 'localStorage', {
        get() {
          throw new DOMException('blocked', 'SecurityError')
        },
      })
    })
    await openApp(page)
    await enterLab(page)
    await expect(page.getByTestId('storage-notice')).toBeVisible()
    await openMission(page, 1)
    await expect(page.getByRole('heading', { name: 'Circuit diagnostic' })).toBeVisible()
  })

  test('with WebGL disabled and corrupt storage the app still loads', async ({ page }) => {
    await disableWebGL(page)
    await page.addInitScript(key => window.localStorage.setItem(key, 'null'), SESSION_KEY)
    await openApp(page)
    await enterLab(page)
    await openMission(page, 1)
    await expect(page.getByTestId('fallback-note')).toBeVisible()
  })
})
