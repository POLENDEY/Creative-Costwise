import { prisma } from "@/lib/prisma";
import { defaultPlanPrices, PLAN_KEYS, type PlanKey, type PlanPriceMap } from "@/lib/plans";

const CATALOG_ID = "plan-catalog";
const CACHE_MS = 30_000;

let memory: { prices: PlanPriceMap; at: number } | null = null;

export function clearPlanCatalogCache() {
  memory = null;
}

export async function getPlanCatalog(): Promise<PlanPriceMap> {
  if (memory && Date.now() - memory.at < CACHE_MS) return memory.prices;
  const row = await prisma.planCatalog.findUnique({ where: { id: CATALOG_ID } });
  const fallback = defaultPlanPrices();
  const prices: PlanPriceMap = row
    ? {
        monthly: row.monthlyPriceMinor,
        quarterly: row.quarterlyPriceMinor,
        annual: row.annualPriceMinor,
      }
    : fallback;
  memory = { prices, at: Date.now() };
  return prices;
}

export async function savePlanCatalog(prices: PlanPriceMap) {
  const data = {
    monthlyPriceMinor: prices.monthly,
    quarterlyPriceMinor: prices.quarterly,
    annualPriceMinor: prices.annual,
  };
  await prisma.planCatalog.upsert({
    where: { id: CATALOG_ID },
    update: data,
    create: { id: CATALOG_ID, ...data },
  });
  clearPlanCatalogCache();
}

export function isPlanPriceKey(value: string): value is PlanKey {
  return (PLAN_KEYS as readonly string[]).includes(value);
}
