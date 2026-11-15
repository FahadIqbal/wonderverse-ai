/** Feature detection kept separate from the scene so tests can mock it and the three.js chunk stays lazy. */
export function isWebGLAvailable(): boolean {
  try {
    if (typeof document === 'undefined') return false
    const canvas = document.createElement('canvas')
    const gl = canvas.getContext('webgl2') ?? canvas.getContext('webgl')
    return gl !== null && gl !== undefined
  } catch {
    return false
  }
}

/**
 * Calls `onLost` when the browser reports the WebGL context was lost. `preventDefault` tells the browser we
 * handle it, so it does not log an unhandled-loss warning. Returns a cleanup function.
 */
export function attachContextLossHandler(canvas: HTMLCanvasElement, onLost: () => void): () => void {
  const handler = (e: Event) => {
    e.preventDefault()
    onLost()
  }
  canvas.addEventListener('webglcontextlost', handler)
  return () => canvas.removeEventListener('webglcontextlost', handler)
}
