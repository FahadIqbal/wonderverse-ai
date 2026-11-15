import type { CircuitGraph, SimulationReport } from '../../domain/circuit'
import { createMissionEvaluator, type Mission, type MissionEvaluation, type SemanticEvent } from '../../domain/learning'

export type MissionPhase = 'briefing' | 'building' | 'quiz' | 'complete'

export interface MissionState {
  phase: MissionPhase
  eventLog: SemanticEvent[]
  /** Objective ids that have been met at least once (latched, so later edits do not undo progress). */
  achieved: string[]
  /** Most recently achieved objective id, used for the live-region announcement. */
  lastAchieved: string | null
  hintsShown: number
  lastAnswer: { optionId: string; correct: boolean } | null
  /** Number of times this run advanced to `complete`. Never exceeds 1. */
  completions: number
}

export type MissionInput =
  | { type: 'start' }
  | { type: 'record'; event: SemanticEvent }
  | { type: 'answerQuiz'; optionId: string }
  | { type: 'requestHint' }
  | { type: 'finish' }
  | { type: 'restart' }

/** What the machine may read when settling: the mission plus the current report and graph. */
export interface MissionContext {
  mission: Mission
  report: SimulationReport
  graph: CircuitGraph
}

export const initialMissionState: MissionState = {
  phase: 'briefing',
  eventLog: [],
  achieved: [],
  lastAchieved: null,
  hintsShown: 0,
  lastAnswer: null,
  completions: 0,
}

export function evaluate(state: MissionState, ctx: MissionContext): MissionEvaluation {
  return createMissionEvaluator(ctx.mission)(ctx.report, ctx.graph, state.eventLog)
}

/** Latches newly met objectives and moves building -> quiz once every circuit objective is achieved. */
function settle(state: MissionState, ctx: MissionContext): MissionState {
  const evaluation = evaluate(state, ctx)
  const newlyMet = evaluation.objectives.filter(o => o.met && !state.achieved.includes(o.id)).map(o => o.id)
  const achieved = newlyMet.length > 0 ? [...state.achieved, ...newlyMet] : state.achieved
  const circuitDone = ctx.mission.objectives.filter(o => o.category === 'circuit').every(o => achieved.includes(o.id))
  const phase: MissionPhase = state.phase === 'building' && circuitDone ? 'quiz' : state.phase
  if (achieved === state.achieved && phase === state.phase) return state
  return { ...state, achieved, phase, lastAchieved: newlyMet.length > 0 ? newlyMet[newlyMet.length - 1] : state.lastAchieved }
}

/** Objective titles still to do. Empty means the completion guard is satisfied. */
export function unmetObjectiveTitles(state: MissionState, mission: Mission): string[] {
  return mission.objectives.filter(o => !state.achieved.includes(o.id)).map(o => o.title)
}

/** R6 guard: circuit objectives AND the learning objective must all be achieved, and only from the quiz phase. */
export function canFinish(state: MissionState, mission: Mission): boolean {
  return state.phase === 'quiz' && unmetObjectiveTitles(state, mission).length === 0
}

export function missionReducer(state: MissionState, input: MissionInput, ctx: MissionContext): MissionState {
  if (input.type === 'restart') return state.phase === 'complete' ? initialMissionState : state

  switch (state.phase) {
    case 'briefing':
      return input.type === 'start' ? settle({ ...initialMissionState, phase: 'building' }, ctx) : state
    case 'complete':
      return state // absorbing: nothing can re-trigger completion
    case 'building':
    case 'quiz':
      break
  }

  switch (input.type) {
    case 'record':
      return settle({ ...state, eventLog: [...state.eventLog, input.event] }, ctx)
    case 'requestHint': {
      if (state.hintsShown >= ctx.mission.hints.length) return state
      const level = state.hintsShown + 1
      return { ...state, hintsShown: level, eventLog: [...state.eventLog, { type: 'hint_requested', level }] }
    }
    case 'answerQuiz': {
      const { quiz } = ctx.mission
      if (state.phase !== 'quiz' || !quiz.options.some(o => o.id === input.optionId)) return state
      if (state.lastAnswer?.correct) return state // already answered correctly
      const correct = input.optionId === quiz.correctOptionId
      const event: SemanticEvent = { type: 'quiz_answered', quizId: quiz.id, optionId: input.optionId }
      return settle({ ...state, eventLog: [...state.eventLog, event], lastAnswer: { optionId: input.optionId, correct } }, ctx)
    }
    case 'finish':
      return canFinish(state, ctx.mission) ? { ...state, phase: 'complete', completions: state.completions + 1 } : state
    default:
      return state
  }
}
