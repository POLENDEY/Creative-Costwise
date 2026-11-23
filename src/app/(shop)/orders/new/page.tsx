import Link from "next/link";
import { OrderForm, type OrderFormValues } from "@/components/order-form";
import { formatIsoDate } from "@/lib/orders";
import { prisma } from "@/lib/prisma";
import { requireCrafter } from "@/lib/session";
import { resolveCurrency } from "@/lib/money";

function moneyInput(minor: number) {
  return (minor / 100).toFixed(2);
}

export default async function NewOrderPage({ searchParams }: { searchParams: Promise<{ from?: string }> }) {
  const user = await requireCrafter();
  const { from } = await searchParams;
  const [settings, customers, products, bundles, digitals, source] = await Promise.all([
    prisma.shopSettings.findUnique({ where: { userId: user.id } }),
    prisma.customer.findMany({ where: { userId: user.id }, orderBy: { name: "asc" } }),
    prisma.priceSet.findMany({ where: { userId: user.id }, orderBy: { name: "asc" } }),
    prisma.bundle.findMany({ where: { userId: user.id }, orderBy: { name: "asc" } }),
    prisma.digitalProduct.findMany({ where: { userId: user.id }, orderBy: { name: "asc" } }),
    from ? prisma.shopOrder.findFirst({ where: { id: from, userId: user.id } }) : Promise.resolve(null),
  ]);
  const sourceLines = source
    ? await prisma.shopOrderLine.findMany({ where: { orderId: source.id, userId: user.id } })
    : [];
  const currency = resolveCurrency(settings?.currency);
  const initial: OrderFormValues | undefined = source ? {
    customerId: source.customerId,
    customerName: source.customerName,
    customerPhone: source.customerPhone,
    customerEmail: source.customerEmail,
    customerAddress: source.customerAddress,
    paymentStatus: source.paymentStatus,
    deliveryMethod: source.deliveryMethod,
    dueOn: formatIsoDate(source.dueOn),
    followUpOn: formatIsoDate(source.followUpOn),
    note: source.note,
    discountKind: "fixed",
    discountValue: moneyInput(source.discountMinor),
    shipping: moneyInput(source.shippingMinor),
    lines: sourceLines.map((line) => ({
      kind: line.kind === "bundle" || line.kind === "digital" ? line.kind : "product",
      priceSetId: line.priceSetId,
      sourceId: line.sourceId,
      priceOption: line.priceOption === "bulk" ? "bulk" as const : "retail" as const,
      quantity: Number(line.quantity),
    })),
  } : undefined;

  return <div className="feature-page">
    <div className="page-heading">
      <div><span className="eyebrow">{source ? "REORDER" : "NEW ORDER"}</span><h1>{source ? "New order from the last one" : "Start an order"}</h1><p>{source ? "This is a new order. The original stays where it is, with its own prices." : "Pick a saved customer or type the details for this order only."}</p></div>
      <Link href="/orders" className="button button-secondary">Back to the board</Link>
    </div>
    <section className="panel">
      <OrderForm
        customers={customers}
        products={products.map((product) => ({
          id: product.id,
          name: product.name,
          category: product.category,
          retailPriceMinor: product.retailPriceMinor,
          bulkPriceMinor: product.bulkPriceMinor,
        }))}
        bundles={bundles.map((bundle) => ({ id: bundle.id, name: bundle.name, priceMinor: bundle.priceMinor }))}
        digitals={digitals.map((digital) => ({ id: digital.id, name: digital.name, priceMinor: digital.priceMinor }))}
        currency={currency}
        initial={initial}
        submitLabel="Save order"
      />
    </section>
  </div>;
}
