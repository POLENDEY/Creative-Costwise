export const PLAN_FEATURES = {
  costing: { label: "Product costing", href: "/costing" },
  prices: { label: "Price sets", href: "/prices" },
  bundles: { label: "Bundles", href: "/bundles" },
  promotions: { label: "Promotions", href: "/promotions" },
  digital: { label: "Digital products", href: "/digital" },
  orders: { label: "Orders", href: "/orders" },
  documents: { label: "Documents", href: "/documents" },
  finance: { label: "Finance", href: "/finance" },
  purchaseOrders: { label: "Purchase orders", href: "/purchase-orders" },
} as const;

export type PlanFeatureKey = keyof typeof PLAN_FEATURES;
export type PlanAccessReason = "expired" | "disabled";

export type PlanAccess = {
  limited: boolean;
  reason: PlanAccessReason | null;
  plan: string;
  expiresAt: Date | null;
};

export function getPlanAccess(
  user: { plan?: string | null; expiresAt?: Date | null; disabledAt?: Date | null },
  now: Date = new Date(),
): PlanAccess {
  const reason: PlanAccessReason | null = user.disabledAt
    ? "disabled"
    : user.expiresAt && user.expiresAt.getTime() < now.getTime()
      ? "expired"
      : null;
  return {
    limited: reason !== null,
    reason,
    plan: user.plan ?? "quarterly",
    expiresAt: user.expiresAt ?? null,
  };
}

export function planLabel(plan: string): string {
  return plan ? plan.charAt(0).toUpperCase() + plan.slice(1) : plan;
}

export function formatPlanDate(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("en", { dateStyle: "long" }).format(date);
}

export function planLockTitle(reason: PlanAccessReason): string {
  return reason === "disabled" ? "Your plan is paused" : "Your plan has ended";
}

export function planLockMessage({
  reason,
  feature,
  plan,
  expiresAt,
}: {
  reason: PlanAccessReason;
  feature: string;
  plan: string;
  expiresAt: Date | string | null;
}): string {
  if (reason === "disabled") {
    return `${feature} is locked while your toolkit plan is paused. Ask your toolkit admin to renew your plan and unlock the full features — everything you have saved is still here.`;
  }
  const endedOn = formatPlanDate(expiresAt);
  return endedOn
    ? `${feature} is locked because your ${planLabel(plan)} plan ended on ${endedOn}. Renew your plan to unlock ${feature} and the rest of the full features — everything you have saved is still here.`
    : `${feature} is locked because your plan has ended. Renew your plan to unlock ${feature} and the rest of the full features — everything you have saved is still here.`;
}
