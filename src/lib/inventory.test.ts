import { describe, expect, it } from "vitest";
import { restockToNewTotal } from "./inventory";

describe("restockToNewTotal", () => {
  it("replaces the on-hand quantity with the entered total", () => {
    expect(restockToNewTotal(12, 40)).toEqual({ quantityOnHand: 40, delta: 28 });
  });

  it("does not add the entered number to the previous quantity", () => {
    expect(restockToNewTotal(12, 5).quantityOnHand).toBe(5);
  });

  it("rejects a negative total", () => {
    expect(() => restockToNewTotal(4, -1)).toThrow(/new total/i);
  });
});
