"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, ArrowDownWideNarrow, ArrowUpWideNarrow, ArrowUpRight, PackagePlus, Search } from "lucide-react";
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

export function MaterialLibrary({ materials, currency }: { materials: MaterialRow[]; currency: Currency }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All materials");
  const [ascending, setAscending] = useState(true);
  const categories = [...new Set(materials.map((material) => material.category))];
  const filtered = useMemo(() => materials
    .filter((material) => category === "All materials" || material.category === category)
    .filter((material) => material.name.toLowerCase().includes(query.trim().toLowerCase()))
    .sort((a, b) => (a.name.localeCompare(b.name) * (ascending ? 1 : -1))), [materials, category, query, ascending]);

  return <section className="panel library-panel">
    <div className="panel-heading library-heading"><div><span className="eyebrow">THE MATERIAL LIBRARY</span><h2>Everything you make with</h2></div><div className="library-tools"><span className="search-field"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search materials" aria-label="Search materials" /></span><button className="icon-button sort-button" onClick={() => setAscending((value) => !value)} aria-label={ascending ? "Sort Z to A" : "Sort A to Z"} title={ascending ? "Sort Z to A" : "Sort A to Z"}>{ascending ? <ArrowDownWideNarrow size={17} /> : <ArrowUpWideNarrow size={17} />}</button></div></div>
    {categories.length > 0 && <div className="category-chips"><button onClick={() => setCategory("All materials")} className={`category-chip ${category === "All materials" ? "category-chip-selected" : ""}`}>All materials <span>{materials.length}</span></button>{categories.slice(0, 5).map((value) => <button onClick={() => setCategory(value)} className={`category-chip ${category === value ? "category-chip-selected" : ""}`} key={value}>{value}</button>)}</div>}
    {filtered.length ? <div className="material-table-wrap"><table className="data-table material-table">
      <thead><tr><th>Material</th><th>Category</th><th>Pack cost</th><th>Cost per unit</th><th>On hand</th><th>Supplier</th></tr></thead>
      <tbody>{filtered.map((material) => {
        const low = material.lowStockAlert !== null && material.quantityOnHand <= material.lowStockAlert;
        return <tr key={material.id}>
          <td><div className="material-name-cell"><span className="material-swatch">{material.name.slice(0, 1).toUpperCase()}</span><span><b>{material.name}</b><small>{[material.finish === "other" ? material.finishOther : material.finish, material.gsm && `${material.gsm} gsm`].filter(Boolean).join(" · ") || material.unitLabel}</small></span></div></td>
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
