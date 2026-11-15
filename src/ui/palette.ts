import palette from './palette.json'

/** The docs/04 palette. Tailwind (`tailwind.config.js`), the CSS variables and the 3D scene all read these values. */
export const PALETTE = palette

/** Parses `#rrggbb` into 0-255 channels. */
export function hexToRgb(hex: string): [number, number, number] {
  const m = /^#([0-9a-f]{6})$/i.exec(hex)
  if (!m) throw new Error(`Expected #rrggbb, got "${hex}"`)
  const n = parseInt(m[1], 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

/** WCAG 2.x relative luminance. */
export function relativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map(v => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/** WCAG contrast ratio between two opaque colours, 1 to 21. */
export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a)
  const lb = relativeLuminance(b)
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05)
}

/** Opaque result of `fg` at `alpha` over `bg`. */
export function blend(fg: string, bg: string, alpha: number): string {
  const f = hexToRgb(fg)
  const b = hexToRgb(bg)
  const out = f.map((v, i) => Math.round(v * alpha + b[i] * (1 - alpha)))
  return `#${out.map(v => v.toString(16).padStart(2, '0')).join('')}`
}
