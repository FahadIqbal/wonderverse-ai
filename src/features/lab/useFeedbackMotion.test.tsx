import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useRecentlyAdded, useRejectionPulse } from './useFeedbackMotion'

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

describe('useRecentlyAdded', () => {
  it('does not flash on first render or on a bulk load, flashes one new id, then clears', () => {
    const { result, rerender } = renderHook(({ ids }) => useRecentlyAdded(ids), { initialProps: { ids: ['a'] } })
    expect([...result.current]).toEqual([])
    rerender({ ids: ['a', 'b'] })
    expect([...result.current]).toEqual(['b'])
    act(() => void vi.advanceTimersByTime(900))
    expect([...result.current]).toEqual([])
    rerender({ ids: ['a', 'b', 'c', 'd'] })
    expect([...result.current]).toEqual([])
  })
  it('does not flash when an id is removed', () => {
    const { result, rerender } = renderHook(({ ids }) => useRecentlyAdded(ids), { initialProps: { ids: ['a', 'b'] } })
    rerender({ ids: ['a'] })
    expect([...result.current]).toEqual([])
  })
})

describe('useRejectionPulse', () => {
  it('pulses for error feedback only, and again for a new error object', () => {
    const { result, rerender } = renderHook(({ f }) => useRejectionPulse(f), {
      initialProps: { f: { kind: 'info' } as { kind: string } | null },
    })
    expect(result.current).toBe(false)
    rerender({ f: { kind: 'error' } })
    expect(result.current).toBe(true)
    act(() => void vi.advanceTimersByTime(500))
    expect(result.current).toBe(false)
    rerender({ f: { kind: 'error' } })
    expect(result.current).toBe(true)
  })
})
