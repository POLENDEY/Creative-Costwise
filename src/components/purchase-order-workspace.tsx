"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, CheckCircle2, FileDown, Plus, Save, Send, Trash2 } from "lucide-react";
import { savePurchaseOrderDraft, submitPurchaseOrder } from "@/actions/purchase-orders";
import { ProductBreakdown } from "@/components/product-breakdown";
import { formatMoney, resolveCurrency, type Currency } from "@/lib/money";

type CatalogProduct = {
  id: string;
  name: string;
  category: string;
  retailPriceMinor: number;
  bulkPriceMinor: number;
  productionCostMinor: number;
  breakdownJson: string;
};
type RequestLine = { priceSetId: string; pricingOption: "retail" | "bulk"; quantity: number };
type PreviousOrder = {
  id: string;
  status: string;
  note: string;
  response: string;
  createdAt: string;
  currency: string;
  lines: Array<{
    id: string;
    productName: string;
    category: string;
    pricingOption: string;
    quantity: number;
    unitPriceMinor: number;
    unitProductionCostMinor: number;
    lineTotalMinor: number;
    breakdownJson: string;
  }>;
};

function statusLabel(status: string) {
  return status.replaceAll("_", " ");
}

export function PurchaseOrderWorkspace({
  name,
  email,
  currency,
  products,
  previousOrders,
  savedDraft,
}: {
  name: string;
  email: string;
  currency: Currency;
  products: CatalogProduct[];
  previousOrders: PreviousOrder[];
  savedDraft: {
    note: string;
    lines: RequestLine[];
    updatedAt: string;
  } | null;
}) {
  const router = useRouter();
  const [lines, setLines] = useState<RequestLine[]>(() => savedDraft?.lines.filter((line) => line.priceSetId) ?? []);
  const [note, setNote] = useState(savedDraft?.note ?? "");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [draftStatus, setDraftStatus] = useState(savedDraft ? `Draft saved ${new Intl.DateTimeFormat("en", { dateStyle: "short", timeStyle: "short" }).format(new Date(savedDraft.updatedAt))}` : "Changes save automatically");
  const [isPending, startTransition] = useTransition();
  const [printingOrderId, setPrintingOrderId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const saveTimer = useRef<number | null>(null);
  const saveQueue = useRef<Promise<void>>(Promise.resolve());
  const submitting = useRef(false);
  const firstRender = useRef(true);
  const draftDirty = useRef(false);
  const draftRevision = useRef(0);
  const latestDraft = useRef({ lines, note });
  latestDraft.current = { lines, note };

  const selectedOrder = previousOrders.find((order) => order.id === printingOrderId);
  const printCurrency = selectedOrder ? resolveCurrency(selectedOrder.currency) : currency;
  const total = useMemo(() => lines.reduce((amount, line) => {
    const product = products.find((item) => item.id === line.priceSetId);
    if (!product) return amount;
    const price = line.pricingOption === "retail" ? product.retailPriceMinor : product.bulkPriceMinor;
    return amount + price * line.quantity;
  }, 0), [lines, products]);

  const enqueueDraftSave = useCallback((nextLines: RequestLine[], nextNote: string, revision: number) => {
    saveQueue.current = saveQueue.current.catch(() => undefined).then(async () => {
      if (submitting.current) return;
      const result = await savePurchaseOrderDraft({ lines: nextLines, note: nextNote });
      if (revision === draftRevision.current) draftDirty.current = false;
      setDraftStatus(result.savedAt
        ? `Draft saved ${new Intl.DateTimeFormat("en", { dateStyle: "short", timeStyle: "short" }).format(new Date(result.savedAt))}`
        : "Draft cleared");
      setError("");
    });
    return saveQueue.current;
  }, []);

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    if (submitting.current || !draftDirty.current) return;
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    setDraftStatus("Saving draft…");
    saveTimer.current = window.setTimeout(() => {
      setIsSaving(true);
      enqueueDraftSave(lines, note, draftRevision.current).catch((reason: unknown) => {
        setError(reason instanceof Error ? reason.message : "The draft could not be saved.");
        setDraftStatus("Draft not saved");
      }).finally(() => setIsSaving(false));
    }, 750);
    return () => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
    };
  }, [enqueueDraftSave, lines, note]);

  useEffect(() => () => {
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    if (!draftDirty.current || submitting.current) return;
    const revision = draftRevision.current;
    const draft = latestDraft.current;
    saveQueue.current = saveQueue.current.catch(() => undefined).then(async () => {
      await savePurchaseOrderDraft(draft);
    });
    saveQueue.current.then(() => {
      if (revision === draftRevision.current) draftDirty.current = false;
    }).catch((reason: unknown) => {
      console.error("Purchase-order draft could not be saved while leaving the page.", reason);
    });
  }, []);

  async function saveDraftNow() {
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    setIsSaving(true);
    setError("");
    try {
      await enqueueDraftSave(lines, note, draftRevision.current);
      setMessage("Your purchase order draft was saved.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The draft could not be saved.");
    } finally {
      setIsSaving(false);
    }
  }

  function markDraftChanged() {
    draftDirty.current = true;
    draftRevision.current += 1;
  }

  function addProduct(productId: string) {
    markDraftChanged();
    setLines((current) => current.some((line) => line.priceSetId === productId)
      ? current.map((line) => line.priceSetId === productId ? { ...line, quantity: line.quantity + 1 } : line)
      : [...current, { priceSetId: productId, pricingOption: "retail", quantity: 1 }]);
    setError("");
    setMessage("");
  }

  function updateLine(index: number, patch: Partial<RequestLine>) {
    markDraftChanged();
    setLines((current) => current.map((line, lineIndex) => lineIndex === index ? { ...line, ...patch } : line));
  }

  function removeLine(index: number) {
    markDraftChanged();
    setLines((current) => current.filter((_, lineIndex) => lineIndex !== index));
  }

  function updateNote(value: string) {
    markDraftChanged();
    setNote(value);
  }

  function printRequest(orderId: string | null) {
    setPrintingOrderId(orderId);
    window.setTimeout(() => window.print(), 80);
  }

  function submit() {
    setError("");
    setMessage("");
    startTransition(async () => {
      submitting.current = true;
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
      try {
        await saveQueue.current;
        const result = await submitPurchaseOrder({ lines, note });
        setLines([]);
        setNote("");
        setMessage(result.emailSent
          ? `Purchase request ${result.id.slice(-8)} was submitted. The admin was notified in the app and by email.`
          : `Purchase request ${result.id.slice(-8)} was submitted. The admin was notified in the app. ${result.message}`);
        router.refresh();
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : "The purchase request could not be submitted.");
      } finally {
        submitting.current = false;
      }
    });
  }

  const printLines = selectedOrder?.lines ?? lines.map((line, index) => {
    const product = products.find((item) => item.id === line.priceSetId);
    const unitPriceMinor = product
      ? line.pricingOption === "retail" ? product.retailPriceMinor : product.bulkPriceMinor
      : 0;
    return {
      id: `${line.priceSetId}-${index}`,
      productName: product?.name ?? "Product",
      category: product?.category ?? "",
      pricingOption: line.pricingOption,
      quantity: line.quantity,
      unitPriceMinor,
      unitProductionCostMinor: product?.productionCostMinor ?? 0,
      lineTotalMinor: unitPriceMinor * line.quantity,
      breakdownJson: product?.breakdownJson ?? "",
    };
  });
  const printTotal = printLines.reduce((sum, line) => sum + line.lineTotalMinor, 0);

  return (
    <div className="feature-page purchase-orders-page">
      <div className="page-heading">
        <div><span className="eyebrow">PRODUCT REQUESTS &amp; COST DETAILS</span><h1>Purchase <em>orders</em></h1><p>Choose products from your saved price list and send the full cost breakdown to your toolkit admin.</p></div>
        <div className="po-heading-actions">
          <button type="button" className="button button-secondary" onClick={saveDraftNow} disabled={isSaving || isPending || (!lines.length && !note.trim())}><Save size={15} /> Save draft</button>
          <button type="button" className="button button-secondary" onClick={() => printRequest(null)} disabled={!lines.length}><FileDown size={16} /> Print / save PDF</button>
        </div>
      </div>

      <div className="purchase-order-layout">
        <section className="panel po-catalog-panel">
          <div className="panel-heading"><div><span className="eyebrow">YOUR SAVED PRODUCTS</span><h2>Choose products for your request</h2></div></div>
          {products.length ? <div className="po-product-list">{products.map((product) => <article className="po-product-card" key={product.id}>
            <div className="po-product-title"><span className="price-card-art"><FileDown size={18} /></span><span><b>{product.name}</b><small>{product.category} · Production cost {formatMoney(product.productionCostMinor, currency)}</small></span></div>
            <ProductBreakdown breakdownJson={product.breakdownJson} currency={currency} />
            <button type="button" className="button button-secondary po-add-product" onClick={() => addProduct(product.id)}><Plus size={14} /> Add to purchase order</button>
          </article>)}</div> : <div className="empty-state"><div className="empty-illustration"><FileDown size={24} /></div><b>Save a price set to begin.</b><p>Your approved product prices will appear here with their material, printing, labor, and production-cost breakdown.</p><Link className="button button-secondary" href="/costing">Open product costing <ArrowRight size={14} /></Link></div>}
        </section>

        <section className="panel po-compose-panel">
          <div className="panel-heading"><div><span className="eyebrow">YOUR PURCHASE REQUEST</span><h2>Product order form</h2><p>We include your saved cost details with every product.</p><span className={`po-save-status ${isSaving ? "po-save-status-saving" : ""}`} role="status">{draftStatus}</span></div><span className="po-draft-badge">DRAFT</span></div>
          {lines.length ? <div className="po-selected-list">{lines.map((line, index) => {
            const product = products.find((item) => item.id === line.priceSetId);
            if (!product) return null;
            const unitPrice = line.pricingOption === "retail" ? product.retailPriceMinor : product.bulkPriceMinor;
            return <article className="po-selected-product" key={line.priceSetId}>
              <div className="po-selected-title"><b>{product.name}</b><button type="button" className="icon-button remove-line" onClick={() => removeLine(index)} aria-label={`Remove ${product.name}`}><Trash2 size={15} /></button></div>
              <div className="po-selected-fields">
                <label className="field">Price option<select value={line.pricingOption} onChange={(event) => updateLine(index, { pricingOption: event.target.value as "retail" | "bulk" })}><option value="retail">Retail · {formatMoney(product.retailPriceMinor, currency)}</option><option value="bulk">Bulk · {formatMoney(product.bulkPriceMinor, currency)}</option></select></label>
                <label className="field">Quantity<input type="number" min="1" max="10000" step="1" value={line.quantity} onChange={(event) => updateLine(index, { quantity: Math.max(1, Number(event.target.value) || 1) })} /></label>
              </div>
              <div className="po-line-summary"><span>Production cost <b>{formatMoney(product.productionCostMinor, currency)} / piece</b></span><span>Line total <b>{formatMoney(unitPrice * line.quantity, currency)}</b></span><span>Estimated product cost <b>{formatMoney(product.productionCostMinor * line.quantity, currency)}</b></span></div>
              <ProductBreakdown breakdownJson={product.breakdownJson} currency={currency} />
            </article>;
          })}</div> : <div className="po-empty-selection"><Plus size={17} /><span>Add one or more products from your saved price list.</span></div>}

          <label className="field po-note-field">Note for the admin (optional)<textarea value={note} onChange={(event) => updateNote(event.target.value)} rows={3} maxLength={1200} placeholder="Add a quantity note, request, or anything the admin should know." /></label>
          <div className="po-total-card"><span>Estimated order total</span><b>{formatMoney(total, currency)}</b><small>Based on your saved retail or bulk prices. The production-cost breakdown is included separately.</small></div>
          {error && <div className="action-message action-message-error" role="alert">{error}</div>}
          {message && <div className="action-message action-message-success" role="status"><CheckCircle2 size={15} />{message}</div>}
          <button type="button" className="button button-primary po-submit-button" onClick={submit} disabled={!lines.length || isPending || isSaving}><Send size={15} />{isPending ? "Submitting…" : "Submit purchase request"}</button>
          <p className="po-privacy-note">Drafts are private until submitted. Submitted requests and admin responses appear here and in the admin workspace.</p>
        </section>
      </div>

      <section className="panel po-history-panel">
        <div className="panel-heading"><div><span className="eyebrow">YOUR REQUEST HISTORY</span><h2>Responses from your admin</h2></div></div>
        {previousOrders.length ? <div className="po-history-list">{previousOrders.map((order) => {
          const orderTotal = order.lines.reduce((sum, line) => sum + line.lineTotalMinor, 0);
          return <details className="po-history-card" key={order.id}>
            <summary><span className="po-history-summary"><b>Request {order.id.slice(-8).toUpperCase()}</b><small>{new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(order.createdAt))} · {order.lines.length} product{order.lines.length === 1 ? "" : "s"}</small></span><span className={`po-status po-status-${order.status}`}>{statusLabel(order.status)}</span><b className="po-history-total">{formatMoney(orderTotal, currency)}</b></summary>
            <div className="po-history-body">
              {order.lines.map((line) => <article className="po-history-line" key={line.id}><div className="po-history-line-head"><b>{line.productName}</b><span>{line.quantity} × {formatMoney(line.unitPriceMinor, resolveCurrency(order.currency))} = <b>{formatMoney(line.lineTotalMinor, resolveCurrency(order.currency))}</b></span></div><div className="po-line-summary"><span>Production cost / piece <b>{formatMoney(line.unitProductionCostMinor, resolveCurrency(order.currency))}</b></span><span>Pricing <b>{line.pricingOption}</b></span></div><ProductBreakdown breakdownJson={line.breakdownJson} currency={resolveCurrency(order.currency)} /></article>)}
              {order.note && <p className="po-history-note"><b>Your note:</b> {order.note}</p>}
              {order.status === "changes_requested" && <p className="po-history-note">Please submit a new purchase request with the requested updates. This original request stays in your history.</p>}
              {order.response && <div className="po-admin-response"><span className="eyebrow">ADMIN RESPONSE</span><p>{order.response}</p></div>}
              <button type="button" className="button button-secondary" onClick={() => printRequest(order.id)}><FileDown size={14} /> Print / save as PDF</button>
            </div>
          </details>;
        })}</div> : <div className="po-history-empty">Submitted forms and replies from your admin will appear here.</div>}
      </section>

      <section className="po-print-area" aria-hidden="true">
        <div className="po-print-header"><div><span className="eyebrow">CREATIVE COSTWISE</span><h1>Purchase request</h1></div><div><b>{selectedOrder ? `Request ${selectedOrder.id.slice(-8).toUpperCase()}` : "DRAFT REQUEST"}</b><small>{new Intl.DateTimeFormat("en", { dateStyle: "long" }).format(selectedOrder ? new Date(selectedOrder.createdAt) : new Date())}</small></div></div>
        <div className="po-print-from"><span><small>REQUESTED BY</small><b>{name}</b><span>{email}</span></span><span><small>TO</small><b>Creative Costwise Admin</b><span>Product request and cost estimate</span></span></div>
        <table className="po-print-table"><thead><tr><th>Product &amp; cost breakdown</th><th>Qty</th><th>Unit price</th><th>Line total</th></tr></thead><tbody>{printLines.map((line) => <tr key={line.id}><td><b>{line.productName}</b><small>{line.category} · {line.pricingOption} pricing · production cost {formatMoney(line.unitProductionCostMinor, printCurrency)} / piece</small><ProductBreakdown breakdownJson={line.breakdownJson} currency={printCurrency} /></td><td>{line.quantity}</td><td>{formatMoney(line.unitPriceMinor, printCurrency)}</td><td>{formatMoney(line.lineTotalMinor, printCurrency)}</td></tr>)}</tbody></table>
        <div className="po-print-total"><span>Estimated order total</span><b>{formatMoney(selectedOrder ? printTotal : total, printCurrency)}</b></div>
        {(selectedOrder?.note || note) && <div className="po-print-note"><b>Note</b><p>{selectedOrder?.note ?? note}</p></div>}
        {selectedOrder?.response && <div className="po-print-note"><b>Admin response · {statusLabel(selectedOrder.status)}</b><p>{selectedOrder.response}</p></div>}
        <p className="po-print-footnote">Product costs are estimates from the saved product-costing details at the time this request was submitted.</p>
      </section>
    </div>
  );
}
