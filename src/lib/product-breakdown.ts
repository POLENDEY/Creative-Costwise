import { calculateCost, calculateMaterialCostPerPiece, calculatePrinterBaseCosts } from "@/lib/costing";
import { z } from "zod";

type CostingMaterial = {
  unitsUsed: unknown;
  finishedPieces: unknown;
  material: {
    name: string;
    unitLabel: string;
    pricePerPackMinor: number;
    piecesPerPack: unknown;
    quantityOnHand: unknown;
  };
};

type CostingPrint = {
  paperSize: string;
  quality: string;
  coverage: string;
  sheetCount: unknown;
  finishedPieces: unknown;
  printer: {
    name: string;
    colorInkPriceMinor: number;
    colorPageYield: unknown;
    blackInkPriceMinor: number;
    blackPageYield: unknown;
  };
};

export type ProductPriceSet = {
  id: string;
  name: string;
  category: string;
  retailPriceMinor: number;
  bulkPriceMinor: number;
  productionCostMinor: number;
  costingTab: {
    overagePercent: unknown;
    lossPercent: unknown;
    operationalFeeMinor: number;
    laborPercent: unknown;
    packagingCostMinor: number;
    markupRetailPercent: unknown;
    markupBulkPercent: unknown;
    markupPromoPercent: unknown;
    markupLoyalPercent: unknown;
    materialLines: CostingMaterial[];
    printLines: CostingPrint[];
  };
};

export function getProductCostBreakdown(priceSet: ProductPriceSet) {
  const { costingTab } = priceSet;
  const materialLines = costingTab.materialLines.map((line) => {
    const unitsUsed = Number(line.unitsUsed);
    const finishedPieces = Number(line.finishedPieces);
    const costPerUnitMinor = calculateMaterialCostPerPiece(
      line.material.pricePerPackMinor,
      Number(line.material.piecesPerPack),
    );
    const batchCostMinor = Math.floor(costPerUnitMinor * unitsUsed + 0.5);
    return {
      name: line.material.name,
      unitLabel: line.material.unitLabel,
      unitsUsed,
      finishedPieces,
      quantityOnHand: Number(line.material.quantityOnHand),
      costPerUnitMinor,
      batchCostMinor,
      perPieceMinor: finishedPieces > 0 ? Math.floor(batchCostMinor / finishedPieces + 0.5) : 0,
    };
  });

  const printLines = costingTab.printLines.map((line) => {
    const printerCosts = calculatePrinterBaseCosts({
      colorInkPriceMinor: line.printer.colorInkPriceMinor,
      colorPageYield: Number(line.printer.colorPageYield),
      blackInkPriceMinor: line.printer.blackInkPriceMinor,
      blackPageYield: Number(line.printer.blackPageYield),
    });
    const result = calculateCost({
      materialLines: [],
      printLines: [{
        printer: printerCosts,
        paperSize: line.paperSize as "A4" | "A5" | "A3" | "LETTER" | "LEGAL",
        quality: line.quality as "draft" | "standard" | "best",
        coverage: line.coverage as "black_white" | "light_color" | "normal_color" | "photo_heavy",
        sheetCount: Number(line.sheetCount),
        finishedPieces: Number(line.finishedPieces),
      }],
      overagePercent: 0,
      lossPercent: 0,
      operationalFeeMinor: 0,
      laborPercent: 0,
      packagingCostMinor: 0,
      markups: { retail: 0, bulk: 0, promo: 0, loyal: 0 },
    });
    return {
      printerName: line.printer.name,
      paperSize: line.paperSize,
      quality: line.quality,
      coverage: line.coverage,
      sheetCount: Number(line.sheetCount),
      finishedPieces: Number(line.finishedPieces),
      baseInkCostPerSheetMinor:
        line.coverage === "black_white"
          ? printerCosts.blackCostPerSheetMinor
          : printerCosts.colorCostPerSheetMinor,
      perPieceMinor: result.printingPerPieceMinor,
    };
  });

  const result = calculateCost({
    materialLines: materialLines.map((line) => ({
      costPerPieceMinor: line.costPerUnitMinor,
      unitsUsed: line.unitsUsed,
      finishedPieces: line.finishedPieces,
    })),
    printLines: costingTab.printLines.map((line) => ({
      printer: calculatePrinterBaseCosts({
        colorInkPriceMinor: line.printer.colorInkPriceMinor,
        colorPageYield: Number(line.printer.colorPageYield),
        blackInkPriceMinor: line.printer.blackInkPriceMinor,
        blackPageYield: Number(line.printer.blackPageYield),
      }),
      paperSize: line.paperSize as "A4" | "A5" | "A3" | "LETTER" | "LEGAL",
      quality: line.quality as "draft" | "standard" | "best",
      coverage: line.coverage as "black_white" | "light_color" | "normal_color" | "photo_heavy",
      sheetCount: Number(line.sheetCount),
      finishedPieces: Number(line.finishedPieces),
    })),
    overagePercent: Number(costingTab.overagePercent),
    lossPercent: Number(costingTab.lossPercent),
    operationalFeeMinor: costingTab.operationalFeeMinor,
    laborPercent: Number(costingTab.laborPercent),
    packagingCostMinor: costingTab.packagingCostMinor,
    markups: {
      retail: Number(costingTab.markupRetailPercent),
      bulk: Number(costingTab.markupBulkPercent),
      promo: Number(costingTab.markupPromoPercent),
      loyal: Number(costingTab.markupLoyalPercent),
    },
  });

  return {
    materials: materialLines,
    printing: printLines,
    materialPerPieceMinor: result.materialPerPieceMinor,
    printingPerPieceMinor: result.printingPerPieceMinor,
    directMinor: result.directMinor,
    overagePercent: Number(costingTab.overagePercent),
    overageMinor: result.overageMinor,
    lossPercent: Number(costingTab.lossPercent),
    lossMinor: result.lossMinor,
    operationalFeeMinor: costingTab.operationalFeeMinor,
    adjustedMinor: result.adjustedMinor,
    laborPercent: Number(costingTab.laborPercent),
    laborMinor: result.laborMinor,
    packagingCostMinor: costingTab.packagingCostMinor,
    productionCostMinor: result.productionCostMinor,
    retailPriceMinor: priceSet.retailPriceMinor,
    bulkPriceMinor: priceSet.bulkPriceMinor,
    suggestedPrices: result.prices,
    profitAtRetailMinor: priceSet.retailPriceMinor - result.productionCostMinor,
    profitAtBulkMinor: priceSet.bulkPriceMinor - result.productionCostMinor,
  };
}

export type ProductCostBreakdown = ReturnType<typeof getProductCostBreakdown>;

const productCostBreakdownSchema = z.object({
  materials: z.array(z.object({
    name: z.string(),
    unitLabel: z.string(),
    unitsUsed: z.number(),
    finishedPieces: z.number(),
    quantityOnHand: z.number(),
    costPerUnitMinor: z.number(),
    batchCostMinor: z.number(),
    perPieceMinor: z.number(),
  })),
  printing: z.array(z.object({
    printerName: z.string(),
    paperSize: z.string(),
    quality: z.string(),
    coverage: z.string(),
    sheetCount: z.number(),
    finishedPieces: z.number(),
    baseInkCostPerSheetMinor: z.number(),
    perPieceMinor: z.number(),
  })),
  materialPerPieceMinor: z.number(),
  printingPerPieceMinor: z.number(),
  directMinor: z.number(),
  overagePercent: z.number(),
  overageMinor: z.number(),
  lossPercent: z.number(),
  lossMinor: z.number(),
  operationalFeeMinor: z.number(),
  adjustedMinor: z.number(),
  laborPercent: z.number(),
  laborMinor: z.number(),
  packagingCostMinor: z.number(),
  productionCostMinor: z.number(),
  retailPriceMinor: z.number(),
  bulkPriceMinor: z.number(),
  suggestedPrices: z.object({
    retail: z.number(),
    bulk: z.number(),
    promo: z.number(),
    loyal: z.number(),
  }),
  profitAtRetailMinor: z.number(),
  profitAtBulkMinor: z.number(),
});

export function parseProductCostBreakdown(value: string): ProductCostBreakdown {
  let decoded: unknown;
  try {
    decoded = JSON.parse(value);
  } catch {
    throw new Error("A saved product cost breakdown is invalid.");
  }
  const parsed = productCostBreakdownSchema.safeParse(decoded);
  if (!parsed.success) throw new Error("A saved product cost breakdown is invalid.");
  return parsed.data;
}
