import { describe, expect, it } from 'vitest'
import fc from 'fast-check'
import { IDLE, cancelSelection, pendingSource, selectPort, type PortSelection } from './portSelection'

const ok = () => ({ isValid: true })
const no = () => ({ isValid: false, reason: 'nope' })

describe('portSelection', () => {
  it('idle -> sourceSelected -> connected', () => {
    const s1 = selectPort(IDLE, 'a', ok)
    expect(s1).toEqual({ phase: 'sourceSelected', source: 'a' })
    expect(selectPort(s1, 'b', ok)).toEqual({ phase: 'connected', from: 'a', to: 'b' })
  })
  it('rejects with the validator reason', () => {
    expect(selectPort({ phase: 'sourceSelected', source: 'a' }, 'b', no)).toEqual({ phase: 'rejected', reason: 'nope' })
  })
  it('picking the same port cancels', () => {
    expect(selectPort({ phase: 'sourceSelected', source: 'a' }, 'a', ok).phase).toBe('cancelled')
  })
  it('Escape cancels a pending source and is a no-op otherwise', () => {
    expect(cancelSelection({ phase: 'sourceSelected', source: 'a' }).phase).toBe('cancelled')
    expect(cancelSelection(IDLE)).toBe(IDLE)
  })
  it('property: result phases never leave a pending source, and a pick from any non-pending phase starts a source', () => {
    const phases: PortSelection[] = [
      IDLE,
      { phase: 'connected', from: 'x', to: 'y' },
      { phase: 'rejected', reason: 'r' },
      { phase: 'cancelled' },
    ]
    fc.assert(
      fc.property(fc.constantFrom(...phases), fc.string({ minLength: 1 }), fc.boolean(), (state, id, valid) => {
        const next = selectPort(state, id, valid ? ok : no)
        expect(next).toEqual({ phase: 'sourceSelected', source: id })
        const done = selectPort(next, id + '!', valid ? ok : no)
        expect(pendingSource(done)).toBeNull()
      }),
    )
  })
})
