import { describe, expect, it } from "vitest";
import {
  calculateCost,
  calculateMaterialCostPerPiece,
  calculatePrinterBaseCosts,
} from "./costing";

describe("calculateCost", () => {
  it("matches the worked example from the product costing guide", () => {
    const result = calculateCost({
      materialLines: [{ costPerPieceMinor: 5000, unitsUsed: 1, finishedPieces: 1 }],
      printLines: [{
        printer: { colorCostPerSheetMinor: 2000, blackCostPerSheetMinor: 1000 },
        paperSize: "A4",
        quality: "standard",
        coverage: "normal_color",
        sheetCount: 1,
        finishedPieces: 1,
      }],
      overagePercent: 0,
      lossPercent: 3,
      operationalFeeMinor: 1000,
      laborPercent: 100,
      packagingCostMinor: 0,
      markups: { retail: 100, bulk: 50, promo: 30, loyal: 40 },
    });

    expect(result.directMinor).toBe(7000);
    expect(result.lossMinor).toBe(210);
    expect(result.adjustedMinor).toBe(8210);
    expect(result.laborMinor).toBe(8210);
    expect(result.productionCostMinor).toBe(16420);
    expect(result.prices.retail).toBe(32840);
    expect(result.profits.retail).toBe(16420);
  });

  it("applies print size, quality, and coverage multipliers before dividing by finished pieces", () => {
    const result = calculateCost({
      materialLines: [],
      printLines: [{
        printer: { colorCostPerSheetMinor: 1000, blackCostPerSheetMinor: 500 },
        paperSize: "A5",
        quality: "best",
        coverage: "photo_heavy",
        sheetCount: 2,
        finishedPieces: 4,
      }],
      overagePercent: 0,
      lossPercent: 0,
      operationalFeeMinor: 0,
      laborPercent: 0,
      packagingCostMinor: 0,
      markups: { retail: 100, bulk: 50, promo: 30, loyal: 40 },
    });

    expect(result.printingPerPieceMinor).toBe(675);
  });

  it("rounds cost per material unit half up and rejects an empty pack", () => {
    expect(calculateMaterialCostPerPiece(101, 2)).toBe(51);
    expect(() => calculateMaterialCostPerPiece(100, 0)).toThrow(RangeError);
  });

  it("calculates printer base costs with half-up rounding", () => {
    expect(calculatePrinterBaseCosts({
      colorInkPriceMinor: 1001,
      colorPageYield: 2,
      blackInkPriceMinor: 500,
      blackPageYield: 3,
    })).toEqual({ colorCostPerSheetMinor: 501, blackCostPerSheetMinor: 167 });
  });
});
