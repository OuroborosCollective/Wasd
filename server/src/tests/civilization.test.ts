import { describe, it, expect, beforeEach } from "vitest";
import { KingdomLedger } from "../modules/civilization/KingdomLedger.js";
import { CivilizationRankings } from "../modules/civilization/CivilizationRankings.js";

// ---------------------------------------------------------------------------
// KingdomLedger
// ---------------------------------------------------------------------------
describe("KingdomLedger", () => {
  let ledger: KingdomLedger;

  beforeEach(() => { ledger = new KingdomLedger(); });

  it("starts with no entries", () => {
    expect(ledger.all()).toHaveLength(0);
  });

  it("record() returns the entry data", () => {
    const entry = { type: "tax", amount: 1000 };
    const result = ledger.record(entry);
    expect(result).toMatchObject(entry);
  });

  it("record() adds entry to the ledger", () => {
    ledger.record({ type: "tribute", amount: 500 });
    expect(ledger.all()).toHaveLength(1);
  });

  it("record() attaches a timestamp to each entry", () => {
    const before = Date.now();
    ledger.record({ type: "trade" });
    const after = Date.now();
    const entry = ledger.all()[0];
    expect(entry.ts).toBeGreaterThanOrEqual(before);
    expect(entry.ts).toBeLessThanOrEqual(after);
  });

  it("multiple records are preserved in order", () => {
    ledger.record({ type: "a" });
    ledger.record({ type: "b" });
    ledger.record({ type: "c" });
    const types = ledger.all().map((e: any) => e.type);
    expect(types).toEqual(["a", "b", "c"]);
  });
});

// ---------------------------------------------------------------------------
// CivilizationRankings
// ---------------------------------------------------------------------------
describe("CivilizationRankings", () => {
  let rankings: CivilizationRankings;

  beforeEach(() => { rankings = new CivilizationRankings(); });

  it("rank() returns civs sorted by population descending", () => {
    const civs = [
      { id: "a", population: 100 },
      { id: "b", population: 500 },
      { id: "c", population: 250 },
    ];
    const ranked = rankings.rank(civs);
    expect(ranked[0].id).toBe("b");
    expect(ranked[1].id).toBe("c");
    expect(ranked[2].id).toBe("a");
  });

  it("rank() does not mutate the original array", () => {
    const civs = [
      { id: "x", population: 10 },
      { id: "y", population: 20 },
    ];
    rankings.rank(civs);
    expect(civs[0].id).toBe("x"); // original order unchanged
  });

  it("rank() returns empty array for empty input", () => {
    expect(rankings.rank([])).toEqual([]);
  });

  it("rank() handles civs with missing population (treats as 0)", () => {
    const civs = [{ id: "no_pop" }, { id: "has_pop", population: 100 }] as any[];
    const ranked = rankings.rank(civs);
    expect(ranked[0].id).toBe("has_pop");
  });

  it("rank() handles single-element array", () => {
    const civs = [{ id: "lonely", population: 1 }];
    expect(rankings.rank(civs)).toHaveLength(1);
  });
});
