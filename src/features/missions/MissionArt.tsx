/**
 * Decorative illustrations for the mission cards. They show the idea of each mission (a loop, a broken loop, two
 * branches). They are static drawings, not simulation output, so nothing here lights up or reflects circuit state.
 */
const AQUA = 'var(--color-aqua)'
const GOLD = 'var(--color-gold)'
const MUTED = 'var(--color-muted)'

function Battery({ x, y }: { x: number; y: number }) {
  return (
    <g stroke={AQUA} strokeWidth={2.5}>
      <path d={`M ${x - 5} ${y - 9} v 18 M ${x + 5} ${y - 5} v 10`} />
    </g>
  )
}
function Lamp({ x, y }: { x: number; y: number }) {
  return (
    <g stroke={GOLD} strokeWidth={2.5} fill="var(--color-navy)">
      <circle cx={x} cy={y} r={9} />
      <path d={`M ${x - 5} ${y - 5} l 10 10 M ${x + 5} ${y - 5} l -10 10`} strokeWidth={2} />
    </g>
  )
}
function Switch({ x, y, closed }: { x: number; y: number; closed: boolean }) {
  return (
    <g stroke={AQUA} strokeWidth={2.5} fill="var(--color-navy)">
      <circle cx={x - 8} cy={y} r={2.5} />
      <circle cx={x + 8} cy={y} r={2.5} />
      <path d={closed ? `M ${x - 8} ${y} H ${x + 8}` : `M ${x - 8} ${y} L ${x + 6} ${y - 9}`} fill="none" />
    </g>
  )
}

export function MissionArt({ index }: { index: number }) {
  return (
    <svg viewBox="0 0 160 84" className="h-auto w-full" aria-hidden="true" focusable="false">
      <rect x="1" y="1" width="158" height="82" rx="14" fill="var(--color-navy)" stroke="var(--color-navy-lighter)" />
      <g fill="none" stroke={MUTED} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        {index === 0 && <path d="M 30 42 V 20 H 130 V 64 H 30 Z" />}
        {index === 1 && (
          <>
            <path d="M 30 42 V 20 H 100 M 112 20 H 130 V 64 H 30 V 42" />
            <path d="M 100 20 L 112 20" strokeDasharray="2 4" stroke={GOLD} />
          </>
        )}
        {index >= 2 && (
          <>
            <path d="M 30 42 V 16 H 130 V 68 H 30 Z" />
            <path d="M 80 16 V 68" />
          </>
        )}
      </g>
      {index === 0 && (
        <>
          <Battery x={30} y={42} />
          <Switch x={80} y={20} closed />
          <Lamp x={130} y={42} />
        </>
      )}
      {index === 1 && (
        <>
          <Battery x={30} y={42} />
          <Lamp x={130} y={42} />
          <text x="106" y="14" fill={GOLD} fontSize="12" fontWeight="700" textAnchor="middle">?</text>
        </>
      )}
      {index >= 2 && (
        <>
          <Battery x={30} y={42} />
          <Lamp x={105} y={16} />
          <Lamp x={105} y={68} />
          <Switch x={55} y={16} closed />
          <Switch x={55} y={68} closed />
        </>
      )}
    </svg>
  )
}
