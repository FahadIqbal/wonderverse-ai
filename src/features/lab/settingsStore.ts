import { create } from 'zustand'

export interface SettingsState {
  /** Low-power mode: disables decorative animation. */
  lowPower: boolean
  setLowPower: (v: boolean) => void
  /** The first-visit tour has been finished or skipped. Persisted in the session. */
  tourSeen: boolean
  setTourSeen: (v: boolean) => void
}

export const useSettingsStore = create<SettingsState>(set => ({
  lowPower: false,
  setLowPower: lowPower => set({ lowPower }),
  tourSeen: false,
  setTourSeen: tourSeen => set({ tourSeen }),
}))

/** Pure rule: decorative current-flow animation runs only when neither setting forbids it. */
export function shouldAnimateFlow(reducedMotion: boolean, lowPower: boolean): boolean {
  return !reducedMotion && !lowPower
}
