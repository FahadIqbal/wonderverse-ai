import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

// Single source of truth for the docs/04 palette. The 3D scene and the CSS variables read the same values.
const palette = JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'src/ui/palette.json'), 'utf8'))

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        observatory: {
          navy: palette.navy,
          'navy-light': palette.navyLight,
          'navy-lighter': palette.navyLighter,
          text: palette.text,
          muted: palette.muted,
          aqua: palette.aqua,
          'aqua-dim': palette.aquaDim,
          gold: palette.gold,
          'gold-dim': palette.goldDim,
          coral: palette.coral,
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      animation: {
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
      },
      keyframes: {
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 8px rgba(84, 229, 211, 0.4)' },
          '50%': { boxShadow: '0 0 20px rgba(84, 229, 211, 0.8)' },
        }
      }
    },
  },
  plugins: [],
}
