/** Schematic stage geometry shared by the canvas and its tests. Pure: no React, no DOM. */
/**
 * The viewBox covers the whole bench plus room for terminal touch areas: part centres run 80 to 580, terminals sit 35
 * either side, and on a phone each terminal's touch circle (about 47 units in radius) is shifted outward by ~29 units.
 */
export const VIEW_X = -32
export const VIEW_WIDTH = 724
/** Smallest comfortable touch target, in CSS pixels (WCAG 2.5.5 and platform guidance). */
export const MIN_TOUCH_PX = 44
export const DEFAULT_STAGE_PX = 724
/** Design size: half a pixel over the minimum, so rounding in layout never reports 43.99. */
const TARGET_PX = MIN_TOUCH_PX + 0.5
/** Terminals sit this far (model units) either side of the part centre. */
export const TERMINAL_OFFSET = 35
/** The part body keeps at least this many CSS px between the part centre and a terminal's touch area, so the centre still toggles or drags. */
const BODY_STRIP_PX = 8
/** Pixels per model unit for a stage this wide. */
export function stageScale(stagePx: number): number {
  return stagePx > 0 ? stagePx / VIEW_WIDTH : 1
}
/** Terminal touch radius in model units: at least 22 units, and enough that the target is 44 CSS px across on a phone. */
export function terminalHitRadius(stagePx: number): number {
  return Math.max(22.25, TARGET_PX / 2 / stageScale(stagePx))
}
/**
 * How far (model units) a terminal's touch circle is moved away from its part. On a phone two terminals of one part are
 * only ~35 px apart, so 44 px circles centred on them would cover the whole body and a tap on a switch would hit a
 * terminal. Shifting each circle outward keeps the target 44 px across and leaves a strip in the middle of the body.
 * Zero when the stage is wide enough that nothing overlaps.
 */
export function terminalHitShift(stagePx: number): number {
  const k = stageScale(stagePx)
  const shiftPx = Math.max(0, TARGET_PX / 2 + BODY_STRIP_PX - TERMINAL_OFFSET * k)
  return shiftPx / k
}
/** Part body touch box in model units: 90 x 64 on a wide stage, never below 44 CSS px either way. */
export function bodyHitSize(stagePx: number): { width: number; height: number } {
  const min = TARGET_PX / stageScale(stagePx)
  return { width: Math.max(90, min), height: Math.max(64, min) }
}
/** Part label size in model units: 13 on a wide stage, never below 11 CSS px on a phone. */
export function labelFontSize(stagePx: number): number {
  return Math.max(13, 11 / stageScale(stagePx))
}
