import { z } from 'zod'
import { CircuitGraph } from '../circuit'

/** Objective predicates read the solver report, the graph and the semantic event log, never UI clicks. */
export const ObjectivePredicate = z.discriminatedUnion('type', [
  /** A lamp (a specific one, or any) is energized in a VALID report. */
  z.object({ type: z.literal('lampEnergized'), lampId: z.string().optional() }),
  /** The learner toggled a switch and saw the lamp both lit and dark afterwards. */
  z.object({ type: z.literal('switchOutcomesObserved'), switchId: z.string().optional() }),
  /** Every lamp on the bench is energized in a VALID report, and there are at least `minLamps` lamps. */
  z.object({ type: z.literal('allLampsEnergized'), minLamps: z.number().int().min(1).default(1) }),
  /** After a learner edit, a lamp went from dark to lit (an invalid or dark circuit was repaired). */
  z.object({ type: z.literal('lampDarkToLit') }),
  /**
   * The learner opened a switch while two or more lamps were lit, and afterwards at least one lamp stayed lit
   * while at least one went dark. In the DC model this is only possible when the lamps sit on separate branches.
   */
  z.object({ type: z.literal('branchIndependence') }),
  /** The learner chose the authored correct quiz option. */
  z.object({ type: z.literal('quizCorrect'), quizId: z.string() }),
])
export type ObjectivePredicate = z.infer<typeof ObjectivePredicate>

export const ObjectiveCategory = z.enum(['circuit', 'learning'])
export type ObjectiveCategory = z.infer<typeof ObjectiveCategory>

export const Objective = z.object({
  id: z.string().min(1),
  category: ObjectiveCategory,
  title: z.string().min(1),
  predicate: ObjectivePredicate,
})
export type Objective = z.infer<typeof Objective>

export const QuizOption = z.object({
  id: z.string().min(1),
  text: z.string().min(1),
  explanation: z.string().min(1),
})
export type QuizOption = z.infer<typeof QuizOption>

export const Quiz = z.object({
  id: z.string().min(1),
  prompt: z.string().min(1),
  options: z.array(QuizOption).min(2),
  correctOptionId: z.string().min(1),
  /** The common wrong idea this question addresses, shown in the recap. Plain words, no claim about the learner. */
  misconception: z.string().min(1),
})
export type Quiz = z.infer<typeof Quiz>

export const Mission = z
  .object({
    id: z.string().min(1),
    title: z.string().min(1),
    opening: z.string().min(1),
    partsNote: z.string().min(1),
    safetyNote: z.string().min(1),
    /** Shown in place of the quiz until the circuit objectives are done. */
    quizLockedNote: z.string().min(1),
    setupGraph: CircuitGraph,
    objectives: z.array(Objective).min(1),
    /** Exactly three levels, from gentle to most specific. */
    hints: z.array(z.string().min(1)).length(3),
    quiz: Quiz,
    recap: z.object({
      built: z.string().min(1),
      observed: z.string().min(1),
      explained: z.string().min(1),
      tryNext: z.string().min(1),
    }),
  })
  .superRefine((m, ctx) => {
    const ids = m.objectives.map(o => o.id)
    if (new Set(ids).size !== ids.length) {
      ctx.addIssue({ code: 'custom', message: 'Objective ids must be unique', path: ['objectives'] })
    }
    if (!m.quiz.options.some(o => o.id === m.quiz.correctOptionId)) {
      ctx.addIssue({ code: 'custom', message: 'correctOptionId must name an option', path: ['quiz'] })
    }
    const optionIds = m.quiz.options.map(o => o.id)
    if (new Set(optionIds).size !== optionIds.length) {
      ctx.addIssue({ code: 'custom', message: 'Quiz option ids must be unique', path: ['quiz'] })
    }
    for (const o of m.objectives) {
      if (o.predicate.type === 'quizCorrect' && o.predicate.quizId !== m.quiz.id) {
        ctx.addIssue({ code: 'custom', message: `Objective ${o.id} references unknown quiz`, path: ['objectives'] })
      }
    }
    if (!m.objectives.some(o => o.category === 'circuit') || !m.objectives.some(o => o.category === 'learning')) {
      ctx.addIssue({ code: 'custom', message: 'Need at least one circuit and one learning objective', path: ['objectives'] })
    }
  })
export type Mission = z.infer<typeof Mission>

/** Semantic learner events. No timestamps, so logs are deterministic and replayable. */
export const SemanticEvent = z.discriminatedUnion('type', [
  z.object({ type: z.literal('component_added'), componentId: z.string(), componentType: z.string() }),
  z.object({ type: z.literal('component_removed'), componentId: z.string() }),
  z.object({ type: z.literal('wire_added'), wireId: z.string() }),
  z.object({ type: z.literal('wire_removed'), wireId: z.string() }),
  z.object({
    type: z.literal('switch_toggled'),
    componentId: z.string(),
    /** Switch state after the toggle (true = closed). */
    isOn: z.boolean(),
    /** Whether any lamp was energized in the report computed after the toggle. */
    lampLit: z.boolean(),
    /** Ids of lamps energized before and after the toggle, from the solver report. Absent in older logs. */
    litBefore: z.array(z.string()).optional(),
    litAfter: z.array(z.string()).optional(),
  }),
  /** The set of energized lamps changed after a graph edit (including undo/redo/reset). */
  z.object({
    type: z.literal('lamp_state_changed'),
    litBefore: z.array(z.string()),
    litAfter: z.array(z.string()),
  }),
  z.object({ type: z.literal('quiz_answered'), quizId: z.string(), optionId: z.string() }),
  z.object({ type: z.literal('hint_requested'), level: z.number().int().min(1) }),
])
export type SemanticEvent = z.infer<typeof SemanticEvent>
