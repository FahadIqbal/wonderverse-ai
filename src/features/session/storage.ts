import { isPristine, parseSession, serializeSession, SESSION_KEY, STORAGE_PREFIX, type Session, type SessionLoadResult } from '../../domain/learning'
/** localStorage can be missing or throw (private mode, blocked cookies, quota). Every access is guarded. */
function getStorage(): Storage | null {
  try {
    return typeof window !== 'undefined' ? (window.localStorage ?? null) : null
  } catch {
    return null
  }
}
export type StorageResult = 'ok' | 'unavailable' | 'failed'
export function loadSession(): SessionLoadResult & { storage: StorageResult } {
  const storage = getStorage()
  if (!storage) return { ...parseSession(null), storage: 'unavailable' }
  try {
    return { ...parseSession(storage.getItem(SESSION_KEY)), storage: 'ok' }
  } catch {
    return { ...parseSession(null), storage: 'failed' }
  }
}
/** Writes the session, or removes the key when there is nothing to keep. */
export function saveSession(session: Session): StorageResult {
  const storage = getStorage()
  if (!storage) return 'unavailable'
  try {
    if (isPristine(session)) storage.removeItem(SESSION_KEY)
    else storage.setItem(SESSION_KEY, serializeSession(session))
    return 'ok'
  } catch {
    return 'failed'
  }
}
export function discardSavedSession(): void {
  try {
    getStorage()?.removeItem(SESSION_KEY)
  } catch {
    /* nothing more can be done */
  }
}
/** Removes every `wonderverse:` key. Returns true when none remain (or when storage does not exist). */
export function eraseAllStoredData(): boolean {
  const storage = getStorage()
  if (!storage) return true
  try {
    const keys: string[] = []
    for (let i = 0; i < storage.length; i++) {
      const k = storage.key(i)
      if (k && k.startsWith(STORAGE_PREFIX)) keys.push(k)
    }
    keys.forEach(k => storage.removeItem(k))
    for (let i = 0; i < storage.length; i++) {
      if (storage.key(i)?.startsWith(STORAGE_PREFIX)) return false
    }
    return true
  } catch {
    return false
  }
}
