import { BundleStudio } from "@/components/bundle-studio";
import { prisma } from "@/lib/prisma";
import { requireCrafter } from "@/lib/session";
import { resolveCurrency } from "@/lib/money";

export default async function BundlesPage() {
  const user = await requireCrafter("bundles");
  const [settings, products, bundles, items] = await Promise.all([
    prisma.shopSettings.findUnique({ where: { userId: user.id } }),
    prisma.priceSet.findMany({ where: { userId: user.id }, orderBy: { name: "asc" } }),
    prisma.bundle.findMany({ where: { userId: user.id }, orderBy: { name: "asc" } }),
    prisma.bundleItem.findMany({ where: { userId: user.id } }),
  ]);

  return <div className="feature-page">
    <div className="page-heading">
      <div><span className="eyebrow">SELL THEM TOGETHER</span><h1>Bundles</h1><p>Set one price for a group of products. A price below cost is shown, and you can still save it.</p></div>
    </div>
    <BundleStudio
      currency={resolveCurrency(settings?.currency)}
      products={products.map((product) => ({
        id: product.id,
        name: product.name,
        retailPriceMinor: product.retailPriceMinor,
        productionCostMinor: product.productionCostMinor,
      }))}
      bundles={bundles.map((bundle) => ({
        id: bundle.id,
        name: bundle.name,
        priceMinor: bundle.priceMinor,
        items: items.filter((item) => item.bundleId === bundle.id).map((item) => ({
          priceSetId: item.priceSetId,
          quantity: Number(item.quantity),
        })),
      }))}
    />
  </div>;
}
