"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, ArrowDownWideNarrow, ArrowUpWideNarrow, ArrowUpRight, PackagePlus, Search, Star } from "lucide-react";
import { restockMaterial, setMaterialCategoryStar } from "@/actions/inventory";
import { PAYMENT_METHODS } from "@/lib/inventory";
import { calculateMaterialCostPerPiece } from "@/lib/costing";
import { formatMoney, type Currency } from "@/lib/money";

type MaterialRow = {
  id: string;
  category: string;
  name: string;
  piecesPerPack: number;
  pricePerPackMinor: number;
  gsm: string;
  finish: string;
  finishOther: string;
  unitLabel: string;
  quantityOnHand: number;
  lowStockAlert: number | null;
  supplierUrl: string;
};

type CategoryRow = { name: string; starred: boolean };

const paymentLabels: Record<(typeof PAYMENT_METHODS)[number], string> = {
  cash: "Cash",
  gcash: "GCash",
  bank: "Bank transfer",
  card: "Card",
  other: "Other",
};

export function MaterialLibrary({
  materials,
  categories,
  currency,
}: {
  materials: MaterialRow[];
  categories: CategoryRow[];
  currency: Currency;
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All materials");
  const [ascending, setAscending] = useState(true);
  const [starError, setStarError] = useState("");
  const starred = categories.filter((item) => item.starred);
  const filtered = useMemo(() => materials
    .filter((material) => category === "All materials" || material.category === category)
    .filter((material) => material.name.toLowerCase().includes(query.trim().toLowerCase()))
    .sort((a, b) => (a.name.localeCompare(b.name) * (ascending ? 1 : -1))), [materials, category, query, ascending]);

  async function toggleStar(name: string, next: boolean) {
    setStarError("");
    const data = new FormData();
    data.set("name", name);
    data.set("starred", next ? "true" : "false");
    try {
      await setMaterialCategoryStar(data);
    } catch (cause) {
      setStarError(cause instanceof Error ? cause.message : "Could not update that category.");
    }
  }

  return <section className="panel library-panel">
    <div className="panel-heading library-heading"><div><span className="eyebrow">THE MATERIAL LIBRARY</span><h2>Everything you make with</h2></div><div className="library-tools"><span className="search-field"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search materials" aria-label="Search materials" /></span><button className="icon-button sort-button" onClick={() => setAscending((value) => !value)} aria-label={ascending ? "Sort Z to A" : "Sort A to Z"} title={ascending ? "Sort Z to A" : "Sort A to Z"}>{ascending ? <ArrowDownWideNarrow size={17} /> : <ArrowUpWideNarrow size={17} />}</button></div></div>
    {categories.length > 0 && <div className="category-row">
      <div className="category-chips">
        <button onClick={() => setCategory("All materials")} className={`category-chip ${category === "All materials" ? "category-chip-selected" : ""}`}>All materials <span>{materials.length}</span></button>
        {starred.map((item) => <button onClick={() => setCategory(item.name)} className={`category-chip ${category === item.name ? "category-chip-selected" : ""}`} key={item.name}><Star size={12} /> {item.name}</button>)}
      </div>
      <label className="field category-filter">Category
        <select value={category} onChange={(event) => setCategory(event.target.value)} aria-label="Filter by category">
          <option>All materials</option>
          {categories.map((item) => <option key={item.name}>{item.name}</option>)}
        </select>
      </label>
    </div>}
    {categories.length > 0 && <div className="star-row">{categories.map((item) => <button type="button" className={`star-chip ${item.starred ? "star-chip-on" : ""}`} key={item.name} aria-pressed={item.starred} onClick={() => toggleStar(item.name, !item.starred)}><Star size={12} /> {item.starred ? "Starred" : "Star"} {item.name}</button>)}</div>}
    {starError && <p className="form-error" role="alert">{starError}</p>}
    {filtered.length ? <div className="material-table-wrap"><table className="data-table material-table">
      <thead><tr><th>Material</th><th>Category</th><th>Pack cost</th><th>Cost per unit</th><th>On hand</th><th>Supplier</th></tr></thead>
      <tbody>{filtered.map((material) => {
        const low = material.lowStockAlert !== null && material.quantityOnHand <= material.lowStockAlert;
        return <tr key={material.id}>
          <td><div className="material-name-cell"><span className="material-swatch">{material.name.slice(0, 1).toUpperCase()}</span><span><b>{material.name}</b><small>{[material.finish === "other" ? material.finishOther : material.finish, material.gsm && `${material.gsm} gsm`].filter(Boolean).join(" · ") || material.unitLabel}</small><RestockForm materialId={material.id} currency={currency} /></span></div></td>
          <td><span className="table-pill">{material.category}</span></td>
          <td>{formatMoney(material.pricePerPackMinor, currency)}<small className="table-subtext">{material.piecesPerPack} per pack</small></td>
          <td className="cost-cell">{formatMoney(calculateMaterialCostPerPiece(material.pricePerPackMinor, material.piecesPerPack), currency)}<small className="table-subtext">per {material.unitLabel}</small></td>
          <td><span className={`stock-count ${low ? "stock-count-low" : ""}`}>{low && <AlertTriangle size={14} />}{material.quantityOnHand} <small>{material.unitLabel}</small></span>{low && <small className="table-subtext">Restock threshold: {material.lowStockAlert}</small>}</td>
          <td>{material.supplierUrl ? <a href={material.supplierUrl} target="_blank" rel="noreferrer" className="supplier-link">Reorder <ArrowUpRight size={13} /></a> : <span className="muted">—</span>}</td>
        </tr>;
      })}</tbody>
    </table></div> : <div className="empty-state"><div className="empty-illustration"><PackagePlus size={25} /></div><b>{materials.length ? "No supplies match this search." : "Your material shelf is ready."}</b><p>{materials.length ? "Try another name or category." : "Add your first supply to see cost per piece and track stock as you create."}</p></div>}
  </section>;
}

function RestockForm({ materialId, currency }: { materialId: string; currency: Currency }) {
  const [requestKey, setRequestKey] = useState(() => crypto.randomUUID());
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  return <form className="restock-form" action={async (formData) => {
    setError("");
    setPending(true);
    formData.set("requestKey", requestKey);
    try {
      await restockMaterial(formData);
      setRequestKey(crypto.randomUUID());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not update stock.");
    } finally {
      setPending(false);
    }
  }}>
    <input type="hidden" name="materialId" value={materialId} />
    <label>New total<input name="newTotal" type="number" min="0" step="0.01" required aria-label="New total on hand" /></label>
    <label>Spent ({currency})<input name="amount" type="number" min="0" step="0.01" required aria-label="Amount spent" /></label>
    <label>Paid with<select name="paymentMethod" defaultValue="cash" aria-label="Payment method">{PAYMENT_METHODS.map((method) => <option value={method} key={method}>{paymentLabels[method]}</option>)}</select></label>
    <button type="submit" className="button button-secondary" disabled={pending}>{pending ? "Saving…" : "Update stock"}</button>
    {error && <small role="alert">{error}</small>}
  </form>;
}
