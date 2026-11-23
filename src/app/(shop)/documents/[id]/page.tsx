import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DocumentActions } from "@/components/document-form";
import { documentPlainLines, documentTotals } from "@/lib/documents";
import { lineTotalMinor } from "@/lib/orders";
import { formatMoney, resolveCurrency } from "@/lib/money";
import { PAYMENT_STATUSES } from "@/lib/orders";
import { prisma } from "@/lib/prisma";
import { requireCrafter } from "@/lib/session";

export default async function DocumentPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireCrafter();
  const { id } = await params;
  const [document, lines] = await Promise.all([
    prisma.businessDocument.findFirst({ where: { id, userId: user.id } }),
    prisma.businessDocumentLine.findMany({ where: { documentId: id, userId: user.id } }),
  ]);
  if (!document) notFound();
  const currency = resolveCurrency(document.currency);
  const totals = documentTotals({
    lines,
    discountMinor: document.discountMinor,
    shippingMinor: document.shippingMinor,
    taxMinor: document.taxMinor,
  });
  const payment = PAYMENT_STATUSES.find((status) => status.id === document.paymentStatus)?.label ?? document.paymentStatus;
  const plain = documentPlainLines({
    kind: document.kind,
    number: document.number,
    businessName: document.businessName,
    customerName: document.customerName,
    currencyLabel: currency,
    lines: lines.map((line) => ({
      label: line.label,
      quantity: Number(line.quantity),
      amount: formatMoney(line.unitPriceMinor, currency).replace(/[^\x20-\x7E]/g, ""),
    })),
    subtotal: formatMoney(totals.subtotalMinor, currency).replace(/[^\x20-\x7E]/g, ""),
    discount: formatMoney(totals.discountMinor, currency).replace(/[^\x20-\x7E]/g, ""),
    shipping: formatMoney(totals.shippingMinor, currency).replace(/[^\x20-\x7E]/g, ""),
    taxLabel: document.taxLabel,
    tax: formatMoney(totals.taxMinor, currency).replace(/[^\x20-\x7E]/g, ""),
    total: formatMoney(totals.totalMinor, currency).replace(/[^\x20-\x7E]/g, ""),
    payment,
  });

  return <div className="feature-page">
    <div className="page-heading no-print">
      <div><span className="eyebrow">{document.kind === "receipt" ? "RECEIPT" : "INVOICE"}</span><h1>{document.number}</h1></div>
      <DocumentActions lines={plain} filename={document.number} />
    </div>
    <article className="document-sheet">
      <header>
        {document.logoPath ? <Image src={document.logoPath} alt="" width={64} height={64} /> : null}
        <div><b>{document.businessName || "Your business"}</b><small>{[document.businessAddress, document.businessPhone, document.businessEmail].filter(Boolean).join(" · ")}</small></div>
        <div><b>{document.kind === "receipt" ? "Receipt" : "Invoice"} {document.number}</b><small>{document.issuedOn.toLocaleDateString()}</small></div>
      </header>
      <p><b>{document.customerName}</b><br />{[document.customerAddress, document.customerPhone, document.customerEmail].filter(Boolean).join(" · ")}</p>
      <table className="data-table">
        <thead><tr><th>Item</th><th>Qty</th><th>Price</th><th>Amount</th></tr></thead>
        <tbody>{lines.map((line) => <tr key={line.id}><td>{line.label}</td><td>{line.quantity}</td><td>{formatMoney(line.unitPriceMinor, currency)}</td><td>{formatMoney(lineTotalMinor(line.unitPriceMinor, Number(line.quantity)), currency)}</td></tr>)}</tbody>
      </table>
      <p>Products {formatMoney(totals.subtotalMinor, currency)} · Discount {formatMoney(totals.discountMinor, currency)} · Shipping {formatMoney(totals.shippingMinor, currency)} · {document.taxLabel || "Tax"} {formatMoney(totals.taxMinor, currency)}</p>
      <p><b>Total {formatMoney(totals.totalMinor, currency)}</b> · {payment}{document.courier ? ` · ${document.courier}` : ""}</p>
      {(document.paymentAccountName || document.bankDetails || document.gcashNumber) && <p>{[document.paymentAccountName, document.bankDetails, document.gcashNumber && `GCash ${document.gcashNumber}`].filter(Boolean).join(" · ")}</p>}
      {document.terms && <p>{document.terms}</p>}
      {document.note && <p>{document.note}</p>}
    </article>
    <p className="empty-copy no-print">Print includes your logo. The PDF and PNG downloads use the same figures in plain text. This document does not change sales.</p>
    <Link href="/documents" className="button button-secondary no-print">All documents</Link>
  </div>;
}
