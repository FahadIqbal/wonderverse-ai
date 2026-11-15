import { isLampIlluminated, ReasonCode, type CircuitGraph, type SimulationReport } from '../../circuit'
import { getMission } from '../missions'
import type { SemanticEvent } from '../schemas'
import { TUTOR_LIMITS, TutorContext } from './schemas'

export interface TutorContextInput {
  missionId: string
  report: SimulationReport
  graph: CircuitGraph
  objectives: ReadonlyArray<{ id: string; title: string; category: 'circuit' | 'learning'; met: boolean }>
  phase: TutorContext['phase']
  hintLevel: number
  events: readonly SemanticEvent[]
}

const round3 = (n: number) => (Number.isFinite(n) ? Math.round(n * 1000) / 1000 : 0)
const clip = (s: string, n: number) => s.slice(0, n)
/** Keeps ids and labels to plain characters so a context never carries markup. */
const plain = (s: string, n: number) => clip(s.replace(/[^\w\s.,:+\-Ω]/g, '').trim(), n)
const clampCount = (n: number) => Math.min(n, 999)

function describeEvent(e: SemanticEvent): string {
  switch (e.type) {
    case 'component_added':
      return plain(`added a ${e.componentType}`, 60)
    case 'component_removed':
      return 'removed a part'
    case 'wire_added':
      return 'added a wire'
    case 'wire_removed':
      return 'removed a wire'
    case 'switch_toggled':
      return plain(`${e.isOn ? 'closed' : 'opened'} ${e.componentId}, lamp ${e.lampLit ? 'lit' : 'dark'}`, 60)
    case 'lamp_state_changed':
      return `lamps lit changed from ${e.litBefore.length} to ${e.litAfter.length}`
    case 'quiz_answered':
      return 'answered the concept question'
    case 'hint_requested':
      return `asked for hint ${e.level}`
  }
}

/**
 * Pure. Builds the bounded, validated tutor context from the report and a few read-only summaries.
 * Values are rounded to 3 decimals so the numbers a tutor may quote are exactly the numbers in the context.
 */
export function buildTutorContext(input: TutorContextInput): TutorContext {
  const { report, graph } = input
  const mission = getMission(input.missionId)
  const level = Math.min(Math.max(Math.trunc(input.hintLevel) || 0, 0), TUTOR_LIMITS.maxHintLevel)
  const count = (type: string) => clampCount(graph.components.filter(c => c.type === type).length)
  const resultOf = (id: string) => report.componentResults.find(r => r.componentId === id)
  const reasonCode = (Object.keys(ReasonCode) as (keyof typeof ReasonCode)[]).find(k => ReasonCode[k] === report.reason) ?? 'UNKNOWN'
  const label = (c: { id: string; label?: string }) => plain(c.label ?? c.id, 40) || plain(c.id, 40)
  const authored = level > 0 ? mission?.hints[level - 1] : undefined

  return TutorContext.parse({
    missionId: plain(input.missionId, 40),
    missionTitle: plain(mission?.title ?? 'Circuit lab', 60),
    phase: input.phase,
    hintLevel: level,
    solver: {
      status: report.status,
      reasonCode,
      reason: clip(report.reason, 100),
      batteryVoltage: round3(report.batteryVoltage),
      totalCurrent: round3(Math.abs(report.totalCurrent)),
    },
    counts: {
      battery: count('battery'),
      lamp: count('lamp'),
      switch: count('switch'),
      resistor: count('resistor'),
      wire: clampCount(graph.wires.length),
    },
    lamps: graph.components
      .filter(c => c.type === 'lamp')
      .slice(0, 8)
      .map(c => ({
        id: plain(c.id, 40),
        label: label(c),
        energized: isLampIlluminated(report, c.id),
        current: round3(Math.abs(resultOf(c.id)?.current ?? 0)),
        voltage: round3(Math.abs(resultOf(c.id)?.voltage ?? 0)),
      })),
    switches: graph.components
      .filter(c => c.type === 'switch')
      .slice(0, 8)
      .map(c => ({ id: plain(c.id, 40), label: label(c), closed: c.isOn })),
    objectives: input.objectives.slice(0, 8).map(o => ({ id: plain(o.id, 40), title: clip(o.title, 80), category: o.category, met: o.met })),
    ...(authored ? { authoredHint: clip(authored, 400) } : {}),
    recentEvents: input.events.slice(-8).map(describeEvent),
  })
}
