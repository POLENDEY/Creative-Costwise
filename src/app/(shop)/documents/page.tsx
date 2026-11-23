import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireCrafter } from "@/lib/session";
import { documentTotals } from "@/lib/documents";
import { formatMoney, resolveCurrency } from "@/lib/money";

export default async function DocumentsPage() {
  const user = await requireCrafter();
  const [documents, lines] = await Promise.all([
    prisma.businessDocument.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" } }),
    prisma.businessDocumentLine.findMany({ where: { userId: user.id } }),
  ]);

  return <div className="feature-page">
    <div className="page-heading">
      <div><span className="eyebrow">INVOICES AND RECEIPTS</span><h1>Documents</h1><p>A saved document keeps its own copy of the customer and prices. It does not create a sale.</p></div>
      <Link href="/documents/new?kind=invoice" className="button button-primary">New invoice</Link>
    </div>
    {documents.length ? <ul className="movement-list">{documents.map((document) => {
      const documentLines = lines.filter((line) => line.documentId === document.id);
      const totals = documentTotals({
        lines: documentLines,
        discountMinor: document.discountMinor,
        shippingMinor: document.shippingMinor,
        taxMinor: document.taxMinor,
      });
      return <li key={document.id}><b>{document.number}</b><span>{document.customerName}</span><span>{formatMoney(totals.totalMinor, resolveCurrency(document.currency))}</span><Link href={`/documents/${document.id}`}>Open</Link></li>;
    })}</ul> : <section className="panel"><p className="empty-copy">Create an invoice on its own, or open an order and make an invoice or a receipt from it.</p></section>}
  </div>;
}
