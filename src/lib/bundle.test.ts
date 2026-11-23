import { describe, expect, it } from "vitest";
import { calculateBundle } from "./bundle";

describe("calculateBundle", () => {
  it("matches the walkthrough bundle of 345 regular, 244 cost, and a 300 price", () => {
    expect(calculateBundle({
      items: [
        { regularPriceMinor: 20000, productionCostMinor: 14000, quantity: 1 },
        { regularPriceMinor: 14500, productionCostMinor: 10400, quantity: 1 },
      ],
      bundlePriceMinor: 30000,
    })).toEqual({
      regularMinor: 34500,
      costMinor: 24400,
      bundlePriceMinor: 30000,
      savingsMinor: 4500,
      profitMinor: 5600,
      belowCost: false,
    });
  });

  it("flags a bundle price below production cost without changing the totals", () => {
    const result = calculateBundle({
      items: [{ regularPriceMinor: 10000, productionCostMinor: 8000, quantity: 1 }],
      bundlePriceMinor: 5000,
    });
    expect(result.belowCost).toBe(true);
    expect(result.profitMinor).toBe(-3000);
    expect(result.savingsMinor).toBe(5000);
  });

  it("rejects a negative bundle price", () => {
    expect(() => calculateBundle({
      items: [{ regularPriceMinor: 10000, productionCostMinor: 4000, quantity: 1 }],
      bundlePriceMinor: -1,
    })).toThrow(/bundle price/i);
  });
});
