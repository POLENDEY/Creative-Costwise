"use client";

import { userFacingError } from "@/lib/user-facing-error";

import { useMemo, useState, useTransition } from "react";
import { createSupplierOrder, deleteSupplierOrder, setSupplierOrderStatus } from "@/actions/supplier-orders";
import { formatMoney, type Currency } from "@/lib/money";

type ShelfItem = {
  id: string;
  name: string;
  unitLabel: string;
  piecesPerPack: number;
  pricePerPackMinor: number;
  quantityOnHand: number;
  lowStockAlert: number | null;
};

type SavedLine = { materialName: string; packs: number; packPriceMinor: number };
type SavedOrder = { id: string; supplierName: string; status: string; note: string; lines: SavedLine[] };

function suggestedPacks(item: ShelfItem) {
  if (item.lowStockAlert === null || item.quantityOnHand > item.lowStockAlert) return 0;
  const need = Math.max(item.piecesPerPack, item.lowStockAlert * 2 - item.quantityOnHand);
  return Math.max(1, Math.ceil(need / item.piecesPerPack));
}

export function SupplierOrders({
  materials,
  orders,
  currency,
}: {
  materials: ShelfItem[];
  orders: SavedOrder[];
  currency: Currency;
}) {
  const suggestions = useMemo(() => materials
    .map((item) => ({ item, packs: suggestedPacks(item) }))
    .filter((row) => row.packs > 0), [materials]);
  const [picked, setPicked] = useState<Record<string, boolean>>(() => Object.fromEntries(suggestions.map((row) => [row.item.id, true])));
  const [packs, setPacks] = useState<Record<string, string>>(() => Object.fromEntries(suggestions.map((row) => [row.item.id, String(row.packs)])));
  const [supplierName, setSupplierName] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [pending, start] = useTransition();

  const chosen = materials.filter((item) => picked[item.id]);
  const totalMinor = chosen.reduce((sum, item) => {
    const count = Number(packs[item.id]);
    return sum + (Number.isFinite(count) && count > 0 ? Math.round(count * item.pricePerPackMinor) : 0);
  }, 0);

  function save() {
    setError("");
    setMessage("");
    const lines = chosen.flatMap((item) => {
      const count = Number(packs[item.id] ?? "1");
      if (!Number.isFinite(count) || count <= 0) return [];
      return [{ materialId: item.id, packs: count, packPriceMinor: item.pricePerPackMinor }];
    });
    if (!supplierName.trim() || !lines.length) {
      setError("Name the supplier and choose at least one material.");
      return;
    }
    start(async () => {
      try {
        await createSupplierOrder({ supplierName, note, lines });
        setMessage("Supplier order saved. Mark it received when the stock arrives.");
        setNote("");
      } catch (cause) {
        setError(userFacingError(cause, "The supplier order could not be saved."));
      }
    });
  }

  function update(id: string, status: "sent" | "received") {
    setError("");
    start(async () => {
      try {
        await setSupplierOrderStatus(id, status);
        setMessage(status === "received" ? "Stock updated from that delivery." : "Marked as sent.");
      } catch (cause) {
        setError(userFacingError(cause, "The supplier order could not be updated."));
      }
    });
  }

  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <span className="eyebrow">SUPPLIER</span>
          <h2>Order from a supplier</h2>
          <p>Tick what you need. Anything at or under its alert starts ticked. Save the order, then add the stock when it arrives.</p>
        </div>
      </div>
      {error && <p className="form-error" role="alert">{error}</p>}
      {message && <p className="action-message" role="status">{message}</p>}
      <div className="supplier-grid">
        <label className="field">Supplier name<input value={supplierName} onChange={(event) => setSupplierName(event.target.value)} maxLength={120} placeholder="Paper shop or marketplace" /></label>
        <label className="field">Note<input value={note} onChange={(event) => setNote(event.target.value)} maxLength={500} placeholder="Optional, for example pickup on Friday" /></label>
      </div>
      <ul className="record-list">
        {(suggestions.length ? suggestions.map((row) => row.item) : materials).map((item) => (
          <li className="record-card" key={item.id}>
            <label className="record-main supplier-pick">
              <input type="checkbox" checked={Boolean(picked[item.id])} onChange={(event) => {
                const on = event.target.checked;
                setPicked((current) => ({ ...current, [item.id]: on }));
                if (on) setPacks((current) => ({ ...current, [item.id]: current[item.id] || "1" }));
              }} />
              <span>
                <b>{item.name}</b>
                <span className="record-meta"><span>{item.quantityOnHand} {item.unitLabel} on hand</span><span>{formatMoney(item.pricePerPackMinor, currency)} / pack</span></span>
              </span>
            </label>
            <label className="supplier-packs">Packs<input value={packs[item.id] ?? "1"} onChange={(event) => setPacks((current) => ({ ...current, [item.id]: event.target.value }))} inputMode="decimal" /></label>
          </li>
        ))}
      </ul>
      <div className="form-actions">
        <span>Estimated total {formatMoney(totalMinor, currency)} at your saved pack prices.</span>
        <button type="button" className="button button-primary" onClick={save} disabled={pending}>{pending ? "Saving…" : "Save supplier order"}</button>
      </div>
      {orders.length > 0 && <ul className="record-list supplier-saved">
        {orders.map((order) => {
          const total = order.lines.reduce((sum, line) => sum + Math.round(line.packs * line.packPriceMinor), 0);
          return (
            <li className="record-card" key={order.id}>
              <div className="record-main">
                <b>{order.supplierName}</b>
                <p className="record-meta">
                  <span>{order.status}</span>
                  <span className="record-price">{formatMoney(total, currency)}</span>
                  {order.lines.map((line) => <span key={line.materialName}>{line.materialName} · {line.packs} pack{line.packs === 1 ? "" : "s"}</span>)}
                </p>
                {order.note && <p className="record-meta"><span>{order.note}</span></p>}
              </div>
              <div className="record-actions">
                {order.status === "draft" && <button type="button" className="button button-secondary" onClick={() => update(order.id, "sent")} disabled={pending}>Mark sent</button>}
                {order.status !== "received" && <button type="button" className="button button-primary" onClick={() => update(order.id, "received")} disabled={pending}>Received</button>}
                {order.status !== "received" && <button type="button" className="button button-secondary" onClick={() => { setError(""); start(async () => { try { await deleteSupplierOrder(order.id); } catch (cause) { setError(userFacingError(cause, "Could not delete that order.")); } }); }} disabled={pending}>Delete</button>}
              </div>
            </li>
          );
        })}
      </ul>}
    </section>
  );
}
