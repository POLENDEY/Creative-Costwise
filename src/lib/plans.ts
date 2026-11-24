/**
 * Plan catalog — the single source of truth for plan names, billing periods and
 * prices. Client-safe: no Prisma or server-only imports, so the admin preview and
 * the pricing page read the same numbers the server uses.
 *
 * Prices are in PHP and set against comparable Philippine small-business tools
 * (Conta from ₱189–₱284/month billed annually, Oojeema Lite ₱490/month,
 * QNE Basic ₱900/month) rather than picked at random.
 */

export const PLAN_KEYS = ["monthly", "quarterly", "annual"] as const;
export type PlanKey = (typeof PLAN_KEYS)[number];

export type PlanDefinition = {
  key: PlanKey;
  label: string;
  /** Billing period in calendar months. */
  months: number;
  /** Price for the whole billing period, in centavos. */
  priceMinor: number;
  cadence: string;
  summary: string;
  badge?: string;
};

export const PLAN_CURRENCY = "PHP" as const;

export const PLANS: Record<PlanKey, PlanDefinition> = {
  monthly: {
    key: "monthly",
    label: "Monthly",
    months: 1,
    priceMinor: 29900,
    cadence: "per month",
    summary: "Pay month to month with no long commitment — good for trying the full toolkit on a single collection.",
  },
  quarterly: {
    key: "quarterly",
    label: "Quarterly",
    months: 3,
    priceMinor: 79900,
    cadence: "every 3 months",
    summary: "Three months of the full toolkit — enough time to cost and price a whole season of products.",
    badge: "Most popular",
  },
  annual: {
    key: "annual",
    label: "Annual",
    months: 12,
    priceMinor: 279900,
    cadence: "per year",
    summary: "A full year of the full toolkit at the lowest monthly price, billed once.",
    badge: "Best value",
  },
};

export function isPlanKey(value: unknown): value is PlanKey {
  return typeof value === "string" && (PLAN_KEYS as readonly string[]).includes(value);
}

export type PlanPriceMap = Record<PlanKey, number>;

export function defaultPlanPrices(): PlanPriceMap {
  return {
    monthly: PLANS.monthly.priceMinor,
    quarterly: PLANS.quarterly.priceMinor,
    annual: PLANS.annual.priceMinor,
  };
}

export function plansWithPrices(prices: PlanPriceMap): Record<PlanKey, PlanDefinition> {
  return {
    monthly: { ...PLANS.monthly, priceMinor: prices.monthly },
    quarterly: { ...PLANS.quarterly, priceMinor: prices.quarterly },
    annual: { ...PLANS.annual, priceMinor: prices.annual },
  };
}

export function planFromPrices(plan: string | null | undefined, prices: PlanPriceMap): PlanDefinition {
  const catalog = plansWithPrices(prices);
  return isPlanKey(plan) ? catalog[plan] : catalog.quarterly;
}

export function getPlan(plan: string | null | undefined): PlanDefinition {
  return isPlanKey(plan) ? PLANS[plan] : PLANS.quarterly;
}

export function planMonths(plan: string | null | undefined): number {
  return getPlan(plan).months;
}

/** Adds calendar months, clamping to the last day of a shorter month (Jan 31 → Feb 28). */
export function addPlanMonths(date: Date, months: number): Date {
  const result = new Date(date);
  const originalDay = result.getDate();
  result.setMonth(result.getMonth() + months, 1);
  const lastDay = new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate();
  result.setDate(Math.min(originalDay, lastDay));
  return result;
}

/** The date access would run to if this plan started on `from`. */
export function planExpiry(plan: string | null | undefined, from: Date = new Date()): Date {
  return addPlanMonths(from, planMonths(plan));
}

export function formatPlanPrice(minor: number): string {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: PLAN_CURRENCY,
    maximumFractionDigits: 0,
  }).format(minor / 100);
}

/** Effective monthly cost of a billing period, rounded to the peso. */
export function planMonthlyMinor(plan: string | null | undefined, prices: PlanPriceMap = defaultPlanPrices()): number {
  const definition = planFromPrices(plan, prices);
  return Math.round(definition.priceMinor / definition.months);
}

/** How much cheaper than paying monthly, as a whole percentage. */
export function planSavingsPercent(plan: string | null | undefined, prices: PlanPriceMap = defaultPlanPrices()): number {
  const definition = planFromPrices(plan, prices);
  const monthlyTotal = prices.monthly * definition.months;
  if (monthlyTotal <= 0) return 0;
  return Math.max(0, Math.round((1 - definition.priceMinor / monthlyTotal) * 100));
}

/** "₱799 every 3 months" */
export function planBillingLine(plan: string | null | undefined, prices: PlanPriceMap = defaultPlanPrices()): string {
  const definition = planFromPrices(plan, prices);
  return `${formatPlanPrice(definition.priceMinor)} ${definition.cadence}`;
}
