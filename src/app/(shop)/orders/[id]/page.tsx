import Link from "next/link";
import { notFound } from "next/navigation";
import { OrderForm } from "@/components/order-form";
import { DELIVERY_METHODS, formatIsoDate, ORDER_STAGES, orderTotals, PAYMENT_STATUSES } from "@/lib/orders";
import { prisma } from "@/lib/prisma";
import { requireCrafter } from "@/lib/session";
import { formatMoney, resolveCurrency } from "@/lib/money";

function moneyInput(minor: number) {
  return (minor / 100).toFixed(2);
}

function labelFor(options: readonly { id: string; label: string }[], id: string) {
  return options.find((option) => option.id === id)?.label ?? id;
}

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireCrafter();
  const { id } = await params;
  const [order, lines, history, sale, customers, products, bundles, digitals] = await Promise.all([
    prisma.shopOrder.findFirst({ where: { id, userId: user.id } }),
    prisma.shopOrderLine.findMany({ where: { orderId: id, userId: user.id } }),
    prisma.shopOrderStatus.findMany({ where: { orderId: id, userId: user.id }, orderBy: { createdAt: "asc" } }),
    prisma.sale.findFirst({ where: { orderId: id, userId: user.id } }),
    prisma.customer.findMany({ where: { userId: user.id }, orderBy: { name: "asc" } }),
    prisma.priceSet.findMany({ where: { userId: user.id }, orderBy: { name: "asc" } }),
    prisma.bundle.findMany({ where: { userId: user.id }, orderBy: { name: "asc" } }),
    prisma.digitalProduct.findMany({ where: { userId: user.id }, orderBy: { name: "asc" } }),
  ]);
  if (!order) notFound();
  const currency = resolveCurrency(order.currency);
  const totals = orderTotals({ lines, discountMinor: order.discountMinor, shippingMinor: order.shippingMinor });

  return <div className="feature-page">
    <div className="page-heading">
      <div>
        <span className="eyebrow">{labelFor(ORDER_STAGES, order.stage).toUpperCase()}</span>
        <h1>{order.customerName}</h1>
        <p>{labelFor(PAYMENT_STATUSES, order.paymentStatus)} · {labelFor(DELIVERY_METHODS, order.deliveryMethod)}{order.dueOn ? ` · Due ${formatIsoDate(order.dueOn)}` : ""}</p>
      </div>
      <div className="po-heading-actions">
        <Link href={`/documents/new?order=${order.id}&kind=invoice`} className="button button-secondary">Invoice</Link>
        <Link href={`/documents/new?order=${order.id}&kind=receipt`} className="button button-secondary">Receipt</Link>
        <Link href={`/orders/new?from=${order.id}`} className="button button-secondary">Reorder</Link>
      </div>
    </div>
    <section className="panel">
      <ul className="movement-list">
        {lines.map((line) => <li key={line.id}><b>{line.label}</b><span>{line.quantity} × {formatMoney(line.unitPriceMinor, currency)}</span><small>{line.priceOption}</small></li>)}
      </ul>
      <p><b>Total {formatMoney(totals.totalMinor, currency)}</b> <span className="muted">Products {formatMoney(totals.subtotalMinor, currency)} · Discount {formatMoney(totals.discountMinor, currency)} · Shipping {formatMoney(totals.shippingMinor, currency)}</span></p>
      {sale && <p className="empty-copy">Recorded in sales on {formatIsoDate(sale.recognizedOn)} for {formatMoney(sale.amountMinor, currency)}. Moving this order again does not add a second sale.</p>}
      {order.customerAddress && <p className="empty-copy">{order.customerAddress}</p>}
      {order.note && <p className="empty-copy">{order.note}</p>}
    </section>
    {!sale && <section className="panel">
      <div className="panel-heading"><div><span className="eyebrow">UPDATE</span><h2>Edit before it is delivered</h2></div></div>
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
        submitLabel="Save changes"
        initial={{
          id: order.id,
          customerId: order.customerId,
          customerName: order.customerName,
          customerPhone: order.customerPhone,
          customerEmail: order.customerEmail,
          customerAddress: order.customerAddress,
          paymentStatus: order.paymentStatus,
          deliveryMethod: order.deliveryMethod,
          dueOn: formatIsoDate(order.dueOn),
          followUpOn: formatIsoDate(order.followUpOn),
          note: order.note,
          discountKind: "fixed",
          discountValue: moneyInput(order.discountMinor),
          shipping: moneyInput(order.shippingMinor),
          lines: lines.map((line) => ({
            kind: line.kind === "bundle" || line.kind === "digital" ? line.kind : "product" as const,
            priceSetId: line.priceSetId,
            sourceId: line.sourceId,
            priceOption: line.priceOption === "bulk" ? "bulk" as const : "retail" as const,
            quantity: Number(line.quantity),
            unitPriceMinor: line.unitPriceMinor,
          })),
        }}
      />
    </section>}
    <section className="panel">
      <div className="panel-heading"><div><span className="eyebrow">HISTORY</span><h2>Stage changes</h2></div></div>
      <ul className="movement-list">{history.map((entry) => <li key={entry.id}><b>{labelFor(ORDER_STAGES, entry.toStage)}</b><small>{entry.fromStage ? `From ${labelFor(ORDER_STAGES, entry.fromStage)} · ` : ""}{entry.createdAt.toLocaleString()}</small></li>)}</ul>
      <Link href="/orders" className="button button-secondary">Back to the board</Link>
    </section>
  </div>;
}
