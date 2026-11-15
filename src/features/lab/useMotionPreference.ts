import { useEffect, useSyncExternalStore } from 'react'
import { shouldAnimateFlow, useSettingsStore } from './settingsStore'

const QUERY = '(prefers-reduced-motion: reduce)'

export interface MotionPreference {
  /** The OS or browser asks for reduced motion. Live: follows changes while the app is open. */
  reducedMotion: boolean
  /** The learner turned Low-power mode on. */
  lowPower: boolean
  /** Either setting asks for calm: no decorative animation or transitions. */
  calm: boolean
  /** Current-flow dots along energized wires. */
  animateFlow: boolean
  /** R3F base render loop. On demand: the scene switches to continuous only while a lit lamp pulses (see sceneFrameloop). */
  frameloop: 'demand'
  /** Pixel-ratio range for the canvas. Low-power renders at 1x. */
  dpr: [number, number]
  /** Antialiasing costs GPU time; Low-power turns it off. */
  antialias: boolean
}

/** Pure rule shared by CSS, flow dots and the R3F canvas. */
export function resolveMotion(reducedMotion: boolean, lowPower: boolean): MotionPreference {
  return {
    reducedMotion,
    lowPower,
    calm: reducedMotion || lowPower,
    animateFlow: shouldAnimateFlow(reducedMotion, lowPower),
    frameloop: 'demand',
    dpr: lowPower ? [1, 1] : [1, 1.75],
    antialias: !lowPower,
  }
}

function query(): MediaQueryList | null {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function' ? window.matchMedia(QUERY) : null
}

function subscribe(onChange: () => void): () => void {
  const mql = query()
  if (!mql) return () => {}
  mql.addEventListener?.('change', onChange)
  return () => mql.removeEventListener?.('change', onChange)
}

const getSnapshot = () => query()?.matches ?? false

/**
 * The single motion setting for the app. Reads `prefers-reduced-motion` (live) and the Low-power setting.
 * Mirrors the result to `<html data-motion="calm">` so CSS animations and transitions switch off too.
 * Call it once at the app root for the CSS attribute, and wherever a component needs the values.
 */
export function useMotionPreference(): MotionPreference {
  const reduced = useSyncExternalStore(subscribe, getSnapshot, () => false)
  const lowPower = useSettingsStore(s => s.lowPower)
  return resolveMotion(reduced, lowPower)
}

/** Applies the `data-motion` attribute. Mounted once by AppShell. */
export function useApplyMotionAttribute(): void {
  const { calm } = useMotionPreference()
  useEffect(() => {
    const root = document.documentElement
    if (calm) root.setAttribute('data-motion', 'calm')
    else root.removeAttribute('data-motion')
    return () => root.removeAttribute('data-motion')
  }, [calm])
}
