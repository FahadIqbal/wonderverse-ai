import { BatteryIcon, LampIcon, SwitchIcon } from '../ui/icons'
import { primaryButton } from '../ui/styles'

/**
 * Launch portal. The starfield and glows are CSS gradients (no images, no WebGL), so the page is light and the
 * look survives with images off. The icon row is a decoration and does not depict circuit state.
 */
export function PortalHero({ onEnter }: { onEnter: () => void }) {
  return (
    <section
      aria-labelledby="portal-heading"
      className="observatory-hero mx-auto my-2 max-w-4xl rounded-[24px] border border-observatory-navy-lighter px-5 py-12 text-center shadow-[0_24px_60px_-30px_rgba(84,229,211,0.35)] md:my-6 md:px-12 md:py-20"
    >
      <span className="starfield" aria-hidden="true" />
      <p className="mx-auto mb-5 inline-flex items-center gap-2 rounded-full border border-observatory-aqua/40 bg-observatory-navy/60 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-observatory-aqua">
        Observatory Lab · Electricity
      </p>
      <h1
        id="portal-heading"
        tabIndex={-1}
        className="mb-4 text-4xl font-bold leading-tight tracking-tight text-observatory-gold outline-none md:text-5xl"
      >
        Welcome to the Electricity Lab
      </h1>
      <p className="mx-auto mb-3 max-w-xl text-lg text-slate-200">
        Build a circuit with a battery, a switch and a lamp. The simulator checks your wiring and tells you why a lamp
        lights up, or why it does not.
      </p>
      <p className="mx-auto mb-8 max-w-xl text-sm text-observatory-muted">
        A simplified DC model: ideal batteries and fixed-resistance parts, so you can see the basic rules of a circuit.
        It is not a full model of real electronics.
      </p>
      <button type="button" className={`${primaryButton} min-h-[52px] px-9 text-base`} onClick={onEnter}>
        Enter the Lab
      </button>
      <p className="mt-4 text-sm text-slate-300">
        No account or sign-in needed. For ages 10 to 14. Works with a mouse, touch or keyboard.
      </p>
      <div aria-hidden="true" className="mx-auto mt-10 flex max-w-xs items-center justify-between text-observatory-aqua">
        <BatteryIcon className="h-8 w-8" />
        <span className="mx-2 h-px flex-1 bg-gradient-to-r from-observatory-aqua/60 to-observatory-gold/60" />
        <SwitchIcon className="h-8 w-8" />
        <span className="mx-2 h-px flex-1 bg-gradient-to-r from-observatory-aqua/60 to-observatory-gold/60" />
        <LampIcon className="h-8 w-8 text-observatory-gold drop-shadow-[0_0_10px_rgba(255,211,107,0.6)]" />
      </div>
    </section>
  )
}
