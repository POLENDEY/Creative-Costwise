import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireCrafter } from "@/lib/session";
import { documentTotals } from "@/lib/documents";
import { formatMoney, resolveCurrency } from "@/lib/money";
import { withDatabasePage } from "@/lib/with-database-page";

async function DocumentsPage() {
  const user = await requireCrafter("documents");
  const [documents, lines] = await Promise.all([
    prisma.businessDocument.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" } }),
    prisma.businessDocumentLine.findMany({ where: { userId: user.id } }),
  ]);

  return <div className="feature-page">
    <div className="page-heading">
      <div><span className="eyebrow">INVOICES AND RECEIPTS</span><h1>Documents</h1><p>A saved document keeps its own copy of the customer and prices. It does not create a sale.</p></div>
      <Link href="/documents/new?kind=invoice" className="button button-primary">New invoice</Link>
    </div>
    {documents.length ? <section className="panel"><div className="panel-heading"><div><span className="eyebrow">SAVED</span><h2>Invoices and receipts</h2></div></div><ul className="record-list">{documents.map((document) => {
      const documentLines = lines.filter((line) => line.documentId === document.id);
      const totals = documentTotals({
        lines: documentLines,
        discountMinor: document.discountMinor,
        shippingMinor: document.shippingMinor,
        taxMinor: document.taxMinor,
      });
      return <li className="record-card" key={document.id}>
        <div className="record-main">
          <b>{document.number}</b>
          <p className="record-meta">
            <span>{document.kind === "receipt" ? "Receipt" : "Invoice"}</span>
            <span>{document.customerName}</span>
            <span className="record-price">{formatMoney(totals.totalMinor, resolveCurrency(document.currency))}</span>
          </p>
        </div>
        <div className="record-actions"><Link className="button button-secondary" href={`/documents/${document.id}`}>Open</Link></div>
      </li>;
    })}</ul></section> : <section className="panel"><p className="empty-copy">Create an invoice on its own, or open an order and make an invoice or a receipt from it.</p></section>}
  </div>;
}

export default withDatabasePage(DocumentsPage);
