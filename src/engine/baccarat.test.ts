import { describe, expect, it } from 'vitest'
import { generateShoe, mulberry32 } from './baccarat'

function countCards(shoe: number[]): number[] {
  const counts = new Array(52).fill(0)
  for (const card of shoe) counts[card]++
  return counts
}

describe('generateShoe', () => {
  for (const numDecks of [6, 8] as const) {
    it(`deals a full ${numDecks}-deck shoe with every card exactly ${numDecks} times`, () => {
      const shoe = generateShoe(numDecks, mulberry32(42))
      expect(shoe).toHaveLength(numDecks * 52)
      expect(countCards(shoe)).toEqual(new Array(52).fill(numDecks))
    })
  }

  it('returns the same order for the same seed', () => {
    expect(generateShoe(8, mulberry32(7))).toEqual(generateShoe(8, mulberry32(7)))
  })

  it('changes the order but not the composition across seeds', () => {
    const a = generateShoe(8, mulberry32(42))
    const b = generateShoe(8, mulberry32(7))
    expect(a).not.toEqual(b)
    expect(countCards(a)).toEqual(countCards(b))
  })
})
