import type { ConnectionValidation, TerminalId } from '../../domain/circuit'

/**
 * Pure port-selection state machine shared by every input path (schematic, 3D, list).
 * idle -> sourceSelected -> connected | rejected. Escape (cancel) returns to idle.
 * `connected` and `rejected` are resting results that behave like `idle` on the next pick.
 */
export type PortSelection =
  | { phase: 'idle' }
  | { phase: 'sourceSelected'; source: TerminalId }
  | { phase: 'connected'; from: TerminalId; to: TerminalId }
  | { phase: 'rejected'; reason: string }
  | { phase: 'cancelled' }

export type Validator = (from: TerminalId, to: TerminalId) => ConnectionValidation

export const IDLE: PortSelection = { phase: 'idle' }

/** The source terminal waiting for a partner, or null. */
export function pendingSource(state: PortSelection): TerminalId | null {
  return state.phase === 'sourceSelected' ? state.source : null
}

export function selectPort(state: PortSelection, terminalId: TerminalId, validate: Validator): PortSelection {
  if (state.phase !== 'sourceSelected') return { phase: 'sourceSelected', source: terminalId }
  if (state.source === terminalId) return { phase: 'cancelled' }
  const check = validate(state.source, terminalId)
  if (!check.isValid) return { phase: 'rejected', reason: check.reason ?? 'not allowed' }
  return { phase: 'connected', from: state.source, to: terminalId }
}

/** Escape: cancels a pending source; otherwise nothing changes. */
export function cancelSelection(state: PortSelection): PortSelection {
  return state.phase === 'sourceSelected' ? { phase: 'cancelled' } : state
}
