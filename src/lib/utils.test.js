import { describe, it, expect } from 'vitest'
import { shuffleArray } from './utils'

describe('shuffleArray', () => {
  const input = [1, 2, 3, 4, 5, 6, 7, 8]

  it('keeps the same length', () => {
    expect(shuffleArray(input)).toHaveLength(input.length)
  })

  it('keeps the same elements', () => {
    expect([...shuffleArray(input)].sort((a, b) => a - b)).toEqual(input)
  })

  it('does not mutate the input array', () => {
    const copy = [...input]
    shuffleArray(copy)
    expect(copy).toEqual(input)
  })
})
