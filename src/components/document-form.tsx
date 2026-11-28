"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveDocument } from "@/actions/documents";
import { documentTotals } from "@/lib/documents";
import { formatMoney, parseMoneyToMinor, type Currency } from "@/lib/money";
import { DELIVERY_METHODS, PAYMENT_STATUSES } from "@/lib/orders";
import { userFacingError } from "@/lib/user-facing-error";

type DraftLine = { label: string; quantity: string; unitPrice: string };

export type DocumentDraft = {
  orderId?: string;
  kind: "invoice" | "receipt";
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  customerAddress: string;
  discount: string;
  shipping: string;
  paymentStatus: string;
  deliveryMethod: string;
  lines: { label: string; quantity: number; unitPriceMinor: number }[];
};

export function DocumentForm({ currency, initial }: { currency: Currency; initial: DocumentDraft }) {
  const router = useRouter();
  const locked = Boolean(initial.orderId);
  const [customerName, setCustomerName] = useState(initial.customerName);
  const [customerPhone, setCustomerPhone] = useState(initial.customerPhone);
  const [customerEmail, setCustomerEmail] = useState(initial.customerEmail);
  const [customerAddress, setCustomerAddress] = useState(initial.customerAddress);
  const [discount, setDiscount] = useState(initial.discount);
  const [shipping, setShipping] = useState(initial.shipping);
  const [taxLabel, setTaxLabel] = useState("");
  const [tax, setTax] = useState("0");
  const [paymentStatus, setPaymentStatus] = useState(initial.paymentStatus);
  const [deliveryMethod, setDeliveryMethod] = useState(initial.deliveryMethod);
  const [courier, setCourier] = useState("");
  const [terms, setTerms] = useState("");
  const [note, setNote] = useState("");
  const [lines, setLines] = useState<DraftLine[]>(initial.lines.map((line) => ({
    label: line.label,
    quantity: String(line.quantity),
    unitPrice: (line.unitPriceMinor / 100).toFixed(2),
  })));
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  const priced = lines.flatMap((line) => {
    const unitPriceMinor = parseMoneyToMinor(line.unitPrice);
    if (unitPriceMinor === null) return [];
    return [{ unitPriceMinor, quantity: Number(line.quantity), label: line.label }];
  });
  let preview: ReturnType<typeof documentTotals> | null = null;
  try {
    preview = documentTotals({
      lines: priced,
      discountMinor: parseMoneyToMinor(discount) ?? 0,
      shippingMinor: parseMoneyToMinor(shipping) ?? 0,
      taxMinor: parseMoneyToMinor(tax) ?? 0,
    });
  } catch {
    preview = null;
  }

  return <form className="form-grid" onSubmit={async (event) => {
    event.preventDefault();
    setError("");
    setPending(true);
    try {
      const saved = await saveDocument({
        orderId: initial.orderId,
        kind: initial.kind,
        customerName,
        customerPhone,
        customerEmail,
        customerAddress,
        discount,
        shipping,
        taxLabel,
        tax,
        paymentStatus,
        deliveryMethod,
        courier,
        terms,
        note,
        lines: lines.map((line) => ({
          label: line.label,
          quantity: Number(line.quantity),
          unitPriceMinor: parseMoneyToMinor(line.unitPrice) ?? -1,
        })),
      });
      router.push(`/documents/${saved.id}`);
      router.refresh();
    } catch (cause) {
      setError(userFacingError(cause, "Could not save this document."));
    } finally {
      setPending(false);
    }
  }}>
    <label className="field">Name<input value={customerName} onChange={(event) => setCustomerName(event.target.value)} required disabled={locked} /></label>
    <label className="field">Phone<input value={customerPhone} onChange={(event) => setCustomerPhone(event.target.value)} disabled={locked} /></label>
    <label className="field">Email<input value={customerEmail} onChange={(event) => setCustomerEmail(event.target.value)} type="email" disabled={locked} /></label>
    <label className="field">Address<input value={customerAddress} onChange={(event) => setCustomerAddress(event.target.value)} disabled={locked} /></label>
    {lines.map((line, index) => <div className="form-grid-section" key={`${line.label}-${index}`}>
      <label className="field field-span-2">Item<input value={line.label} onChange={(event) => setLines((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, label: event.target.value } : item))} required disabled={locked} /></label>
      <label className="field">Quantity<input value={line.quantity} onChange={(event) => setLines((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, quantity: event.target.value } : item))} inputMode="decimal" required disabled={locked} /></label>
      <label className="field">Unit price ({currency})<input value={line.unitPrice} onChange={(event) => setLines((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, unitPrice: event.target.value } : item))} inputMode="decimal" required disabled={locked} /></label>
    </div>)}
    {!locked && <div className="form-actions"><button type="button" className="button button-secondary" onClick={() => setLines((current) => [...current, { label: "", quantity: "1", unitPrice: "0.00" }])}>Add line</button></div>}
    <label className="field">Discount ({currency})<input value={discount} onChange={(event) => setDiscount(event.target.value)} inputMode="decimal" disabled={locked} /></label>
    <label className="field">Shipping ({currency})<input value={shipping} onChange={(event) => setShipping(event.target.value)} inputMode="decimal" disabled={locked} /></label>
    <label className="field">Tax label<input value={taxLabel} onChange={(event) => setTaxLabel(event.target.value)} placeholder="Optional" maxLength={40} /></label>
    <label className="field">Tax amount ({currency})<input value={tax} onChange={(event) => setTax(event.target.value)} inputMode="decimal" /></label>
    <label className="field">Payment<select value={paymentStatus} onChange={(event) => setPaymentStatus(event.target.value)}>{PAYMENT_STATUSES.map((status) => <option value={status.id} key={status.id}>{status.label}</option>)}</select></label>
    <label className="field">Delivery<select value={deliveryMethod} onChange={(event) => setDeliveryMethod(event.target.value)}><option value="">Not set</option>{DELIVERY_METHODS.map((method) => <option value={method.id} key={method.id}>{method.label}</option>)}</select></label>
    <label className="field">Courier<input value={courier} onChange={(event) => setCourier(event.target.value)} maxLength={80} /></label>
    <label className="field field-span-2">Terms<textarea value={terms} onChange={(event) => setTerms(event.target.value)} rows={2} maxLength={500} /></label>
    <label className="field field-span-2">Note<textarea value={note} onChange={(event) => setNote(event.target.value)} rows={2} maxLength={500} /></label>
    <p className="field-span-2 empty-copy">Tax is added only when you type an amount. Saving a document does not create another sale.</p>
    {preview && <p className="field-span-2"><b>Total {formatMoney(preview.totalMinor, currency)}</b></p>}
    {error && <p className="form-error field-span-2" role="alert">{error}</p>}
    <div className="form-actions"><span>{initial.kind === "receipt" ? "Receipt" : "Invoice"} details are copied onto the document.</span><button className="button button-primary" type="submit" disabled={pending}>{pending ? "Saving…" : "Save document"}</button></div>
  </form>;
}

export function downloadDocumentFile(kind: "pdf" | "png", lines: string[], filename: string) {
  if (kind === "pdf") {
    const blob = new Blob([buildPdf(lines)], { type: "application/pdf" });
    triggerDownload(URL.createObjectURL(blob), filename);
    return;
  }
  const canvas = document.createElement("canvas");
  canvas.width = 900;
  canvas.height = Math.max(1100, 120 + lines.length * 36);
  const context = canvas.getContext("2d");
  if (!context) return;
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "#1c1420";
  context.font = "24px sans-serif";
  lines.forEach((line, index) => context.fillText(line, 48, 72 + index * 36));
  triggerDownload(canvas.toDataURL("image/png"), filename);
}

function triggerDownload(url: string, filename: string) {
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
}

function pdfEscape(value: string) {
  return value.replace(/[^\x20-\x7E]/g, " ").replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function buildPdf(lines: string[]) {
  const commands = lines.map((line, index) => `BT /F1 12 Tf 48 ${760 - index * 18} Td (${pdfEscape(line)}) Tj ET`).join("\n");
  const objects = [
    "1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n",
    "2 0 obj << /Type /Pages /Count 1 /Kids [3 0 R] >> endobj\n",
    "3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj\n",
    `4 0 obj << /Length ${commands.length} >> stream\n${commands}\nendstream endobj\n`,
    "5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj\n",
  ];
  let body = "%PDF-1.4\n";
  const offsets = [0];
  for (const object of objects) {
    offsets.push(body.length);
    body += object;
  }
  const xref = body.length;
  body += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let index = 1; index <= objects.length; index += 1) body += `${String(offsets[index]).padStart(10, "0")} 00000 n \n`;
  body += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return body;
}

export function DocumentActions({ lines, filename }: { lines: string[]; filename: string }) {
  return <div className="no-print po-heading-actions">
    <button type="button" className="button button-secondary" onClick={() => window.print()}>Print</button>
    <button type="button" className="button button-secondary" onClick={() => downloadDocumentFile("pdf", lines, `${filename}.pdf`)}>PDF</button>
    <button type="button" className="button button-secondary" onClick={() => downloadDocumentFile("png", lines, `${filename}.png`)}>PNG</button>
  </div>;
}