import { roundHalfUp } from "./money";

export const ORDER_STAGES = [
  { id: "inquiry", label: "Inquiry" },
  { id: "quoted", label: "Quoted" },
  { id: "in_production", label: "In production" },
  { id: "ready", label: "Ready" },
  { id: "delivered", label: "Delivered" },
  { id: "done", label: "Done" },
] as const;

export type OrderStage = (typeof ORDER_STAGES)[number]["id"];

export const PAYMENT_STATUSES = [
  { id: "unpaid", label: "Unpaid" },
  { id: "deposit", label: "Deposit received" },
  { id: "paid", label: "Paid in full" },
] as const;

export const DELIVERY_METHODS = [
  { id: "pickup", label: "Pickup" },
  { id: "courier", label: "Courier" },
  { id: "meetup", label: "Meetup" },
  { id: "other", label: "Other" },
] as const;

export function isOrderStage(value: string): value is OrderStage {
  return ORDER_STAGES.some((stage) => stage.id === value);
}

export function discountAmount(originalMinor: number, kind: "percent" | "fixed", value: number) {
  if (!Number.isInteger(originalMinor) || originalMinor < 0) {
    throw new Error("Price cannot be negative.");
  }
  if (kind === "percent") {
    if (!Number.isFinite(value) || value < 0 || value > 100) {
      throw new Error("Enter a discount from 0 to 100 percent.");
    }
    const discountMinor = roundHalfUp((originalMinor * value) / 100);
    return { discountMinor, saleMinor: originalMinor - discountMinor };
  }
  if (!Number.isInteger(value) || value < 0) throw new Error("Enter a fixed discount of zero or more.");
  if (value > originalMinor) throw new Error("The discount cannot be more than the price.");
  return { discountMinor: value, saleMinor: originalMinor - value };
}

export function lineTotalMinor(unitPriceMinor: number, quantity: number) {
  if (!Number.isFinite(quantity) || quantity <= 0) throw new Error("Quantity must be greater than zero.");
  return roundHalfUp(unitPriceMinor * quantity);
}

export function orderTotals(input: {
  lines: { unitPriceMinor: number; quantity: number }[];
  discountMinor: number;
  shippingMinor: number;
}) {
  if (input.discountMinor < 0 || input.shippingMinor < 0) throw new Error("Amounts cannot be negative.");
  const subtotalMinor = input.lines.reduce((sum, line) => sum + lineTotalMinor(line.unitPriceMinor, line.quantity), 0);
  if (input.discountMinor > subtotalMinor) throw new Error("The discount cannot be more than the product total.");
  return {
    subtotalMinor,
    discountMinor: input.discountMinor,
    shippingMinor: input.shippingMinor,
    totalMinor: subtotalMinor - input.discountMinor + input.shippingMinor,
  };
}

export function parseOptionalDate(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) throw new Error("Use dates as YYYY-MM-DD.");
  const [year, month, day] = trimmed.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    throw new Error("That date is not valid.");
  }
  return date;
}

export function formatIsoDate(value: Date | null | undefined) {
  if (!value) return "";
  return value.toISOString().slice(0, 10);
}
