import { prisma } from "@/lib/prisma";
import { requireCrafter } from "@/lib/session";
import { CostingWorkspace } from "@/components/costing-workspace";
import { resolveCurrency } from "@/lib/money";
import { z } from "zod";

const paperSizeSchema = z.enum(["A4", "A5", "A3", "LETTER", "LEGAL"]);
const qualitySchema = z.enum(["draft", "standard", "best"]);
const coverageSchema = z.enum(["black_white", "light_color", "normal_color", "photo_heavy"]);

export default async function CostingPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const user = await requireCrafter();
  const { tab: requestedTabId } = await searchParams;
  const [settings, materials, printers, tabs] = await Promise.all([
    prisma.shopSettings.findUnique({ where: { userId: user.id } }),
    prisma.material.findMany({ where: { userId: user.id }, orderBy: { name: "asc" } }),
    prisma.printer.findMany({ where: { userId: user.id }, orderBy: { name: "asc" } }),
    prisma.costingTab.findMany({
      where: { userId: user.id },
      include: { materialLines: true, printLines: true, priceSets: { orderBy: { createdAt: "desc" } } },
      orderBy: { updatedAt: "desc" },
    }),
  ]);
  const currency = resolveCurrency(settings?.currency);
  return <CostingWorkspace
    currency={currency}
    defaults={{
      lossPercent: Number(settings?.defaultLossPercent ?? 3),
      operationalFeeMinor: settings?.defaultOperationalFeeMinor ?? 1000,
      laborPercent: Number(settings?.defaultLaborPercent ?? 100),
      markupRetailPercent: Number(settings?.markupRetailPercent ?? 100),
      markupBulkPercent: Number(settings?.markupBulkPercent ?? 50),
      markupPromoPercent: Number(settings?.markupPromoPercent ?? 30),
      markupLoyalPercent: Number(settings?.markupLoyalPercent ?? 40),
    }}
    materials={materials.map((material) => ({
      id: material.id,
      name: material.name,
      category: material.category,
      unitLabel: material.unitLabel,
      quantityOnHand: Number(material.quantityOnHand),
      piecesPerPack: Number(material.piecesPerPack),
      pricePerPackMinor: material.pricePerPackMinor,
    }))}
    printers={printers.map((printer) => ({
      id: printer.id,
      name: printer.name,
      colorInkPriceMinor: printer.colorInkPriceMinor,
      colorPageYield: Number(printer.colorPageYield),
      blackInkPriceMinor: printer.blackInkPriceMinor,
      blackPageYield: Number(printer.blackPageYield),
    }))}
    tabs={tabs.map((tab) => ({
      id: tab.id,
      name: tab.name,
      overagePercent: Number(tab.overagePercent),
      lossPercent: Number(tab.lossPercent),
      operationalFeeMinor: tab.operationalFeeMinor,
      laborPercent: Number(tab.laborPercent),
      packagingCostMinor: tab.packagingCostMinor,
      markupRetailPercent: Number(tab.markupRetailPercent),
      markupBulkPercent: Number(tab.markupBulkPercent),
      markupPromoPercent: Number(tab.markupPromoPercent),
      markupLoyalPercent: Number(tab.markupLoyalPercent),
      materialLines: tab.materialLines.map((line) => ({
        materialId: line.materialId,
        unitsUsed: Number(line.unitsUsed),
        finishedPieces: Number(line.finishedPieces),
      })),
      printLines: tab.printLines.map((line) => ({
        printerId: line.printerId,
        paperSize: paperSizeSchema.parse(line.paperSize),
        quality: qualitySchema.parse(line.quality),
        coverage: coverageSchema.parse(line.coverage),
        sheetCount: Number(line.sheetCount),
        finishedPieces: Number(line.finishedPieces),
      })),
      priceSets: tab.priceSets.map((set) => ({
        id: set.id,
        name: set.name,
        category: set.category,
        retailPriceMinor: set.retailPriceMinor,
        bulkPriceMinor: set.bulkPriceMinor,
        productionCostMinor: set.productionCostMinor,
      })),
    }))}
    requestedTabId={requestedTabId}
  />;
}
