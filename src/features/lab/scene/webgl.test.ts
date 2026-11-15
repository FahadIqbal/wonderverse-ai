import { describe, expect, it, vi } from 'vitest'
import { attachContextLossHandler } from './webgl'

describe('attachContextLossHandler', () => {
  it('calls back once per loss event, prevents the default, and stops after cleanup', () => {
    const canvas = document.createElement('canvas')
    const onLost = vi.fn()
    const detach = attachContextLossHandler(canvas, onLost)
    const event = new Event('webglcontextlost', { cancelable: true })
    canvas.dispatchEvent(event)
    expect(onLost).toHaveBeenCalledTimes(1)
    expect(event.defaultPrevented).toBe(true)
    detach()
    canvas.dispatchEvent(new Event('webglcontextlost', { cancelable: true }))
    expect(onLost).toHaveBeenCalledTimes(1)
  })
})
