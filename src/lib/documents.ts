import { lineTotalMinor } from "./orders";

export function documentTotals(input: {
  lines: { unitPriceMinor: number; quantity: number }[];
  discountMinor: number;
  shippingMinor: number;
  taxMinor: number;
}) {
  if (input.discountMinor < 0 || input.shippingMinor < 0 || input.taxMinor < 0) {
    throw new Error("Amounts cannot be negative.");
  }
  const subtotalMinor = input.lines.reduce((sum, line) => sum + lineTotalMinor(line.unitPriceMinor, line.quantity), 0);
  if (input.discountMinor > subtotalMinor) throw new Error("The discount cannot be more than the product total.");
  return {
    subtotalMinor,
    discountMinor: input.discountMinor,
    shippingMinor: input.shippingMinor,
    taxMinor: input.taxMinor,
    totalMinor: subtotalMinor - input.discountMinor + input.shippingMinor + input.taxMinor,
  };
}

export function documentPlainLines(input: {
  kind: string;
  number: string;
  businessName: string;
  customerName: string;
  currencyLabel: string;
  lines: { label: string; quantity: number; amount: string }[];
  subtotal: string;
  discount: string;
  shipping: string;
  taxLabel: string;
  tax: string;
  total: string;
  payment: string;
}) {
  return [
    input.kind === "receipt" ? "Receipt" : "Invoice",
    input.number,
    input.businessName,
    `For ${input.customerName}`,
    ...input.lines.map((line) => `${line.quantity} x ${line.label}  ${line.amount}`),
    `Products ${input.subtotal}`,
    `Discount ${input.discount}`,
    `Shipping ${input.shipping}`,
    `${input.taxLabel || "Tax"} ${input.tax}`,
    `Total ${input.total} ${input.currencyLabel}`,
    input.payment,
  ].filter((line) => line.trim().length > 0);
}
