import { describe, it, expect } from 'vitest'
import { chunk, unique, flatten, compact, groupBy } from '@/lib/utils/array'

describe('chunk', () => {
  it('splits array into equal chunks', () => {
    expect(chunk([1, 2, 3, 4], 2)).toEqual([[1, 2], [3, 4]])
  })
  it('puts remainder in last chunk', () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]])
  })
  it('returns empty array for empty input', () => {
    expect(chunk([], 3)).toEqual([])
  })
  it('returns single chunk when size >= array length', () => {
    expect(chunk([1, 2], 5)).toEqual([[1, 2]])
  })
})

describe('unique', () => {
  it('removes duplicate primitives', () => {
    expect(unique([1, 2, 2, 3, 1])).toEqual([1, 2, 3])
  })
  it('removes duplicate strings', () => {
    expect(unique(['a', 'b', 'a'])).toEqual(['a', 'b'])
  })
  it('returns empty array for empty input', () => {
    expect(unique([])).toEqual([])
  })
  it('leaves array with all unique values unchanged', () => {
    expect(unique([1, 2, 3])).toEqual([1, 2, 3])
  })
})

describe('flatten', () => {
  it('flattens one level of nested arrays', () => {
    expect(flatten([[1, 2], [3, 4]])).toEqual([1, 2, 3, 4])
  })
  it('returns empty array for empty input', () => {
    expect(flatten([])).toEqual([])
  })
  it('handles arrays containing empty sub-arrays', () => {
    expect(flatten([[1], [], [2, 3]])).toEqual([1, 2, 3])
  })
})

describe('compact', () => {
  it('removes null and undefined values', () => {
    expect(compact([1, null, 2, undefined, 3])).toEqual([1, 2, 3])
  })
  it('keeps falsy non-null values like 0 and empty string', () => {
    expect(compact([0, '', false, null, undefined])).toEqual([0, '', false])
  })
  it('returns empty array for all-null input', () => {
    expect(compact([null, undefined])).toEqual([])
  })
})

describe('groupBy', () => {
  const items = [
    { type: 'a', value: 1 },
    { type: 'b', value: 2 },
    { type: 'a', value: 3 },
  ]

  it('groups items by a key', () => {
    const result = groupBy(items, 'type')
    expect(result['a']).toEqual([{ type: 'a', value: 1 }, { type: 'a', value: 3 }])
    expect(result['b']).toEqual([{ type: 'b', value: 2 }])
  })
  it('returns empty object for empty array', () => {
    expect(groupBy([], 'type')).toEqual({})
  })
  it('handles single-group case', () => {
    const result = groupBy([{ type: 'x', value: 1 }], 'type')
    expect(result['x']).toHaveLength(1)
  })
})
