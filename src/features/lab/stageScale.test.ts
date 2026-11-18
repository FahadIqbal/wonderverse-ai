import { describe, expect, it } from 'vitest'
import fc from 'fast-check'
import { BENCH_BOUNDS } from '../../domain/circuit'
import { MIN_TOUCH_PX, TERMINAL_OFFSET, VIEW_WIDTH, VIEW_X, bodyHitSize, labelFontSize, stageScale, terminalHitRadius, terminalHitShift } from './stageScale'
describe('schematic stage scale', () => {
  it('keeps every terminal hit area at least 44 CSS px across on any stage width from 280 to 1400 px', () => {
    fc.assert(
      fc.property(fc.integer({ min: 280, max: 1400 }), px => {
        const diameterPx = 2 * terminalHitRadius(px) * stageScale(px)
        expect(diameterPx).toBeGreaterThanOrEqual(MIN_TOUCH_PX - 1e-9)
      }),
    )
  })
  it('keeps labels readable (at least 11 CSS px) on a phone and at the design size on a wide stage', () => {
    expect(labelFontSize(342) * stageScale(342)).toBeGreaterThanOrEqual(11)
    expect(labelFontSize(1000)).toBe(13)
  })
  it('the fixed viewBox contains the whole bench, parts, terminals and their (shifted) touch circles at phone width', () => {
    const px = 342
    const left = BENCH_BOUNDS.minX - TERMINAL_OFFSET - terminalHitShift(px) - terminalHitRadius(px)
    const right = BENCH_BOUNDS.maxX + TERMINAL_OFFSET + terminalHitShift(px) + terminalHitRadius(px)
    expect(VIEW_X).toBeLessThanOrEqual(left)
    expect(VIEW_X + VIEW_WIDTH).toBeGreaterThanOrEqual(right)
  })
  it('a terminal touch circle never covers the middle of its part, so tapping the body centre still toggles or drags', () => {
    fc.assert(
      fc.property(fc.integer({ min: 280, max: 1400 }), px => {
        const k = stageScale(px)
        const innerEdgePx = (TERMINAL_OFFSET + terminalHitShift(px) - terminalHitRadius(px)) * k
        // Either the circle stops short of the centre, or the stage is so wide that nothing needs shifting.
        expect(innerEdgePx >= 7.99 || terminalHitShift(px) === 0).toBe(true)
      }),
    )
  })
  it('the part body touch box is at least 44 CSS px each way', () => {
    for (const px of [280, 342, 390, 600, 1000]) {
      const { width, height } = bodyHitSize(px)
      expect(width * stageScale(px)).toBeGreaterThanOrEqual(MIN_TOUCH_PX - 1e-9)
      expect(height * stageScale(px)).toBeGreaterThanOrEqual(MIN_TOUCH_PX - 1e-9)
    }
  })
})
