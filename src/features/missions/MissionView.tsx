import { useEffect, useRef, useState } from 'react'
import { LabWorkbench } from '../lab/LabWorkbench'
import { panel, primaryButton, secondaryButton } from '../../ui/styles'
import { CompletionDialog } from './CompletionDialog'
import { MissionHUD } from './MissionHUD'
import { QuizPanel } from './QuizPanel'
import { TutorPanel } from '../tutor/TutorPanel'
import { missionIndex, nextMission } from '../../domain/learning'
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
  const [dismissed, setDismissed] = useState(false)
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

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        {/* The lab comes first in the DOM and on screen: it is the main activity. */}
        <LabWorkbench />
        <aside aria-label="Mission panel" className="flex flex-col gap-4">
          <MissionHUD />
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
          <TutorPanel key={mission.id} />
        </aside>
      </div>
      {complete && !dismissed && (
        <CompletionDialog
          mission={mission}
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
