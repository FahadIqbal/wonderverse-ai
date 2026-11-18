import { useEffect, useRef } from 'react'
/**
 * Android Back (and the browser Back button) for overlays. While an overlay such as a dialog or the tour is open it owns
 * one history entry. Back pops that entry, which closes the overlay and leaves the page where it was. Closing the
 * overlay another way (a button, Escape) pops the entry it added, so history never grows with each open and close.
 *
 * Only the entry this hook added is ever popped, so it cannot walk the user out of the app.
 */
const MARK = 'wvOverlay'
let counter = 0
export function useBackToClose(active: boolean, onClose: () => void): void {
  const closeRef = useRef(onClose)
  closeRef.current = onClose
  useEffect(() => {
    if (!active || typeof window === 'undefined') return
    const id = `${MARK}-${++counter}`
    let poppedByUser = false
    window.history.pushState({ ...(window.history.state ?? {}), [MARK]: id }, '')
    const onPop = () => {
      if ((window.history.state as Record<string, unknown> | null)?.[MARK] === id) return
      poppedByUser = true
      closeRef.current()
    }
    window.addEventListener('popstate', onPop)
    return () => {
      window.removeEventListener('popstate', onPop)
      // Closed by something other than Back: remove the entry we added, if it is still the current one.
      // Deferred a tick so React StrictMode's immediate re-run of this effect (development only) does not pop the entry
      // it is about to replace: by then the current entry carries a newer id and is left alone.
      if (!poppedByUser) {
        queueMicrotask(() => {
          if ((window.history.state as Record<string, unknown> | null)?.[MARK] === id) window.history.back()
        })
      }
    }
  }, [active])
}
/** Screens of the app, one history entry each, so Back goes mission -> map -> start instead of leaving the app. */
export type ScreenName = 'portal' | 'map' | 'mission'
const SCREEN_KEY = 'wvScreen'
export function readScreen(state: unknown): ScreenName {
  const v = (state as Record<string, unknown> | null)?.[SCREEN_KEY]
  return v === 'map' || v === 'mission' ? v : 'portal'
}
export function pushScreen(next: ScreenName): void {
  window.history.pushState({ [SCREEN_KEY]: next }, '')
}
