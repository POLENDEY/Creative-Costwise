import Link from "next/link";
import { notFound } from "next/navigation";
import { DocumentForm, type DocumentDraft } from "@/components/document-form";
import { prisma } from "@/lib/prisma";
import { requireCrafter } from "@/lib/session";
import { resolveCurrency } from "@/lib/money";
import { withDatabasePage } from "@/lib/with-database-page";

function moneyInput(minor: number) {
  return (minor / 100).toFixed(2);
}

async function NewDocumentPage({ searchParams }: { searchParams: Promise<{ order?: string; kind?: string }> }) {
  const user = await requireCrafter("documents");
  const { order: orderId, kind: requestedKind } = await searchParams;
  const kind = requestedKind === "receipt" ? "receipt" : "invoice";
  const [settings, order, orderLines] = await Promise.all([
    prisma.shopSettings.findUnique({ where: { userId: user.id } }),
    orderId ? prisma.shopOrder.findFirst({ where: { id: orderId, userId: user.id } }) : Promise.resolve(null),
    orderId ? prisma.shopOrderLine.findMany({ where: { orderId, userId: user.id } }) : Promise.resolve([]),
  ]);
  if (orderId && !order) notFound();
  const currency = resolveCurrency(order?.currency ?? settings?.currency);
  const initial: DocumentDraft = order ? {
    orderId: order.id,
    kind,
    customerName: order.customerName,
    customerPhone: order.customerPhone,
    customerEmail: order.customerEmail,
    customerAddress: order.customerAddress,
    discount: moneyInput(order.discountMinor),
    shipping: moneyInput(order.shippingMinor),
    paymentStatus: order.paymentStatus,
    deliveryMethod: order.deliveryMethod,
    lines: orderLines.map((line) => ({
      label: line.label,
      quantity: Number(line.quantity),
      unitPriceMinor: line.unitPriceMinor,
    })),
  } : {
    kind,
    customerName: "",
    customerPhone: "",
    customerEmail: "",
    customerAddress: "",
    discount: "0.00",
    shipping: "0.00",
    paymentStatus: "unpaid",
    deliveryMethod: "",
    lines: [{ label: "", quantity: 1, unitPriceMinor: 0 }],
  };

  return <div className="feature-page">
    <div className="page-heading">
      <div><span className="eyebrow">{kind === "receipt" ? "RECEIPT" : "INVOICE"}</span><h1>{order ? `From ${order.customerName}` : "New document"}</h1><p>{order ? "The order prices are copied. Changing the order later leaves this document alone." : "Type the customer and the lines for this document only."}</p></div>
      <Link href="/documents" className="button button-secondary">All documents</Link>
    </div>
    <section className="panel"><DocumentForm currency={currency} initial={initial} /></section>
  </div>;
}

export default withDatabasePage(NewDocumentPage);
