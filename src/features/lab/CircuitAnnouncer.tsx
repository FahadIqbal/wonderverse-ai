import { useEffect, useRef, useState } from 'react'
import { describeLampChange } from './announcements'
import { useLabStore } from './labStore'
import { useSimulationReport } from './useSimulationReport'

const SETTLE_MS = 400

/**
 * Visually hidden polite live region that announces when lamps light or go dark, from the simulation report only.
 * Throttled: a burst of edits is announced once, after the circuit settles. Silent on first render. docs/14.
 */
export function CircuitAnnouncer() {
  const graph = useLabStore(s => s.graph)
  const report = useSimulationReport()
  const [message, setMessage] = useState('')
  const announced = useRef<string[] | null>(null)

  useEffect(() => {
    const lit = graph.components
      .filter(c => c.type === 'lamp' && report.componentResults.find(r => r.componentId === c.id)?.isEnergized)
      .map(c => c.label ?? c.id)
    if (announced.current === null) {
      announced.current = lit
      return
    }
    const timer = setTimeout(() => {
      const text = describeLampChange(announced.current ?? [], lit, report.reason ?? '')
      announced.current = lit
      if (text) setMessage(text)
    }, SETTLE_MS)
    return () => clearTimeout(timer)
  }, [graph, report])

  return (
    <div role="status" aria-live="polite" data-testid="circuit-announcer" className="sr-only">
      {message}
    </div>
  )
}
