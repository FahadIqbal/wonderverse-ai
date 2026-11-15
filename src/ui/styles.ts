const focus =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-observatory-gold'
const base =
  'inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold ' +
  'active:translate-y-px disabled:cursor-not-allowed disabled:opacity-40 disabled:active:translate-y-0 '
/** Primary: one per view, the main next step. */
export const primaryButton =
  base +
  'bg-observatory-aqua text-observatory-navy shadow-[0_0_0_1px_rgba(84,229,211,0.5),0_4px_18px_-6px_rgba(84,229,211,0.7)] ' +
  'hover:brightness-110 disabled:shadow-none disabled:hover:brightness-100 ' +
  focus
/** Secondary: supporting actions. */
export const secondaryButton =
  base +
  'border border-observatory-aqua/60 text-observatory-aqua hover:bg-observatory-aqua hover:text-observatory-navy ' +
  'disabled:hover:bg-transparent disabled:hover:text-observatory-aqua ' +
  focus
/** Ghost: low-emphasis actions (navigation, dismiss). */
export const ghostButton =
  base +
  'text-observatory-text hover:bg-observatory-navy-lighter ' +
  'disabled:hover:bg-transparent ' +
  focus
/** Panel surface: rounded 18px card on the midnight surface with a soft top highlight. */
export const panel =
  'rounded-[18px] border border-observatory-navy-lighter bg-observatory-navy-light p-4 shadow-[inset_0_1px_0_rgba(246,248,255,0.05),0_8px_24px_-12px_rgba(0,0,0,0.6)]'
/** Panel heading: one size and colour everywhere, with an accent bar. */
export const panelHeading =
  'mb-3 flex items-center gap-2 text-lg font-semibold text-observatory-gold before:h-4 before:w-1 before:rounded-full before:bg-observatory-gold before:content-[\'\']'
/** Status chip used by the mission map. Colours are paired with an icon and a text label, never alone. */
export const badgeBase =
  'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold'
export const badgeTone = {
  locked: 'border-observatory-navy-lighter bg-observatory-navy text-observatory-muted',
  unlocked: 'border-observatory-aqua/60 bg-observatory-aqua/10 text-observatory-aqua',
  'in-progress': 'border-observatory-gold/60 bg-observatory-gold/10 text-observatory-gold',
  completed: 'border-observatory-aqua bg-observatory-aqua/20 text-observatory-aqua',
} as const
