import { z } from 'zod'
import { ReasonCode, SolverStatus } from '../../circuit'

/** Hard bounds shared by the client, the validator and the gateway. */
export const TUTOR_LIMITS = {
  maxQuestion: 200,
  maxResponse: 600,
  maxContextChars: 6000,
  maxHintLevel: 3,
} as const

const Short = z.string().max(40)

/**
 * The only data a tutor (local or remote) may see. It is built from the solver report, a graph summary,
 * objective statuses and a bounded event log. It holds no names, timestamps, free text or learner input.
 */
export const TutorContext = z
  .object({
    missionId: Short,
    missionTitle: z.string().max(60),
    phase: z.enum(['briefing', 'building', 'quiz', 'complete']),
    /** Hint level being asked for: 0 means "no ladder step yet". */
    hintLevel: z.number().int().min(0).max(TUTOR_LIMITS.maxHintLevel),
    solver: z.object({
      status: z.nativeEnum(SolverStatus),
      reasonCode: z.enum(Object.keys(ReasonCode) as [keyof typeof ReasonCode, ...(keyof typeof ReasonCode)[]]),
      reason: z.string().max(100),
      batteryVoltage: z.number().finite(),
      totalCurrent: z.number().finite(),
    }),
    counts: z.object({
      battery: z.number().int().min(0).max(999),
      lamp: z.number().int().min(0).max(999),
      switch: z.number().int().min(0).max(999),
      resistor: z.number().int().min(0).max(999),
      wire: z.number().int().min(0).max(999),
    }),
    lamps: z
      .array(z.object({ id: Short, label: Short, energized: z.boolean(), current: z.number().finite(), voltage: z.number().finite() }))
      .max(8),
    switches: z.array(z.object({ id: Short, label: Short, closed: z.boolean() })).max(8),
    objectives: z
      .array(z.object({ id: Short, title: z.string().max(80), category: z.enum(['circuit', 'learning']), met: z.boolean() }))
      .max(8),
    /** The authored mission hint for `hintLevel`, when one exists. */
    authoredHint: z.string().max(400).optional(),
    /** Compact, templated descriptions of the last few learner actions. */
    recentEvents: z.array(z.string().max(60)).max(8),
  })
  .strict()
  .refine(c => JSON.stringify(c).length <= TUTOR_LIMITS.maxContextChars, { message: 'Tutor context too large' })
export type TutorContext = z.infer<typeof TutorContext>

export const TutorQuestion = z.string().max(TUTOR_LIMITS.maxQuestion)

/** What an adapter returns. `redirect` means the question was refused or off topic and does not use up a hint. */
export const TutorResponse = z
  .object({
    text: z.string(),
    kind: z.enum(['hint', 'redirect']),
    source: z.enum(['local', 'remote']),
  })
  .strict()
export type TutorResponse = z.infer<typeof TutorResponse>

/**
 * Read-only tutor. It receives a frozen context and a plain string, and has no handle on any store.
 * Its output is untrusted until `resolveHint` has validated it.
 */
export interface TutorAdapter {
  readonly id: 'local' | 'remote'
  getHint(context: Readonly<TutorContext>, learnerQuestion?: string): Promise<TutorResponse>
}
