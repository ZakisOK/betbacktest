import { describe, expect, it } from "vitest";
import type { HandOutcome, SimulationConfig, Strategy, TableRules } from "../types";
import { runSimulation } from "./simulator";
import { expectedValue, handDistribution, TABLE_RULE_IDS } from "./tableRules";

const DECK_COUNTS = [6, 8] as const;
const TIE_HANDLING = ["push", "lose"] as const;

// The figures in harness/docs/glossary.md, 8 decks, ties push.
const GLOSSARY_BANKER_EV: Record<TableRules, number> = {
  commission_5: -0.0106,
  commission_4: -0.006,
  ez_baccarat: -0.0102,
  super_6: -0.0146,
};

function outcomeProbabilities(deckCount: 6 | 8): Record<HandOutcome, number> {
  const totals: Record<HandOutcome, number> = { Banker: 0, Player: 0, Tie: 0 };
  for (const { hand, probability } of handDistribution(deckCount)) {
    totals[hand.outcome] += probability;
  }
  return totals;
}

describe("exact hand distribution", () => {
  it("matches the published 8-deck outcome probabilities", () => {
    const p = outcomeProbabilities(8);
    expect(p.Banker).toBeCloseTo(0.458597, 6);
    expect(p.Player).toBeCloseTo(0.446247, 6);
    expect(p.Tie).toBeCloseTo(0.095156, 6);
  });

  it("matches the published 6-deck outcome probabilities", () => {
    const p = outcomeProbabilities(6);
    expect(p.Banker).toBeCloseTo(0.458653, 6);
    expect(p.Player).toBeCloseTo(0.446279, 6);
    expect(p.Tie).toBeCloseTo(0.095069, 6);
  });
});

describe("every allowed table setting keeps the house edge", () => {
  const settings = TABLE_RULE_IDS.flatMap((rules) =>
    DECK_COUNTS.flatMap((decks) => TIE_HANDLING.map((ties) => ({ rules, decks, ties })))
  );

  it("offers exactly the four real-table rulesets", () => {
    expect([...TABLE_RULE_IDS].sort()).toEqual(
      ["commission_4", "commission_5", "ez_baccarat", "super_6"].sort()
    );
  });

  it.each(settings)(
    "Banker EV is negative: $rules, $decks decks, ties $ties",
    ({ rules, decks, ties }) => {
      expect(expectedValue("Banker", rules, decks, ties)).toBeLessThan(0);
    }
  );

  it.each(settings)(
    "Player and Tie EV are negative: $rules, $decks decks, ties $ties",
    ({ rules, decks, ties }) => {
      expect(expectedValue("Player", rules, decks, ties)).toBeLessThan(0);
      expect(expectedValue("Tie", rules, decks, ties)).toBeLessThan(0);
    }
  );

  it.each(TABLE_RULE_IDS)("Banker EV under %s matches the glossary", (rules) => {
    expect(expectedValue("Banker", rules, 8)).toBeCloseTo(GLOSSARY_BANKER_EV[rules], 4);
  });

  it.each(TABLE_RULE_IDS)("Player and Tie EV under %s match the glossary", (rules) => {
    expect(expectedValue("Player", rules, 8)).toBeCloseTo(-0.0124, 4);
    expect(expectedValue("Tie", rules, 8)).toBeCloseTo(-0.1436, 4);
  });
});

describe("simulator applies the table rules", () => {
  const UNIT = 10;

  const flatBanker: Strategy = {
    id: "flat-banker",
    name: "Flat Banker",
    version: "1.0",
    base_unit: UNIT,
    bankroll: 1e9,
    rules: [
      {
        id: "every-hand",
        priority: 1,
        enabled: true,
        label: "Bet Banker every hand",
        trigger: { type: "hand_count", hand_min: 0 },
        action: { type: "place_bet", side: "Banker", unit_size: 1 },
        modifiers: {},
      },
    ],
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
  };

  const config = (table_rules: TableRules): SimulationConfig => ({
    num_shoes: 1000,
    hands_per_shoe: 70,
    deck_count: 8,
    table_rules,
    shuffle_type: "perfect",
    cut_card_position: 14,
    tie_handling: "push",
    starting_bankroll: 1e9,
    random_seed: 20261012,
  });

  async function bankerWins(rules: TableRules) {
    const results = await runSimulation(flatBanker, config(rules), () => {});
    return results.shoes.flatMap((s) => s.hands).filter((h) => h.outcome === "Banker");
  }

  it("deals outcomes at the exact 8-deck frequencies", async () => {
    const results = await runSimulation(flatBanker, config("commission_5"), () => {});
    const hands = results.shoes.flatMap((s) => s.hands);
    const exact = outcomeProbabilities(8);
    for (const outcome of ["Banker", "Player", "Tie"] as const) {
      const observed = hands.filter((h) => h.outcome === outcome).length / hands.length;
      expect(Math.abs(observed - exact[outcome])).toBeLessThan(0.01);
    }
  });

  it("pays a 5% commission on every Banker win under standard rules", async () => {
    for (const hand of await bankerWins("commission_5")) expect(hand.pnl).toBeCloseTo(9.5, 9);
  });

  it("pays a 4% commission on every Banker win under 4% rules", async () => {
    for (const hand of await bankerWins("commission_4")) expect(hand.pnl).toBeCloseTo(9.6, 9);
  });

  it("pays Banker wins on 6 at 1:2 under Super 6 rules", async () => {
    for (const hand of await bankerWins("super_6")) {
      expect(hand.pnl).toBe(hand.banker_value === 6 ? UNIT / 2 : UNIT);
    }
  });

  it("pushes some Banker wins on 7 and pays every other Banker win in full under EZ rules", async () => {
    const wins = await bankerWins("ez_baccarat");
    for (const hand of wins.filter((h) => h.banker_value !== 7)) expect(hand.pnl).toBe(UNIT);
    const onSeven = wins.filter((h) => h.banker_value === 7).map((h) => h.pnl);
    expect(onSeven).toContain(0);
    expect(onSeven).toContain(UNIT);
    expect(onSeven.every((pnl) => pnl === 0 || pnl === UNIT)).toBe(true);
  });
});
