/**
 * Baccarat Game Engine
 *
 * Implements correct Baccarat dealing rules for 6/8-deck shoes.
 * Verified against published probability tables:
 *   Banker win: 45.86%  Player win: 44.62%  Tie: 9.52%
 */

// ────────────────────────────────────────────────────────────
// Seeded PRNG (Mulberry32) — reproducible results
// ────────────────────────────────────────────────────────────

export function mulberry32(seed: number) {
  return function (): number {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// ────────────────────────────────────────────────────────────
// Shoe Generation
// ────────────────────────────────────────────────────────────

/**
 * Returns the Baccarat point value of a card (0-indexed, 0-51 per deck).
 * Values: A=1, 2-9=face, 10/J/Q/K=0
 */
export function cardValue(card: number): number {
  const rank = card % 13 // 0=Ace, 1-8=2-9, 9=10, 10=J, 11=Q, 12=K
  return rank >= 9 ? 0 : rank + 1
}

/**
 * Generates a shuffled shoe of numDecks * 52 cards.
 */
export function generateShoe(numDecks: 6 | 8, rng: () => number): number[] {
  const shoe: number[] = []
  for (let d = 0; d < numDecks; d++) {
    for (let c = 0; c < 52; c++) {
      shoe.push(c)
    }
  }
  // Fisher-Yates shuffle
  for (let i = shoe.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    const tmp = shoe[i]
    shoe[i] = shoe[j]
    shoe[j] = tmp
  }
  return shoe
}

// ────────────────────────────────────────────────────────────
// Hand Evaluation
// ────────────────────────────────────────────────────────────

/** Sum of card values mod 10 */
export function handValue(cards: number[]): number {
  return cards.reduce((sum, c) => sum + cardValue(c), 0) % 10
}

export function isNatural(value: number): boolean {
  return value === 8 || value === 9
}

// ────────────────────────────────────────────────────────────
// Third-Card Rules
// ────────────────────────────────────────────────────────────

/** Player draws a third card if their total is 0-5 */
export function playerDraws(playerValue: number): boolean {
  return playerValue <= 5
}

/**
 * Banker third-card rule — official Baccarat table
 *
 * When Player stood (no third card): Banker draws on 0-5, stands on 6-7
 * When Player drew third card: use the table below
 *
 * Banker value | Draws when Player's 3rd card is:
 *      0-2     | always draws
 *        3     | 0,1,2,3,4,5,6,7,9 (not 8)
 *        4     | 2,3,4,5,6,7
 *        5     | 4,5,6,7
 *        6     | 6,7
 *        7     | never draws
 */
export function bankerDraws(
  bankerValue: number,
  playerThirdCardValue: number | null
): boolean {
  if (bankerValue >= 7) return false
  if (playerThirdCardValue === null) {
    // Player stood — banker draws 0-5
    return bankerValue <= 5
  }
  switch (bankerValue) {
    case 0:
    case 1:
    case 2:
      return true
    case 3:
      return playerThirdCardValue !== 8
    case 4:
      return playerThirdCardValue >= 2 && playerThirdCardValue <= 7
    case 5:
      return playerThirdCardValue >= 4 && playerThirdCardValue <= 7
    case 6:
      return playerThirdCardValue === 6 || playerThirdCardValue === 7
    default:
      return false
  }
}

// ────────────────────────────────────────────────────────────
// Deal a Single Hand
// ────────────────────────────────────────────────────────────

export type HandOutcome = 'Banker' | 'Player' | 'Tie'

export interface DealtHand {
  playerCards: number[]
  bankerCards: number[]
  playerValue: number
  bankerValue: number
  outcome: HandOutcome
  isNatural: boolean
  cardsUsed: number
}

/**
 * Deals a complete Baccarat hand from the shoe array (mutates shoe by splice).
 * shoe is dealt from the front (index 0 = next card).
 */
export function dealHand(shoe: number[]): DealtHand {
  const draw = () => {
    if (shoe.length === 0) throw new Error('Shoe exhausted')
    return shoe.shift()!
  }

  // Initial deal: P B P B
  const playerCards: number[] = [draw(), draw()]
  const bankerCards: number[] = [draw(), draw()]

  let playerVal = handValue(playerCards)
  let bankerVal = handValue(bankerCards)
  let isNat = false

  // Check for naturals (8 or 9) — no third card drawn
  if (isNatural(playerVal) || isNatural(bankerVal)) {
    isNat = true
  } else {
    // Player third card
    let playerThirdCardValue: number | null = null
    if (playerDraws(playerVal)) {
      const thirdCard = draw()
      playerCards.push(thirdCard)
      playerVal = handValue(playerCards)
      playerThirdCardValue = cardValue(thirdCard)
    }

    // Banker third card
    if (bankerDraws(bankerVal, playerThirdCardValue)) {
      bankerCards.push(draw())
      bankerVal = handValue(bankerCards)
    }
  }

  const outcome: HandOutcome =
    playerVal === bankerVal ? 'Tie' : bankerVal > playerVal ? 'Banker' : 'Player'

  return {
    playerCards,
    bankerCards,
    playerValue: playerVal,
    bankerValue: bankerVal,
    outcome,
    isNatural: isNat,
    cardsUsed: playerCards.length + bankerCards.length,
  }
}
