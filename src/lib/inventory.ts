export const MAX_STARRED_CATEGORIES = 5;

export const PAYMENT_METHODS = ["cash", "gcash", "bank", "card", "other"] as const;

export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export function restockToNewTotal(current: number, newTotal: number) {
  if (!Number.isFinite(newTotal) || newTotal < 0) {
    throw new Error("Enter a new total of zero or more.");
  }
  return { quantityOnHand: newTotal, delta: newTotal - current };
}

export function expenseSourceKey(kind: "restock" | "supply", userId: string, requestKey: string) {
  return `${kind}:${userId}:${requestKey}`;
}
