import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { MissionMap } from '../features/missions/MissionMap'
import { useMissionStore } from '../features/missions/missionStore'
import { missionIndex } from '../domain/learning'
import { useApplyMotionAttribute } from '../features/lab/useMotionPreference'
import { ghostButton, secondaryButton } from '../ui/styles'
import { PortalHero } from './PortalHero'
import { pushScreen, readScreen, type ScreenName } from './backStack'

// The mission screen (lab, solver, tutor, quiz) is not needed for first paint, so it is its own chunk.
const loadMissionView = () => import('../features/missions/MissionView').then(m => ({ default: m.MissionView }))
const MissionView = lazy(loadMissionView)
/** After the map renders, fetch the mission chunk and then the 3D chunk when the browser is idle, so entering the lab is instant. */
function prefetchMissionChunks() {
  const run = () => void loadMissionView().then(() => import('../features/lab/scene/LabScene')).catch(() => undefined)
  if ('requestIdleCallback' in window) window.requestIdleCallback(run, { timeout: 4000 })
  else setTimeout(run, 1500)
}
type Screen = ScreenName

/**
 * Top-level shell. State-based screens (no router: no deep links yet): portal -> mission map -> mission.
 * The recap is the completion dialog inside the mission screen, with a way back to the map.
 * Guests start with one button; there is no login (R1).
 */
export function AppShell() {
  const [screen, setScreenState] = useState<Screen>('portal')
  // Each screen is a history entry so the Android Back button (and the browser's) steps mission -> map -> start
  // instead of leaving the app. Overlays add their own entry on top (see useBackToClose).
  const setScreen = (next: Screen) => {
    if (next === screen) return
    pushScreen(next)
    setScreenState(next)
  }
  useEffect(() => {
    window.history.replaceState({ ...(window.history.state ?? {}), wvScreen: 'portal' }, '')
    const onPop = (e: PopStateEvent) => setScreenState(readScreen(e.state))
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])
  const missionId = useMissionStore(s => s.missionId)
  const mainRef = useRef<HTMLElement>(null)
  useApplyMotionAttribute()
  const lastScreen = useRef<Screen>(screen)
  // Move focus to the new screen's heading so keyboard and screen reader users land in the right place.
  // Not on the first render: the skip link must stay the first Tab stop on a fresh page load.
  useEffect(() => {
    if (lastScreen.current === screen) return
    lastScreen.current = screen
    mainRef.current?.querySelector<HTMLElement>('h1')?.focus()
  }, [screen])
  useEffect(() => {
    if (screen === 'map') prefetchMissionChunks()
  }, [screen])
  return (
    <div className="flex min-h-screen flex-col bg-observatory-navy text-observatory-text">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded-md focus:bg-observatory-gold focus:px-4 focus:py-2 focus:font-semibold focus:text-observatory-navy"
      >
        Skip to main content
      </a>
      <header className="border-b border-observatory-navy-lighter bg-observatory-navy-light/80 px-4 py-2 shadow-[0_1px_0_rgba(84,229,211,0.12)] sm:py-3 md:px-8 [@media(max-height:500px)]:py-1">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-3 gap-y-1">
          <p className="text-lg font-bold tracking-tight text-observatory-aqua sm:text-xl">
            WonderVerse <span className="text-observatory-gold">AI</span>
          </p>
          {screen !== 'portal' ? (
            <nav aria-label="Lab navigation" className="flex items-center gap-1 sm:gap-3">
              <span className="hidden text-sm text-slate-300 sm:inline [@media(max-height:500px)]:hidden">
                Electricity Lab{screen === 'mission' ? ` · Mission ${missionIndex(missionId) + 1}` : ''}
              </span>
              {screen === 'mission' && (
                <button type="button" className={secondaryButton} aria-label="Back to missions" onClick={() => setScreen('map')}>
                  <span className="sm:hidden">Missions</span>
                  <span className="hidden sm:inline">Back to missions</span>
                </button>
              )}
              <button type="button" className={ghostButton} aria-label="Back to start" onClick={() => setScreen('portal')}>
                <span className="sm:hidden">Start</span>
                <span className="hidden sm:inline">Back to start</span>
              </button>
            </nav>
          ) : (
            <span className="text-sm text-slate-300">Electricity Lab</span>
          )}
        </div>
      </header>
      <main id="main-content" ref={mainRef} tabIndex={-1} className="outline-none mx-auto w-full max-w-7xl flex-1 px-4 py-3 sm:py-6 md:px-8 [@media(max-height:500px)]:py-1">
        {screen === 'portal' ? (
          <PortalHero onEnter={() => setScreen('map')} />
        ) : screen === 'map' ? (
          <MissionMap onOpen={() => setScreen('mission')} />
        ) : (
          <>
            <h1
              tabIndex={-1}
              className="mb-2 text-xl font-bold text-observatory-aqua outline-none sm:mb-4 sm:text-2xl md:text-3xl [@media(max-height:500px)]:sr-only"
            >
              Electricity Lab
            </h1>
            <Suspense
              fallback={
                <p role="status" className="text-slate-300">
                  Loading the lab…
                </p>
              }
            >
              <MissionView key={missionId} onBackToMap={() => setScreen('map')} />
            </Suspense>
          </>
        )}
      </main>
      <footer className="border-t border-observatory-navy-lighter px-4 py-3 text-center text-xs text-slate-400">
        Simplified DC circuit simulator for learning: ideal batteries and fixed-resistance parts only.
      </footer>
    </div>
  )
}
