import { create } from 'zustand'
import type { SessionLoadOutcome } from '../../domain/learning'
import type { StorageResult } from './storage'
interface SessionStatus {
  /** What happened when the saved session was read at startup. */
  loadOutcome: SessionLoadOutcome
  /** Whether the last read/write to browser storage worked. */
  storage: StorageResult
  /** Result of the most recent Erase my progress, shown once. */
  eraseResult: 'none' | 'done' | 'failed'
  dismissEraseResult: () => void
}
export const useSessionStatus = create<SessionStatus>(set => ({
  loadOutcome: 'empty',
  storage: 'ok',
  eraseResult: 'none',
  dismissEraseResult: () => set({ eraseResult: 'none' }),
}))
