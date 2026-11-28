"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Boxes, Check, Save } from "lucide-react";
import { updateAdminInventoryQuantity } from "@/actions/purchase-orders";
import { ProductBreakdown } from "@/components/product-breakdown";
import { formatMoney, resolveCurrency } from "@/lib/money";
import { userFacingError } from "@/lib/user-facing-error";

type InventoryRow = {
  id: string;
  crafterName: string;
  crafterEmail: string;
  productName: string;
  category: string;
  currency: string;
  quantityReceived: number;
  quantityOnHand: number;
  unitPriceMinor: number;
  unitProductionCostMinor: number;
  breakdownJson: string;
  createdAt: string;
};

function InventoryItem({ item }: { item: InventoryRow }) {
  const router = useRouter();
  const [quantity, setQuantity] = useState(String(item.quantityOnHand));
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const currency = resolveCurrency(item.currency);

  function save(formData: FormData) {
    setError("");
    setMessage("");
    startTransition(async () => {
      try {
        await updateAdminInventoryQuantity(formData);
        setMessage("Stock updated.");
        router.refresh();
      } catch (reason) {
        setError(userFacingError(reason, "Stock could not be updated."));
      }
    });
  }

  return <article className="panel inventory-item">
    <header className="inventory-item-header"><div><span className="eyebrow">{item.category}</span><h2>{item.productName}</h2><p>Requested by {item.crafterName} · <a href={`mailto:${item.crafterEmail}`}>{item.crafterEmail}</a></p></div><span className="inventory-current-stock"><b>{item.quantityOnHand}</b><small>on hand</small></span></header>
    <div className="inventory-metrics"><span>Quantity received <b>{item.quantityReceived}</b></span><span>Retail / unit <b>{formatMoney(item.unitPriceMinor, currency)}</b></span><span>Production cost / unit <b>{formatMoney(item.unitProductionCostMinor, currency)}</b></span><span>Approved <b>{new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(item.createdAt))}</b></span></div>
    <ProductBreakdown breakdownJson={item.breakdownJson} currency={currency} />
    <form className="inventory-stock-form" action={save}>
      <input type="hidden" name="inventoryItemId" value={item.id} />
      <label className="field">Update on-hand quantity<input name="quantityOnHand" type="number" min="0" max="100000000" step="1" value={quantity} onChange={(event) => setQuantity(event.target.value)} required /></label>
      <button className="button button-secondary" disabled={pending}><Save size={14} />{pending ? "Saving…" : "Save stock"}</button>
      {message && <span className="inventory-save-success" role="status"><Check size={14} />{message}</span>}
      {error && <span className="form-error" role="alert">{error}</span>}
    </form>
  </article>;
}

export function AdminInventory({ items }: { items: InventoryRow[] }) {
  return items.length ? <div className="inventory-list">{items.map((item) => <InventoryItem key={item.id} item={item} />)}</div> : <div className="panel empty-state"><div className="empty-illustration"><Boxes size={24} /></div><b>No approved products in inventory yet.</b><p>Products enter this admin-only catalog when you approve a crafter’s purchase request.</p></div>;
}
