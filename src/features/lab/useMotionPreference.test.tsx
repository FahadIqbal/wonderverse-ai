import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, renderHook } from '@testing-library/react'
import fc from 'fast-check'
import { resolveMotion, useApplyMotionAttribute, useMotionPreference } from './useMotionPreference'
import { useSettingsStore } from './settingsStore'

type Listener = () => void
function mockMatchMedia(initial: boolean) {
  let matches = initial
  const listeners = new Set<Listener>()
  vi.stubGlobal('matchMedia', undefined)
  window.matchMedia = ((q: string) => ({
    get matches() {
      return q.includes('reduced-motion') ? matches : false
    },
    media: q,
    addEventListener: (_: string, l: Listener) => listeners.add(l),
    removeEventListener: (_: string, l: Listener) => listeners.delete(l),
  })) as unknown as typeof window.matchMedia
  return {
    set(v: boolean) {
      matches = v
      listeners.forEach(l => l())
    },
  }
}

describe('resolveMotion', () => {
  it('is calm and static whenever either setting asks for it (property)', () => {
    fc.assert(
      fc.property(fc.boolean(), fc.boolean(), (reduced, lowPower) => {
        const m = resolveMotion(reduced, lowPower)
        expect(m.calm).toBe(reduced || lowPower)
        expect(m.animateFlow).toBe(!reduced && !lowPower)
        expect(m.frameloop).toBe('demand')
        expect(m.antialias).toBe(!lowPower)
        expect(m.dpr[1]).toBe(lowPower ? 1 : 1.75)
      }),
    )
  })
})

describe('useMotionPreference', () => {
  beforeEach(() => useSettingsStore.setState({ lowPower: false }))
  afterEach(() => {
    vi.unstubAllGlobals()
    document.documentElement.removeAttribute('data-motion')
  })

  it('follows prefers-reduced-motion live and the Low-power setting', () => {
    const mm = mockMatchMedia(false)
    const { result } = renderHook(() => useMotionPreference())
    expect(result.current.animateFlow).toBe(true)
    act(() => mm.set(true))
    expect(result.current.reducedMotion).toBe(true)
    expect(result.current.animateFlow).toBe(false)
    act(() => mm.set(false))
    expect(result.current.animateFlow).toBe(true)
    act(() => useSettingsStore.getState().setLowPower(true))
    expect(result.current.lowPower).toBe(true)
    expect(result.current.animateFlow).toBe(false)
    expect(result.current.dpr).toEqual([1, 1])
  })

  it('sets data-motion="calm" on <html> for CSS, and clears it again', () => {
    const mm = mockMatchMedia(false)
    function Probe() {
      useApplyMotionAttribute()
      return null
    }
    const { unmount } = render(<Probe />)
    expect(document.documentElement).not.toHaveAttribute('data-motion')
    act(() => mm.set(true))
    expect(document.documentElement).toHaveAttribute('data-motion', 'calm')
    act(() => mm.set(false))
    act(() => useSettingsStore.getState().setLowPower(true))
    expect(document.documentElement).toHaveAttribute('data-motion', 'calm')
    unmount()
    expect(document.documentElement).not.toHaveAttribute('data-motion')
  })

  it('works when matchMedia does not exist', () => {
    vi.stubGlobal('matchMedia', undefined)
    const original = window.matchMedia
    // @ts-expect-error simulate an old browser
    window.matchMedia = undefined
    const { result } = renderHook(() => useMotionPreference())
    expect(result.current.reducedMotion).toBe(false)
    window.matchMedia = original
  })
})
