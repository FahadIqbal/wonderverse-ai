import { useEffect, useRef, useState } from 'react'

const FLASH_MS = 800

/**
 * Ids that appeared since the previous render, held for a short time so a component can highlight them.
 * The first render is never a flash, and neither is a bulk change (loading a mission, restoring a saved
 * circuit): only a small number of newly added ids count as "just connected" or "just achieved".
 * The highlight itself is state-independent of motion: callers choose whether to animate or only recolour.
 */
export function useRecentlyAdded(ids: readonly string[], maxBatch = 1): ReadonlySet<string> {
  const previous = useRef<Set<string> | null>(null)
  const [recent, setRecent] = useState<ReadonlySet<string>>(new Set())
  const key = ids.join('|')
  useEffect(() => {
    const prev = previous.current
    previous.current = new Set(ids)
    if (!prev) return
    const added = ids.filter(id => !prev.has(id))
    if (added.length === 0 || added.length > maxBatch) return
    setRecent(new Set(added))
    const t = window.setTimeout(() => setRecent(new Set()), FLASH_MS)
    return () => window.clearTimeout(t)
    // `key` is the content of `ids`; the array identity changes every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, maxBatch])
  return recent
}

/**
 * True for a moment after a new error message arrives. `signal` must be a new object per message
 * (the lab store creates one per feedback), so repeating the same rejection shakes again.
 */
export function useRejectionPulse(signal: { kind: string } | null | undefined): boolean {
  const [active, setActive] = useState(false)
  useEffect(() => {
    if (!signal || signal.kind !== 'error') return
    setActive(true)
    const t = window.setTimeout(() => setActive(false), 450)
    return () => window.clearTimeout(t)
  }, [signal])
  return active
}
