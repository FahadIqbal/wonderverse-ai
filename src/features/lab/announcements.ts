/** Pure: what to say when the set of lit lamps changes. Returns null when nothing changed. */
export function describeLampChange(prevLit: string[], nextLit: string[], reason: string): string | null {
  const prev = [...prevLit].sort()
  const next = [...nextLit].sort()
  if (prev.join('|') === next.join('|')) return null
  if (next.length === 0) return `${prev.join(' and ')} went dark.${reason && reason !== 'OK' ? ` ${reason}.` : ''}`
  if (prev.length === 0) return `Circuit complete: ${next.join(' and ')} ${next.length > 1 ? 'are' : 'is'} lit.`
  const nowDark = prev.filter(l => !next.includes(l))
  const nowLit = next.filter(l => !prev.includes(l))
  const parts: string[] = []
  if (nowLit.length) parts.push(`${nowLit.join(' and ')} ${nowLit.length > 1 ? 'are' : 'is'} now lit`)
  if (nowDark.length) parts.push(`${nowDark.join(' and ')} went dark`)
  return `${parts.join('. ')}. Still lit: ${next.filter(l => !nowLit.includes(l)).join(' and ') || 'none'}.`
}
