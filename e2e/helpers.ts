import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import type { Locator, Page } from '@playwright/test'
import { expect } from './fixtures'

export type View = '3d' | 'schematic'
export const SESSION_KEY = 'wonderverse:session:v1'

export async function openApp(page: Page) {
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1, name: 'Welcome to the Electricity Lab' })).toBeVisible()
}

export async function enterLab(page: Page) {
  await page.getByRole('button', { name: 'Enter the Lab' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Electricity Lab missions' })).toBeVisible()
}

/** Opens a mission from the map and presses Start mission when the briefing shows. */
export async function openMission(page: Page, n: 1 | 2 | 3) {
  await page.getByRole('button', { name: new RegExp(`^(Start|Continue|Review) Mission ${n}$`) }).click()
  // The mission screen is a lazy chunk: wait for either the briefing or the workbench instead of probing once.
  const start = page.getByRole('button', { name: 'Start mission' })
  await expect(start.or(page.getByRole('region', { name: 'Lab workbench' }))).toBeVisible()
  if (await start.isVisible()) await start.click()
  await expect(page.getByRole('region', { name: 'Lab workbench' })).toBeVisible()
}

export async function selectView(page: Page, view: View) {
  const name = view === '3d' ? '3D workbench' : 'Schematic'
  const btn = page.getByRole('group', { name: 'Lab view' }).getByRole('button', { name, exact: true })
  if ((await btn.getAttribute('aria-pressed')) !== 'true') await btn.click()
  await expect(btn).toHaveAttribute('aria-pressed', 'true')
}

/** Locator for a terminal in the active view, found by its accessible name (the same names a screen reader gets). */
export function terminal(page: Page, view: View, label: string): Locator {
  return view === 'schematic'
    ? page.getByRole('button', { name: `Terminal ${label}`, exact: true })
    : page.getByRole('button', { name: `${label} port`, exact: true })
}

/** Connects two terminals by keyboard: focus, Enter, focus, Enter. */
export async function wireByKeyboard(page: Page, view: View, from: string, to: string) {
  for (const label of [from, to]) {
    const t = terminal(page, view, label)
    await t.focus()
    await page.keyboard.press('Enter')
  }
}

export async function wireByClick(page: Page, view: View, from: string, to: string) {
  await terminal(page, view, from).click()
  await terminal(page, view, to).click()
}

export const LOOP_1: [string, string][] = [
  ['Battery 1 positive', 'Switch 1 left'],
  ['Switch 1 right', 'Lamp 1 left'],
  ['Lamp 1 right', 'Battery 1 negative'],
]

export const PARALLEL_3: [string, string][] = [
  ['Battery 1 positive', 'Switch 1 left'],
  ['Battery 1 positive', 'Switch 2 left'],
  ['Switch 1 right', 'Lamp 1 left'],
  ['Switch 2 right', 'Lamp 2 left'],
  ['Lamp 1 right', 'Battery 1 negative'],
  ['Lamp 2 right', 'Battery 1 negative'],
]

/** Diagnostic table row text for a component, taken from the simulation report ("Energized" or "Idle"). */
export function reportState(page: Page, componentId: string): Locator {
  return page.getByTestId(`diag-row-${componentId}`)
}

export async function expectLampEnergized(page: Page, componentId: string, energized: boolean) {
  await expect(reportState(page, componentId)).toContainText(energized ? 'Energized' : 'Idle')
}

export async function toggleSwitch(page: Page, view: View, name: string, currently: 'open' | 'closed') {
  if (view === 'schematic') {
    const sw = page.getByRole('button', { name: new RegExp(`^${name} switch, currently ${currently}`) })
    await sw.focus()
    await page.keyboard.press('Enter')
  } else {
    await page.getByRole('button', { name: `Toggle ${name}, currently ${currently}`, exact: true }).click()
  }
}

export async function answerQuiz(page: Page, optionText: string) {
  await page.getByRole('radio', { name: optionText }).check()
  await page.getByRole('button', { name: 'Check answer' }).click()
  await expect(page.getByTestId('quiz-feedback')).toContainText('Correct.')
}

export async function readSession(page: Page): Promise<{ completed: string[]; missions: Record<string, { state: { completions: number; phase: string } }> } | null> {
  const raw = await page.evaluate(k => window.localStorage.getItem(k), SESSION_KEY)
  return raw ? JSON.parse(raw) : null
}

/** Runs axe-core (already a dev dependency, used by the jsdom tests) inside the page. Colour contrast is on. */
export async function axeViolations(page: Page): Promise<string[]> {
  const require = createRequire(import.meta.url)
  const source = await readFile(require.resolve('axe-core/axe.min.js'), 'utf8')
  await page.evaluate(source)
  return page.evaluate(async () => {
    const axe = (window as unknown as { axe: { run: (ctx: unknown, opts: unknown) => Promise<{ violations: { id: string; impact: string; nodes: { target: unknown[] }[] }[] }> } }).axe
    const result = await axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'] } })
    return result.violations.map(v => `${v.id} (${v.impact}): ${v.nodes.map(n => String(n.target)).join(' | ')}`)
  })
}
