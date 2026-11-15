import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import colors from 'tailwindcss/colors'
import { PALETTE, blend, contrastRatio } from './palette'
// @ts-expect-error the Tailwind config is plain JS without types
import tailwindConfig from '../../tailwind.config.js'

const AA_TEXT = 4.5
const AA_NON_TEXT = 3

const slate = colors.slate
const P = PALETTE

/**
 * Every text-on-background pair the UI uses, taken from the Tailwind classes in src/. Backgrounds are the
 * navy page, the surface panels, the raised navy-lighter controls and the 70% black dialog backdrop over navy.
 */
const textPairs: { fg: string; fgName: string; bg: string; bgName: string }[] = []
const fgs: Record<string, string> = {
  'text (docs/04)': P.text,
  'muted (docs/04)': P.muted,
  'slate-100': slate[100],
  'slate-200': slate[200],
  'slate-300': slate[300],
  'slate-400': slate[400],
  aqua: P.aqua,
  gold: P.gold,
  'amber-300': colors.amber[300],
  'red-200': colors.red[200],
  'red-300': colors.red[300],
  coral: P.coral,
}
const bgs: Record<string, string> = {
  navy: P.navy,
  surface: P.navyLight,
  'red-950/60 over surface': blend(colors.red[950], P.navyLight, 0.6),
}
for (const [fgName, fg] of Object.entries(fgs)) for (const [bgName, bg] of Object.entries(bgs)) textPairs.push({ fg, fgName, bg, bgName })
// Text colours used on raised (navy-lighter) controls.
for (const fgName of ['aqua', 'gold', 'text (docs/04)', 'slate-100'])
  textPairs.push({ fg: fgs[fgName], fgName, bg: P.navyLighter, bgName: 'navy-lighter' })
// Button labels: navy text on aqua, gold and the focus ring.
textPairs.push({ fg: P.navy, fgName: 'navy', bg: P.aqua, bgName: 'aqua button' })
textPairs.push({ fg: P.navy, fgName: 'navy', bg: P.gold, bgName: 'gold skip link' })
// Hover state of secondary buttons: navy on aqua is the same pair; aqua on navy-lighter is listed above.

describe('palette contrast (WCAG 2.x AA)', () => {
  it.each(textPairs.filter(p => !(p.fgName === 'red-200' && p.bgName !== 'red-950/60 over surface')))(
    '$fgName on $bgName is at least 4.5:1',
    ({ fg, bg }) => {
      expect(contrastRatio(fg, bg)).toBeGreaterThanOrEqual(AA_TEXT)
    },
  )

  it('uses distinguishable focus rings and borders (3:1 for non-text)', () => {
    expect(contrastRatio(P.aqua, P.navy)).toBeGreaterThanOrEqual(AA_NON_TEXT)
    expect(contrastRatio(P.gold, P.navy)).toBeGreaterThanOrEqual(AA_NON_TEXT)
    expect(contrastRatio(P.gold, P.navyLight)).toBeGreaterThanOrEqual(AA_NON_TEXT)
    expect(contrastRatio(P.muted, P.navy)).toBeGreaterThanOrEqual(AA_NON_TEXT) // text-field border
  })

  it('computes known reference ratios', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 5)
    expect(contrastRatio('#777777', '#ffffff')).toBeCloseTo(4.48, 2)
  })
})

describe('palette is reconciled everywhere', () => {
  it('Tailwind observatory colours come from palette.json', () => {
    const o = (tailwindConfig.theme.extend.colors as { observatory: Record<string, string> }).observatory
    expect(o).toMatchObject({
      navy: P.navy,
      'navy-light': P.navyLight,
      'navy-lighter': P.navyLighter,
      aqua: P.aqua,
      gold: P.gold,
      coral: P.coral,
      text: P.text,
      muted: P.muted,
    })
  })

  it('CSS variables in index.css match palette.json', () => {
    const css = readFileSync(resolve(process.cwd(), 'src/index.css'), 'utf8')
    const vars: Record<string, string> = {
      '--color-navy': P.navy,
      '--color-navy-light': P.navyLight,
      '--color-navy-lighter': P.navyLighter,
      '--color-text': P.text,
      '--color-muted': P.muted,
      '--color-aqua': P.aqua,
      '--color-aqua-dim': P.aquaDim,
      '--color-gold': P.gold,
      '--color-gold-dim': P.goldDim,
      '--color-coral': P.coral,
    }
    for (const [name, hex] of Object.entries(vars)) {
      const m = new RegExp(`${name}:\\s*(#[0-9a-fA-F]{6})`).exec(css)
      expect(m?.[1].toLowerCase(), name).toBe(hex.toLowerCase())
    }
  })

  it('matches the docs/04 hex values', () => {
    expect(P).toMatchObject({ navy: '#0B1021', navyLight: '#141E35', text: '#F6F8FF', muted: '#A8B7D4', aqua: '#54E5D3', gold: '#FFD36B', coral: '#FF746E' })
  })

  it('no hard-coded legacy palette hex remains in components', () => {
    const files = ['features/lab/SchematicCanvas.tsx', 'features/lab/scene/LabScene.tsx']
    for (const f of files) {
      const src = readFileSync(resolve(process.cwd(), 'src', f), 'utf8')
      for (const legacy of ['#00d4ff', '#ffd700', '#0a1628', '#132238', '#1a2d47']) expect(src.toLowerCase(), `${f} ${legacy}`).not.toContain(legacy)
    }
  })
})
