import { useEffect, useRef, useState } from 'react'
import { LabWorkbench } from '../lab/LabWorkbench'
import { panel, primaryButton, secondaryButton } from '../../ui/styles'
import { CompletionDialog } from './CompletionDialog'
import { MissionHUD } from './MissionHUD'
import { QuizPanel } from './QuizPanel'
import { OnboardingTour } from '../onboarding/OnboardingTour'
import { useSettingsStore } from '../lab/settingsStore'
import { TutorPanel } from '../tutor/TutorPanel'
import { Collapsible } from '../../ui/Collapsible'
import { HelpIcon } from '../../ui/icons'
import { solveCircuit } from '../../domain/circuit'
import { buildRecap, missionIndex, nextMission } from '../../domain/learning'
import { useLabStore } from '../lab/labStore'
import { canFinish, unmetObjectiveTitles } from './missionMachine'
import { useMissionBridge, useMissionStore } from './missionStore'

export function MissionView({ onBackToMap }: { onBackToMap?: () => void } = {}) {
  useMissionBridge()
  const mission = useMissionStore(s => s.mission)
  const state = useMissionStore(s => s.state)
  const send = useMissionStore(s => s.send)
  const startMission = useMissionStore(s => s.startMission)
  const restartMission = useMissionStore(s => s.restartMission)
  const selectMission = useMissionStore(s => s.selectMission)
  const savedRecap = useMissionStore(s => s.recaps[s.mission.id])
  const graph = useLabStore(s => s.graph)
  const [dismissed, setDismissed] = useState(false)
  const tourSeen = useSettingsStore(s => s.tourSeen)
  const setTourSeen = useSettingsStore(s => s.setTourSeen)
  const [tourReopened, setTourReopened] = useState(false)
  const howToPlay = useRef<HTMLButtonElement>(null)
  const recapButton = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (dismissed) recapButton.current?.focus()
  }, [dismissed])

  if (state.phase === 'briefing') {
    return (
      <section aria-labelledby="briefing-heading" className={panel}>
        <h2 id="briefing-heading" className="mb-2 text-2xl font-bold text-observatory-gold">
          Mission {missionIndex(mission.id) + 1}: {mission.title}
        </h2>
        <p className="mb-2 text-lg text-slate-100">{mission.opening}</p>
        <p className="mb-2 text-sm text-slate-300">{mission.partsNote}</p>
        <p className="mb-4 text-xs text-slate-400">{mission.safetyNote}</p>
        <button type="button" className={primaryButton} onClick={startMission} autoFocus>
          Start mission
        </button>
      </section>
    )
  }

  const following = nextMission(mission.id)
  const finishable = canFinish(state, mission)
  const blockers = unmetObjectiveTitles(state, mission)
  const complete = state.phase === 'complete'
  // First visit: the tour opens once the mission is under way (its targets exist then). "How to play" reopens it.
  const showTour = tourReopened || (!tourSeen && !complete)
  const closeTour = () => {
    setTourReopened(false)
    setTourSeen(true)
    // The tour's buttons disappear, so hand focus to the control that reopens it.
    queueMicrotask(() => howToPlay.current?.focus())
  }
  return (
    <div className={`flex flex-col gap-4 ${showTour ? 'max-sm:pb-64' : ''}`}>
      {showTour && <OnboardingTour onClose={closeTour} />}
      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        {/* The lab comes first in the DOM and on screen: it is the main activity. */}
        <LabWorkbench
          toolbarExtra={
            <button
              type="button"
              ref={howToPlay}
              className={`${secondaryButton} shrink-0 max-sm:px-3`}
              onClick={() => setTourReopened(true)}
            >
              <HelpIcon className="h-5 w-5" />
              How to play
            </button>
          }
        />
        <aside aria-label="Mission panel" className="flex flex-col gap-4">
          <Collapsible title="Objectives, next step and hints" breakpoint="lg" defaultOpen>
            <MissionHUD />
          </Collapsible>
          <QuizPanel />
          <section aria-label="Finish mission" className={panel}>
            {complete ? (
              <>
                <p className="mb-2 text-sm text-observatory-aqua" data-testid="mission-complete">
                  Mission complete.
                </p>
                <button
                  type="button"
                  ref={recapButton}
                  className={secondaryButton}
                  onClick={() => setDismissed(false)}
                >
                  View recap
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  className={primaryButton}
                  disabled={!finishable}
                  aria-describedby="finish-reason"
                  onClick={() => send({ type: 'finish' })}
                >
                  Finish mission
                </button>
                <p id="finish-reason" data-testid="finish-reason" className="mt-2 text-xs text-slate-300">
                  {finishable ? 'All objectives are met. You can finish.' : `Still to do: ${blockers.join('; ')}.`}
                </p>
              </>
            )}
          </section>
          <Collapsible title="Ask Nova, the tutor" breakpoint="lg" defaultOpen>
            <TutorPanel key={mission.id} />
          </Collapsible>
        </aside>
      </div>
      {complete && !dismissed && (
        <CompletionDialog
          mission={mission}
          recap={savedRecap ?? buildRecap(graph, solveCircuit(graph), state.hintsShown)}
          onClose={() => setDismissed(true)}
          onReplay={() => {
            setDismissed(false)
            restartMission()
          }}
          onBackToMap={() => onBackToMap?.()}
          next={following ? { title: following.title, onOpen: () => selectMission(following.id) } : undefined}
        />
      )}
    </div>
  )
}
