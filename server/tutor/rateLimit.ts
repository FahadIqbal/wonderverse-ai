import { LIMITS } from './config'

export interface RateLimiter {
  /** Records a hit for `key` and returns whether it is within the limit. */
  allow(key: string): boolean
}

/**
 * Sliding-window limiter held in this function instance's memory. Best effort only: Vercel may run several
 * instances and recycles them, so each instance counts on its own and the count resets on a cold start.
 * It blunts a single noisy client; it is not a billing guard. Set a spend limit with the model provider too.
 */
export function createRateLimiter(limit: number, windowMs: number, now: () => number = Date.now, maxKeys: number = LIMITS.maxRateKeys): RateLimiter {
  const hits = new Map<string, number[]>()
  return {
    allow(key) {
      const t = now()
      const recent = (hits.get(key) ?? []).filter(h => t - h < windowMs)
      if (recent.length >= limit) {
        hits.set(key, recent)
        return false
      }
      recent.push(t)
      hits.delete(key) // re-insert so the Map keeps least recently used keys first
      hits.set(key, recent)
      if (hits.size > maxKeys) {
        for (const [k, v] of hits) if (v.every(h => t - h >= windowMs)) hits.delete(k)
        while (hits.size > maxKeys) hits.delete(hits.keys().next().value as string)
      }
      return true
    },
  }
}
