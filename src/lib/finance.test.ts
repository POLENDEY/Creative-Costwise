import { describe, expect, it } from "vitest";
import { financeSummary } from "./finance";

describe("financeSummary", () => {
  it("counts sales and expenses inside the window and subtracts them", () => {
    const from = new Date("2026-11-01T00:00:00.000Z");
    const to = new Date("2026-11-23T12:00:00.000Z");
    expect(financeSummary({
      from,
      to,
      sales: [
        { amountMinor: 10000, recognizedOn: new Date("2026-11-20T00:00:00.000Z") },
        { amountMinor: 5000, recognizedOn: new Date("2026-10-01T00:00:00.000Z") },
      ],
      expenses: [
        { amountMinor: 2000, occurredOn: new Date("2026-11-21T00:00:00.000Z") },
      ],
    })).toEqual({ revenueMinor: 10000, expenseMinor: 2000, profitMinor: 8000 });
  });
});
