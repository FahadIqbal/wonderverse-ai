import { useState } from 'react'
import { panel, primaryButton } from '../../ui/styles'
import { useMissionStore } from './missionStore'

export function QuizPanel() {
  const mission = useMissionStore(s => s.mission)
  const quiz = mission.quiz
  const state = useMissionStore(s => s.state)
  const send = useMissionStore(s => s.send)
  const [selected, setSelected] = useState<string | null>(null)

  const unlocked = state.phase === 'quiz' || state.phase === 'complete'
  const solved = state.lastAnswer?.correct === true
  const answered = state.lastAnswer ? quiz.options.find(o => o.id === state.lastAnswer?.optionId) : undefined

  return (
    <section aria-labelledby="quiz-heading" className={panel}>
      <h2 id="quiz-heading" className="mb-2 text-lg font-semibold text-observatory-gold">
        Concept check
      </h2>
      {!unlocked ? (
        <p className="text-sm text-slate-300" data-testid="quiz-locked">
          {mission.quizLockedNote}
        </p>
      ) : (
        <form
          onSubmit={e => {
            e.preventDefault()
            if (selected && !solved) send({ type: 'answerQuiz', optionId: selected })
          }}
        >
          <fieldset disabled={solved}>
            <legend className="mb-2 text-sm text-slate-100">{quiz.prompt}</legend>
            <div className="space-y-2">
              {quiz.options.map(o => (
                <label key={o.id} className="flex min-h-[44px] cursor-pointer items-center gap-3 text-sm text-slate-100">
                  <input
                    type="radio"
                    name={quiz.id}
                    value={o.id}
                    checked={selected === o.id}
                    onChange={() => setSelected(o.id)}
                    className="h-5 w-5"
                  />
                  <span>{o.text}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <button type="submit" className={`${primaryButton} mt-3`} disabled={!selected || solved} aria-describedby="quiz-status">
            Check answer
          </button>
          <p id="quiz-status" className="mt-2 text-xs text-slate-400">
            {solved ? 'Answered correctly.' : selected ? 'Ready to check.' : 'Choose an answer to enable Check answer.'}
          </p>
          <div
            role="status"
            aria-live="polite"
            data-testid="quiz-feedback"
            className={`mt-2 min-h-[1.5rem] text-sm ${state.lastAnswer?.correct ? 'text-observatory-aqua' : 'text-amber-300'}`}
          >
            {answered && (
              <>
                <strong>{state.lastAnswer?.correct ? 'Correct. ' : 'Not quite. Try another answer. '}</strong>
                {answered.explanation}
              </>
            )}
          </div>
        </form>
      )}
    </section>
  )
}
