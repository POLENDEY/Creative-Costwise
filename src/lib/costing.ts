import { roundHalfUp } from "./money";

export type MaterialInput = {
  costPerPieceMinor: number;
  unitsUsed: number;
  finishedPieces: number;
};

export type PrinterInput = {
  colorCostPerSheetMinor: number;
  blackCostPerSheetMinor: number;
};

export type PrintInput = {
  printer: PrinterInput;
  paperSize: "A4" | "A5" | "A3" | "LETTER" | "LEGAL";
  quality: "draft" | "standard" | "best";
  coverage: "black_white" | "light_color" | "normal_color" | "photo_heavy";
  sheetCount: number;
  finishedPieces: number;
};

export type CostingInput = {
  materialLines: MaterialInput[];
  printLines: PrintInput[];
  overagePercent: number;
  lossPercent: number;
  operationalFeeMinor: number;
  laborPercent: number;
  packagingCostMinor: number;
  markups: { retail: number; bulk: number; promo: number; loyal: number };
};

const paperSizeMultiplier = { A5: 0.5, A4: 1, LETTER: 1, LEGAL: 1.2, A3: 2 } as const;
const qualityMultiplier = { draft: 0.6, standard: 1, best: 1.5 } as const;
const coverageMultiplier = {
  black_white: 0.4,
  light_color: 0.8,
  normal_color: 1,
  photo_heavy: 1.8,
} as const;

export function calculateCost(input: CostingInput) {
  const materialPerPieceMinor = input.materialLines.reduce((total, line) => {
    if (line.finishedPieces <= 0) return total;
    const lineCost = roundHalfUp(line.costPerPieceMinor * line.unitsUsed);
    return total + roundHalfUp(lineCost / line.finishedPieces);
  }, 0);

  const printingPerPieceMinor = input.printLines.reduce((total, line) => {
    if (line.finishedPieces <= 0) return total;
    const size = paperSizeMultiplier[line.paperSize];
    const quality = qualityMultiplier[line.quality];
    const coverage = coverageMultiplier[line.coverage];
    const base =
      line.coverage === "black_white"
        ? line.printer.blackCostPerSheetMinor
        : line.printer.colorCostPerSheetMinor;
    const costPerSheet = roundHalfUp(base * size * quality * coverage);
    const lineCost = roundHalfUp(costPerSheet * line.sheetCount);
    return total + roundHalfUp(lineCost / line.finishedPieces);
  }, 0);

  const directMinor = materialPerPieceMinor + printingPerPieceMinor;
  const overageMinor = roundHalfUp((directMinor * input.overagePercent) / 100);
  const afterOverageMinor = directMinor + overageMinor;
  const lossMinor = roundHalfUp((afterOverageMinor * input.lossPercent) / 100);
  const adjustedMinor = afterOverageMinor + lossMinor + input.operationalFeeMinor;
  const laborMinor = roundHalfUp((adjustedMinor * input.laborPercent) / 100);
  const productionCostMinor = adjustedMinor + laborMinor + input.packagingCostMinor;

  const price = (markup: number) =>
    roundHalfUp(productionCostMinor * (1 + markup / 100));

  return {
    materialPerPieceMinor,
    printingPerPieceMinor,
    directMinor,
    overageMinor,
    lossMinor,
    adjustedMinor,
    laborMinor,
    packagingCostMinor: input.packagingCostMinor,
    productionCostMinor,
    prices: {
      retail: price(input.markups.retail),
      bulk: price(input.markups.bulk),
      promo: price(input.markups.promo),
      loyal: price(input.markups.loyal),
    },
    profits: {
      retail: price(input.markups.retail) - productionCostMinor,
      bulk: price(input.markups.bulk) - productionCostMinor,
      promo: price(input.markups.promo) - productionCostMinor,
      loyal: price(input.markups.loyal) - productionCostMinor,
    },
  };
}

export function calculateMaterialCostPerPiece(pricePerPackMinor: number, piecesPerPack: number) {
  if (piecesPerPack <= 0) throw new RangeError("Pieces per pack must be greater than zero.");
  return roundHalfUp(pricePerPackMinor / piecesPerPack);
}

export function calculatePrinterBaseCosts(input: {
  colorInkPriceMinor: number;
  colorPageYield: number;
  blackInkPriceMinor: number;
  blackPageYield: number;
}) {
  if (input.colorPageYield <= 0 || input.blackPageYield <= 0) {
    throw new RangeError("Printer page yields must be greater than zero.");
  }
  return {
    colorCostPerSheetMinor: roundHalfUp(input.colorInkPriceMinor / input.colorPageYield),
    blackCostPerSheetMinor: roundHalfUp(input.blackInkPriceMinor / input.blackPageYield),
  };
}
