import { useId, useState, type ReactNode } from 'react'
import { ChevronIcon } from './icons'
interface Props {
  /** Visible label of the toggle bar. Shown only below the breakpoint. */
  title: string
  /** Starts open on small screens. Above the breakpoint the content is always visible and the bar is hidden. */
  defaultOpen?: boolean
  /** Screen width at which the content stops collapsing. */
  breakpoint?: 'sm' | 'lg'
  className?: string
  children: ReactNode
}
// Full class names (not built from the prop) so Tailwind can see them.
const BAR = { sm: 'sm:hidden', lg: 'lg:hidden' } as const
const HIDE = { sm: 'max-sm:hidden', lg: 'max-lg:hidden' } as const
const FLAT = { sm: 'sm:mt-0', lg: 'lg:mt-0' } as const
/**
 * A section that can be folded away on a phone and is always open on larger screens. The toggle is a real button with
 * aria-expanded. Closed content is display:none, so it leaves the tab order and the accessibility tree.
 */
export function Collapsible({ title, defaultOpen = false, breakpoint = 'sm', className, children }: Props) {
  const [open, setOpen] = useState(defaultOpen)
  const id = useId()
  return (
    <div className={className}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen(o => !o)}
        className={`${BAR[breakpoint]} flex min-h-[44px] w-full items-center justify-between gap-2 rounded-lg border border-observatory-navy-lighter bg-observatory-navy-light px-3 py-2 text-left text-sm font-semibold text-observatory-aqua focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-observatory-gold`}
      >
        {title}
        <ChevronIcon className={`h-5 w-5 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      <div id={id} className={`${open ? 'mt-2' : HIDE[breakpoint]} ${FLAT[breakpoint]}`}>
        {children}
      </div>
    </div>
  )
}
