import { roundHalfUp } from "./money";

export function calculateBundle(input: {
  items: { regularPriceMinor: number; productionCostMinor: number; quantity: number }[];
  bundlePriceMinor: number;
}) {
  if (!Number.isInteger(input.bundlePriceMinor) || input.bundlePriceMinor < 0) {
    throw new Error("Enter a bundle price of zero or more.");
  }
  if (input.items.length === 0) throw new Error("Add at least one product to the bundle.");

  let regularMinor = 0;
  let costMinor = 0;
  for (const item of input.items) {
    if (!Number.isFinite(item.quantity) || item.quantity <= 0) throw new Error("Quantity must be greater than zero.");
    regularMinor += roundHalfUp(item.regularPriceMinor * item.quantity);
    costMinor += roundHalfUp(item.productionCostMinor * item.quantity);
  }

  return {
    regularMinor,
    costMinor,
    bundlePriceMinor: input.bundlePriceMinor,
    savingsMinor: regularMinor - input.bundlePriceMinor,
    profitMinor: input.bundlePriceMinor - costMinor,
    belowCost: input.bundlePriceMinor < costMinor,
  };
}
