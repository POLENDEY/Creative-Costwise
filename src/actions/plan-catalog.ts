"use server";

import { revalidatePath } from "next/cache";
import { requireAdminSession } from "@/lib/admin-session";
import { savePlanCatalog } from "@/lib/plan-catalog";
import { parseMoneyToMinor } from "@/lib/money";
import { PLAN_KEYS, type PlanPriceMap } from "@/lib/plans";

export async function savePlanPrices(formData: FormData) {
  await requireAdminSession();
  const prices = {} as PlanPriceMap;
  for (const key of PLAN_KEYS) {
    const amount = parseMoneyToMinor(String(formData.get(key) ?? ""));
    if (amount === null || amount < 100) {
      throw new Error("Enter each plan price as pesos, at least ₱1.");
    }
    prices[key] = amount;
  }
  await savePlanCatalog(prices);
  revalidatePath("/admin/users");
  revalidatePath("/pricing");
}
