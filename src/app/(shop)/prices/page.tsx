import Link from "next/link";
import { ArrowRight, Image as ImageIcon, Tag } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireCrafter } from "@/lib/session";
import { formatMoney, resolveCurrency } from "@/lib/money";

export default async function PricesPage() {
  const user = await requireCrafter();
  const [settings, priceSets] = await Promise.all([
    prisma.shopSettings.findUnique({ where: { userId: user.id } }),
    prisma.priceSet.findMany({ where: { userId: user.id }, include: { costingTab: { select: { name: true } } }, orderBy: { updatedAt: "desc" } }),
  ]);
  const currency = resolveCurrency(settings?.currency);
  const categories = [...new Set(priceSets.map((item) => item.category))];

  return <div className="feature-page">
    <div className="page-heading"><div><span className="eyebrow">PRICES THAT MAKE SENSE</span><h1>Your <em>price list</em></h1><p>Each price stays connected to the costing tab that made it.</p></div><Link href="/costing" className="button button-primary"><Tag size={17} /> Cost a new product</Link></div>
    {priceSets.length ? categories.map((category) => <section className="panel price-category-panel" key={category}><div className="panel-heading"><div><span className="eyebrow">{priceSets.filter((item) => item.category === category).length} SAVED VARIATIONS</span><h2>{category}</h2></div></div><div className="price-list">{priceSets.filter((item) => item.category === category).map((item) => <article className="price-card" key={item.id}><span className="price-card-art"><ImageIcon size={20} /></span><div className="price-card-info"><b>{item.name}</b><small>From {item.costingTab.name}</small></div><div className="price-card-amount"><small>Production cost</small><b>{formatMoney(item.productionCostMinor, currency)}</b></div><div className="price-card-amount"><small>Retail · Bulk</small><b>{formatMoney(item.retailPriceMinor, currency)} <span>/</span> {formatMoney(item.bulkPriceMinor, currency)}</b></div><Link href={`/costing?tab=${item.costingTabId}`} aria-label={`Open costing tab for ${item.name}`}><ArrowRight size={17} /></Link></article>)}</div></section>) : <div className="panel empty-state"><div className="empty-illustration"><Tag size={24} /></div><b>Your best prices, all in one place.</b><p>Cost a product, then save a price set to start building your shop price list.</p><Link className="button button-primary" href="/costing">Start a cost estimate <ArrowRight size={15} /></Link></div>}
  </div>;
}
