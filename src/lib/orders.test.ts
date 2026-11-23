import { describe, expect, it } from "vitest";
import { discountAmount, orderTotals } from "./orders";

describe("discountAmount", () => {
  it("returns 270 pesos and a 30 peso discount from 300 pesos at 10 percent", () => {
    expect(discountAmount(30000, "percent", 10)).toEqual({ discountMinor: 3000, saleMinor: 27000 });
  });

  it("rejects a percentage outside 0 to 100", () => {
    expect(() => discountAmount(30000, "percent", 110)).toThrow(/percent/i);
  });

  it("rejects a fixed discount larger than the price", () => {
    expect(() => discountAmount(30000, "fixed", 30001)).toThrow(/more than the price/i);
  });
});

describe("orderTotals", () => {
  it("uses the snapshotted unit price rather than a later catalog price", () => {
    const savedLine = { unitPriceMinor: 15000, quantity: 2 };
    const totals = orderTotals({ lines: [savedLine], discountMinor: 0, shippingMinor: 5000 });
    expect(totals).toEqual({ subtotalMinor: 30000, discountMinor: 0, shippingMinor: 5000, totalMinor: 35000 });
  });

  it("rejects a discount larger than the product total", () => {
    expect(() => orderTotals({
      lines: [{ unitPriceMinor: 10000, quantity: 1 }],
      discountMinor: 10001,
      shippingMinor: 0,
    })).toThrow(/product total/i);
  });
});
