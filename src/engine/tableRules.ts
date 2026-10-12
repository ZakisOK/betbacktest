/**
 * Table Rules — how a winning Banker bet is paid, and the exact EV of each bet
 *
 * Every ruleset here is one a real table deals, and every one keeps the house
 * edge. src/engine/tableRules.test.ts pins each Banker EV below zero.
 */

import type { BetSide, HandOutcome, TableRules } from "../types";
import { bankerDraws, isNatural, playerDraws } from "./baccarat";

export const TABLE_RULES: Record<TableRules, { label: string; bankerRule: string }> = {
  commission_5: { label: "Standard", bankerRule: "5% commission on Banker wins" },
  commission_4: { label: "4% commission", bankerRule: "4% commission on Banker wins" },
  ez_baccarat: {
    label: "EZ Baccarat",
    bankerRule: "No commission; a Banker win on a three-card 7 pushes",
  },
  super_6: { label: "Super 6", bankerRule: "No commission; a Banker win on 6 pays 1:2" },
};

export const TABLE_RULE_IDS = Object.keys(TABLE_RULES) as TableRules[];

/** The parts of a dealt hand that decide how a bet settles. */
export interface ResolvedHand {
  outcome: HandOutcome;
  bankerValue: number;
  bankerCardCount: number;
}

function handOutcome(playerValue: number, bankerValue: number): HandOutcome {
  if (playerValue === bankerValue) return "Tie";
  return bankerValue > playerValue ? "Banker" : "Player";
}

/** Units paid per unit staked on a winning Banker bet; 0 means the bet pushes. */
export function bankerWinPayout(rules: TableRules, hand: ResolvedHand): number {
  switch (rules) {
    case "commission_5":
      return 0.95;
    case "commission_4":
      return 0.96;
    case "ez_baccarat":
      return hand.bankerValue === 7 && hand.bankerCardCount === 3 ? 0 : 1;
    case "super_6":
      return hand.bankerValue === 6 ? 0.5 : 1;
  }
}

/** Net result of one bet: positive on a win, 0 on a push, negative on a loss. */
export function settleBet(
  side: BetSide,
  amount: number,
  hand: ResolvedHand,
  rules: TableRules,
  tieHandling: "push" | "lose"
): number {
  if (side === hand.outcome) {
    if (side === "Tie") return amount * 8;
    if (side === "Banker") return amount * bankerWinPayout(rules, hand);
    return amount;
  }
  if (hand.outcome === "Tie" && tieHandling === "push") return 0;
  return -amount;
}

// ────────────────────────────────────────────────────────────
// Exact Expected Value
// ────────────────────────────────────────────────────────────

export interface WeightedHand {
  hand: ResolvedHand;
  probability: number;
}

const distributionCache = new Map<6 | 8, WeightedHand[]>();

/**
 * Every distinct settled hand and its exact probability off the top of a full
 * shoe, enumerated card by card without replacement through the same
 * third-card rules dealHand uses.
 */
export function handDistribution(deckCount: 6 | 8): WeightedHand[] {
  const cached = distributionCache.get(deckCount);
  if (cached) return cached;

  // Ten-valued cards (10, J, Q, K) all count as 0, so value 0 has 16 per deck.
  const counts = Array.from({ length: 10 }, (_, value) => (value === 0 ? 16 : 4) * deckCount);
  let remaining = 52 * deckCount;
  const byKey = new Map<string, WeightedHand>();

  const draw = (next: (value: number, probability: number) => void): void => {
    for (let value = 0; value < 10; value++) {
      if (counts[value] === 0) continue;
      const probability = counts[value] / remaining;
      counts[value]--;
      remaining--;
      next(value, probability);
      counts[value]++;
      remaining++;
    }
  };

  const record = (
    playerValue: number,
    bankerValue: number,
    bankerCardCount: number,
    probability: number
  ): void => {
    const outcome = handOutcome(playerValue, bankerValue);
    const key = `${outcome}:${bankerValue}:${bankerCardCount}`;
    const entry = byKey.get(key);
    if (entry) entry.probability += probability;
    else byKey.set(key, { hand: { outcome, bankerValue, bankerCardCount }, probability });
  };

  const bankerTurn = (
    playerValue: number,
    bankerValue: number,
    playerThirdCard: number | null,
    probability: number
  ): void => {
    if (!bankerDraws(bankerValue, playerThirdCard)) {
      record(playerValue, bankerValue, 2, probability);
      return;
    }
    draw((card, p) => record(playerValue, (bankerValue + card) % 10, 3, probability * p));
  };

  // Two cards off the shoe, still without replacement: their total and joint probability
  const drawPair = (next: (total: number, probability: number) => void): void =>
    draw((first, w1) => draw((second, w2) => next((first + second) % 10, w1 * w2)));

  const playOpening = (playerValue: number, bankerValue: number, probability: number): void => {
    if (isNatural(playerValue) || isNatural(bankerValue)) {
      record(playerValue, bankerValue, 2, probability);
    } else if (playerDraws(playerValue)) {
      draw((card, p) => bankerTurn((playerValue + card) % 10, bankerValue, card, probability * p));
    } else {
      bankerTurn(playerValue, bankerValue, null, probability);
    }
  };

  drawPair((playerValue, wp) =>
    drawPair((bankerValue, wb) => playOpening(playerValue, bankerValue, wp * wb))
  );

  const distribution = [...byKey.values()];
  distributionCache.set(deckCount, distribution);
  return distribution;
}

/** Exact long-run return per unit staked on one side under the given table rules. */
export function expectedValue(
  side: BetSide,
  rules: TableRules,
  deckCount: 6 | 8,
  tieHandling: "push" | "lose" = "push"
): number {
  return handDistribution(deckCount).reduce(
    (ev, { hand, probability }) => ev + probability * settleBet(side, 1, hand, rules, tieHandling),
    0
  );
}
