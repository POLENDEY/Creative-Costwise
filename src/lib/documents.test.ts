import { describe, expect, it } from "vitest";
import { documentTotals } from "./documents";

describe("documentTotals", () => {
  it("adds a typed tax amount on top of the discounted product total and shipping", () => {
    expect(documentTotals({
      lines: [{ unitPriceMinor: 30000, quantity: 1 }],
      discountMinor: 3000,
      shippingMinor: 5000,
      taxMinor: 1000,
    })).toEqual({
      subtotalMinor: 30000,
      discountMinor: 3000,
      shippingMinor: 5000,
      taxMinor: 1000,
      totalMinor: 33000,
    });
  });

  it("rejects a discount larger than the product total", () => {
    expect(() => documentTotals({
      lines: [{ unitPriceMinor: 10000, quantity: 1 }],
      discountMinor: 10001,
      shippingMinor: 0,
      taxMinor: 0,
    })).toThrow(/product total/i);
  });
});
