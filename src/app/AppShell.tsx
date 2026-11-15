import { useEffect, useRef, useState } from 'react'
import { MissionMap } from '../features/missions/MissionMap'
import { MissionView } from '../features/missions/MissionView'
import { useMissionStore } from '../features/missions/missionStore'
import { missionIndex } from '../domain/learning'
import { useApplyMotionAttribute } from '../features/lab/useMotionPreference'
import { ghostButton, secondaryButton } from '../ui/styles'
import { PortalHero } from './PortalHero'

type Screen = 'portal' | 'map' | 'mission'

/**
 * Top-level shell. State-based screens (no router: no deep links yet): portal -> mission map -> mission.
 * The recap is the completion dialog inside the mission screen, with a way back to the map.
 * Guests start with one button; there is no login (R1).
 */
export function AppShell() {
  const [screen, setScreen] = useState<Screen>('portal')
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

  return (
    <div className="flex min-h-screen flex-col bg-observatory-navy text-observatory-text">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded-md focus:bg-observatory-gold focus:px-4 focus:py-2 focus:font-semibold focus:text-observatory-navy"
      >
        Skip to main content
      </a>
      <header className="border-b border-observatory-navy-lighter bg-observatory-navy-light/80 px-4 py-3 shadow-[0_1px_0_rgba(84,229,211,0.12)] md:px-8">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
          <p className="text-xl font-bold tracking-tight text-observatory-aqua">
            WonderVerse <span className="text-observatory-gold">AI</span>
          </p>
          {screen !== 'portal' ? (
            <nav aria-label="Lab navigation" className="flex items-center gap-3">
              <span className="hidden text-sm text-slate-300 sm:inline">
                Electricity Lab{screen === 'mission' ? ` · Mission ${missionIndex(missionId) + 1}` : ''}
              </span>
              {screen === 'mission' && (
                <button type="button" className={secondaryButton} onClick={() => setScreen('map')}>
                  Back to missions
                </button>
              )}
              <button type="button" className={ghostButton} onClick={() => setScreen('portal')}>
                Back to start
              </button>
            </nav>
          ) : (
            <span className="text-sm text-slate-300">Electricity Lab</span>
          )}
        </div>
      </header>
      <main id="main-content" ref={mainRef} tabIndex={-1} className="outline-none mx-auto w-full max-w-7xl flex-1 px-4 py-6 md:px-8">
        {screen === 'portal' ? (
          <PortalHero onEnter={() => setScreen('map')} />
        ) : screen === 'map' ? (
          <MissionMap onOpen={() => setScreen('mission')} />
        ) : (
          <>
            <h1
              tabIndex={-1}
              className="mb-4 text-2xl font-bold text-observatory-aqua outline-none md:text-3xl"
            >
              Electricity Lab
            </h1>
            <MissionView key={missionId} onBackToMap={() => setScreen('map')} />
          </>
        )}
      </main>
      <footer className="border-t border-observatory-navy-lighter px-4 py-3 text-center text-xs text-slate-400">
        Simplified DC circuit simulator for learning: ideal batteries and fixed-resistance parts only.
      </footer>
    </div>
  )
}
