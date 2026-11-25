import { DigitalShelf } from "@/components/digital-shelf";
import { prisma } from "@/lib/prisma";
import { requireCrafter } from "@/lib/session";
import { resolveCurrency } from "@/lib/money";
import { withDatabasePage } from "@/lib/with-database-page";

async function DigitalPage() {
  const user = await requireCrafter("digital");
  const [settings, products] = await Promise.all([
    prisma.shopSettings.findUnique({ where: { userId: user.id } }),
    prisma.digitalProduct.findMany({ where: { userId: user.id }, orderBy: { name: "asc" } }),
  ]);

  return <div className="feature-page">
    <div className="page-heading">
      <div><span className="eyebrow">TEMPLATES AND DOWNLOADS</span><h1>Digital products</h1><p>Keep the price and the outside link. The toolkit does not host the file.</p></div>
    </div>
    <DigitalShelf
      currency={resolveCurrency(settings?.currency)}
      products={products.map((product) => ({
        id: product.id,
        name: product.name,
        priceMinor: product.priceMinor,
        url: product.url,
      }))}
    />
  </div>;
}

export default withDatabasePage(DigitalPage);
