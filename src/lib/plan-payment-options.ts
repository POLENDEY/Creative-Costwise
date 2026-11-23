/** The ways a crafter can pay for a renewal. Client-safe: no Prisma imports. */

export const PLAN_PAYMENT_METHODS = [
  { key: "gcash", label: "GCash" },
  { key: "maya", label: "Maya" },
  { key: "bank", label: "Online bank transfer (UB, BDO, BPI, others)" },
  { key: "other", label: "Another online payment" },
] as const;

export type PlanPaymentMethodKey = (typeof PLAN_PAYMENT_METHODS)[number]["key"];

export function isPlanPaymentMethod(value: unknown): value is PlanPaymentMethodKey {
  return typeof value === "string" && PLAN_PAYMENT_METHODS.some((method) => method.key === value);
}

export function paymentMethodLabel(value: string): string {
  return PLAN_PAYMENT_METHODS.find((method) => method.key === value)?.label ?? value;
}
