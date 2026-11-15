import { create } from 'zustand'

export interface SettingsState {
  /** Low-power mode: disables decorative animation. */
  lowPower: boolean
  setLowPower: (v: boolean) => void
}

export const useSettingsStore = create<SettingsState>(set => ({
  lowPower: false,
  setLowPower: lowPower => set({ lowPower }),
}))

/** Pure rule: decorative current-flow animation runs only when neither setting forbids it. */
export function shouldAnimateFlow(reducedMotion: boolean, lowPower: boolean): boolean {
  return !reducedMotion && !lowPower
}
