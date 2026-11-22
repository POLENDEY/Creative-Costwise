import { prisma } from "@/lib/prisma";
import { requireCrafter } from "@/lib/session";
import { resolveCurrency } from "@/lib/money";
import { getProductCostBreakdown } from "@/lib/product-breakdown";
import { PurchaseOrderWorkspace } from "@/components/purchase-order-workspace";

export default async function PurchaseOrdersPage() {
  const user = await requireCrafter();
  const [settings, priceSets, purchaseOrders, savedDraft] = await Promise.all([
    prisma.shopSettings.findUnique({ where: { userId: user.id } }),
    prisma.priceSet.findMany({
      where: { userId: user.id },
      include: {
        costingTab: {
          include: {
            materialLines: { include: { material: true } },
            printLines: { include: { printer: true } },
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.purchaseOrder.findMany({
      where: { userId: user.id, status: { not: "draft" } },
      include: { lines: { orderBy: { createdAt: "asc" } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.purchaseOrder.findFirst({
      where: { userId: user.id, status: "draft" },
      include: { lines: { orderBy: { createdAt: "asc" } } },
      orderBy: { updatedAt: "desc" },
    }),
  ]);
  const currency = resolveCurrency(settings?.currency);
  return <PurchaseOrderWorkspace
    name={user.name}
    email={user.email}
    currency={currency}
    savedDraft={savedDraft ? {
      note: savedDraft.note,
      lines: savedDraft.lines.map((line) => ({
        priceSetId: line.priceSetId ?? "",
        pricingOption: line.pricingOption === "bulk" ? "bulk" as const : "retail" as const,
        quantity: line.quantity,
      })),
      updatedAt: savedDraft.updatedAt.toISOString(),
    } : null}
    products={priceSets.map((priceSet) => {
      const breakdown = getProductCostBreakdown(priceSet);
      return {
        id: priceSet.id,
        name: priceSet.name,
        category: priceSet.category,
        retailPriceMinor: priceSet.retailPriceMinor,
        bulkPriceMinor: priceSet.bulkPriceMinor,
        productionCostMinor: breakdown.productionCostMinor,
        breakdownJson: JSON.stringify(breakdown),
      };
    })}
    previousOrders={purchaseOrders.map((purchaseOrder) => ({
      id: purchaseOrder.id,
      status: purchaseOrder.status,
      note: purchaseOrder.note,
      response: purchaseOrder.response,
      createdAt: purchaseOrder.createdAt.toISOString(),
      currency: purchaseOrder.currency,
      lines: purchaseOrder.lines,
    }))}
  />;
}
