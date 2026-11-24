"use client";

import { useMemo, useState, useTransition } from "react";
import {
  AlertCircle,
  ArrowRight,
  Check,
  CircleHelp,
  Plus,
  Printer,
  Save,
  Scissors,
  Trash2,
} from "lucide-react";
import { saveCostingTab, savePriceSet } from "@/actions/shop";
import { calculateCost, calculateMaterialCostPerPiece } from "@/lib/costing";
import { formatMoney, parseMoneyToMinor } from "@/lib/money";

type Material = {
  id: string;
  name: string;
  category: string;
  unitLabel: string;
  quantityOnHand: number;
  piecesPerPack: number;
  pricePerPackMinor: number;
};
type Printer = {
  id: string;
  name: string;
  colorInkPriceMinor: number;
  colorPageYield: number;
  blackInkPriceMinor: number;
  blackPageYield: number;
};
type MaterialLine = { materialId: string; unitsUsed: number; finishedPieces: number };
type PrintLine = {
  printerId: string;
  paperSize: "A4" | "A5" | "A3" | "LETTER" | "LEGAL";
  quality: "draft" | "standard" | "best";
  coverage: "black_white" | "light_color" | "normal_color" | "photo_heavy";
  sheetCount: number;
  finishedPieces: number;
};
type PriceSet = {
  id: string;
  name: string;
  category: string;
  retailPriceMinor: number;
  bulkPriceMinor: number;
  productionCostMinor: number;
};
type CostingTab = {
  id: string;
  name: string;
  overagePercent: number;
  lossPercent: number;
  operationalFeeMinor: number;
  laborPercent: number;
  packagingCostMinor: number;
  markupRetailPercent: number;
  markupBulkPercent: number;
  markupPromoPercent: number;
  markupLoyalPercent: number;
  materialLines: MaterialLine[];
  printLines: PrintLine[];
  priceSets: PriceSet[];
};
type Defaults = Omit<CostingTab, "id" | "name" | "materialLines" | "printLines" | "priceSets" | "overagePercent" | "packagingCostMinor">;

const blankTab = (defaults: Defaults): Omit<CostingTab, "id" | "priceSets"> => ({
  name: "",
  overagePercent: 0,
  lossPercent: defaults.lossPercent,
  operationalFeeMinor: defaults.operationalFeeMinor,
  laborPercent: defaults.laborPercent,
  packagingCostMinor: 0,
  markupRetailPercent: defaults.markupRetailPercent,
  markupBulkPercent: defaults.markupBulkPercent,
  markupPromoPercent: defaults.markupPromoPercent,
  markupLoyalPercent: defaults.markupLoyalPercent,
  materialLines: [],
  printLines: [],
});

const sizeMultipliers = { A5: 0.5, A4: 1, LETTER: 1, LEGAL: 1.2, A3: 2 } as const;
const qualityMultipliers = { draft: 0.6, standard: 1, best: 1.5 } as const;
const coverageMultipliers = { black_white: 0.4, light_color: 0.8, normal_color: 1, photo_heavy: 1.8 } as const;

export function CostingWorkspace({
  currency,
  defaults,
  materials,
  printers,
  tabs: initialTabs,
  requestedTabId,
}: {
  currency: "PHP" | "USD";
  defaults: Defaults;
  materials: Material[];
  printers: Printer[];
  tabs: CostingTab[];
  requestedTabId?: string;
}) {
  const requestedTab = initialTabs.find((tab) => tab.id === requestedTabId) ?? initialTabs[0];
  const [tabs, setTabs] = useState(initialTabs);
  const [activeId, setActiveId] = useState(requestedTab?.id ?? "");
  const [draft, setDraft] = useState<Omit<CostingTab, "id" | "priceSets">>(() =>
    requestedTab ? { ...requestedTab } : blankTab(defaults),
  );
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [priceName, setPriceName] = useState("");
  const [priceCategory, setPriceCategory] = useState("");
  const [retailInput, setRetailInput] = useState("");
  const [bulkInput, setBulkInput] = useState("");

  const result = useMemo(() => calculateCost({
    materialLines: draft.materialLines.map((line) => {
      const material = materials.find((item) => item.id === line.materialId);
      return {
        costPerPieceMinor: material
          ? calculateMaterialCostPerPiece(material.pricePerPackMinor, material.piecesPerPack)
          : 0,
        unitsUsed: line.unitsUsed,
        finishedPieces: line.finishedPieces,
      };
    }),
    printLines: draft.printLines.map((line) => {
      const printer = printers.find((item) => item.id === line.printerId);
      return {
        ...line,
        printer: printer
          ? {
              colorCostPerSheetMinor: Math.floor(
                printer.colorInkPriceMinor / printer.colorPageYield + 0.5,
              ),
              blackCostPerSheetMinor: Math.floor(
                printer.blackInkPriceMinor / printer.blackPageYield + 0.5,
              ),
            }
          : { colorCostPerSheetMinor: 0, blackCostPerSheetMinor: 0 },
      };
    }),
    overagePercent: draft.overagePercent,
    lossPercent: draft.lossPercent,
    operationalFeeMinor: draft.operationalFeeMinor,
    laborPercent: draft.laborPercent,
    packagingCostMinor: draft.packagingCostMinor,
    markups: {
      retail: draft.markupRetailPercent,
      bulk: draft.markupBulkPercent,
      promo: draft.markupPromoPercent,
      loyal: draft.markupLoyalPercent,
    },
  }), [draft, materials, printers]);

  function update<K extends keyof typeof draft>(key: K, value: (typeof draft)[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function openTab(tab?: CostingTab) {
    setActiveId(tab?.id ?? "");
    setDraft(tab ? { ...tab } : blankTab(defaults));
    setError("");
    setNotice("");
  }

  function saveTab() {
    setError("");
    setNotice("");
    startTransition(async () => {
      try {
        const saved = await saveCostingTab({
          ...draft,
          id: activeId || undefined,
        });
        setActiveId(saved.id);
        const nextTab: CostingTab = { ...draft, id: saved.id, priceSets: tabs.find((tab) => tab.id === saved.id)?.priceSets ?? [] };
        setTabs((current) => [nextTab, ...current.filter((tab) => tab.id !== saved.id)]);
        setNotice("Cost estimate saved. Your suggested prices are up to date.");
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : "The cost estimate could not be saved.");
      }
    });
  }

  function savePrice() {
    if (!activeId) {
      setError("Save this costing tab before saving a price set.");
      return;
    }
    const retailPriceMinor = parseMoneyToMinor(retailInput);
    const bulkPriceMinor = parseMoneyToMinor(bulkInput);
    if (retailPriceMinor === null || bulkPriceMinor === null) {
      setError("Enter valid retail and bulk prices.");
      return;
    }
    setError("");
    setNotice("");
    startTransition(async () => {
      try {
        const saved = await savePriceSet({
          costingTabId: activeId,
          name: priceName,
          category: priceCategory || "Uncategorized",
          retailPriceMinor,
          bulkPriceMinor,
        });
        const newPriceSet = {
          id: crypto.randomUUID(),
          name: priceName,
          category: priceCategory || "Uncategorized",
          retailPriceMinor,
          bulkPriceMinor,
          productionCostMinor: saved.productionCostMinor,
        };
        setTabs((current) => current.map((tab) => tab.id === activeId ? { ...tab, priceSets: [newPriceSet, ...tab.priceSets] } : tab));
        setPriceName("");
        setPriceCategory("");
        setRetailInput("");
        setBulkInput("");
        setNotice("Price set saved to your price list.");
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : "The price set could not be saved.");
      }
    });
  }

  const activeTab = tabs.find((tab) => tab.id === activeId);

  return (
    <div className="feature-page costing-page">
      <div className="page-heading costing-heading">
        <div><span className="eyebrow">THE MAKING MATH, MADE FRIENDLY</span><h1>Product <em>costing</em></h1><p>Say what one finished piece uses. Example: 1 sheet of sticker paper and 1 color print make 8 stickers.</p></div>
        <button className="button button-primary" onClick={() => openTab()}><Plus size={17} /> New cost estimate</button>
      </div>
      <div className="costing-shell">
        <aside className="costing-tabs-panel">
          <div className="costing-tabs-head"><span className="eyebrow">YOUR PRODUCTS</span><button className="icon-button" onClick={() => openTab()} aria-label="Create a new costing tab"><Plus size={17} /></button></div>
          {tabs.length ? tabs.map((tab) => <button key={tab.id} className={`costing-tab-link ${activeId === tab.id ? "costing-tab-link-active" : ""}`} onClick={() => openTab(tab)}><span className="costing-tab-icon"><Scissors size={16} /></span><span>{tab.name}<small>{tab.priceSets.length} saved {tab.priceSets.length === 1 ? "price" : "prices"}</small></span><ArrowRight size={15} /></button>) : <div className="costing-tabs-empty">Your saved cost tabs will appear here.</div>}
          <div className="costing-aside-note"><CircleHelp size={16} /><p>A costing tab is one product. Save another tab for a new size, style, or material variation.</p></div>
        </aside>
        <div className="costing-main">
          <div className="costing-editor-head"><div className="costing-title-input"><label htmlFor="costing-name" className="eyebrow">PRODUCT NAME</label><input id="costing-name" value={draft.name} onChange={(event) => update("name", event.target.value)} placeholder="e.g. A5 notebook" maxLength={100} /></div><button className="button button-secondary save-tab-button" onClick={saveTab} disabled={isPending || !draft.name.trim()}>{isPending ? "Saving…" : <><Save size={16} /> Save estimate</>}</button></div>
          <section className="costing-section">
            <div className="costing-section-title"><span className="step-number">01</span><div><h2>Materials</h2><p>What goes into one batch, and how many pieces it makes.</p></div></div>
            {draft.materialLines.length > 0 && <div className="cost-lines">{draft.materialLines.map((line, index) => {
              const material = materials.find((item) => item.id === line.materialId);
              const costPerPiece = material ? calculateMaterialCostPerPiece(material.pricePerPackMinor, material.piecesPerPack) : 0;
              return <div className="cost-line material-cost-line" key={`${line.materialId}-${index}`}>
                <div className="cost-line-main"><label className="field">Material<select value={line.materialId} onChange={(event) => update("materialLines", draft.materialLines.map((item, lineIndex) => lineIndex === index ? { ...item, materialId: event.target.value } : item))}><option value="">Choose material</option>{materials.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.category}</option>)}</select></label><div className="line-cost-info"><b>{material ? formatMoney(costPerPiece, currency) : "—"}</b><small>per {material?.unitLabel ?? "unit"}{material ? ` · ${material.quantityOnHand} on hand` : ""}</small></div></div>
                <div className="cost-line-fields"><label className="field">Units used<input type="number" step="0.01" min="0.01" value={line.unitsUsed} onChange={(event) => update("materialLines", draft.materialLines.map((item, lineIndex) => lineIndex === index ? { ...item, unitsUsed: Number(event.target.value) } : item))} /></label><label className="field">Finished pieces<input type="number" step="0.01" min="0.01" value={line.finishedPieces} onChange={(event) => update("materialLines", draft.materialLines.map((item, lineIndex) => lineIndex === index ? { ...item, finishedPieces: Number(event.target.value) } : item))} /></label><span className="line-result">{formatMoney(material && line.finishedPieces > 0 ? Math.floor(costPerPiece * line.unitsUsed / line.finishedPieces + 0.5) : 0, currency)}<small>per piece</small></span><button className="icon-button remove-line" onClick={() => update("materialLines", draft.materialLines.filter((_, lineIndex) => lineIndex !== index))} aria-label="Remove material line"><Trash2 size={16} /></button></div>
                {material && line.unitsUsed > material.quantityOnHand && <div className="stock-warning"><AlertCircle size={14} /> This uses more than your current {material.unitLabel} stock. You can still cost it.</div>}
              </div>;
            })}</div>}
            <button className="add-line-button" onClick={() => update("materialLines", [...draft.materialLines, { materialId: materials[0]?.id ?? "", unitsUsed: 1, finishedPieces: draft.materialLines[0]?.finishedPieces ?? 1 }])} disabled={!materials.length}><Plus size={15} /> Add material</button>
            {!materials.length && <p className="inline-hint">Add a material to your library first. <a href="/materials">Go to materials <ArrowRight size={13} /></a></p>}
          </section>

          <section className="costing-section">
            <div className="costing-section-title"><span className="step-number">02</span><div><h2>Printing</h2><p>Set paper, quality, and coverage for each part of the product.</p></div></div>
            {draft.printLines.length > 0 && <div className="cost-lines">{draft.printLines.map((line, index) => {
              const printer = printers.find((item) => item.id === line.printerId);
              const lineCost = printer
                ? calculateCost({
                    materialLines: [],
                    printLines: [{
                      ...line,
                      printer: {
                        colorCostPerSheetMinor: Math.floor(printer.colorInkPriceMinor / printer.colorPageYield + 0.5),
                        blackCostPerSheetMinor: Math.floor(printer.blackInkPriceMinor / printer.blackPageYield + 0.5),
                      },
                    }],
                    overagePercent: 0,
                    lossPercent: 0,
                    operationalFeeMinor: 0,
                    laborPercent: 0,
                    packagingCostMinor: 0,
                    markups: { retail: 0, bulk: 0, promo: 0, loyal: 0 },
                  }).printingPerPieceMinor
                : 0;
              return <div className="cost-line print-cost-line" key={`${line.printerId}-${index}`}>
                <div className="cost-line-fields print-fields"><label className="field">Printer<select value={line.printerId} onChange={(event) => update("printLines", draft.printLines.map((item, lineIndex) => lineIndex === index ? { ...item, printerId: event.target.value } : item))}><option value="">Choose printer</option>{printers.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label className="field">Paper size<select value={line.paperSize} onChange={(event) => update("printLines", draft.printLines.map((item, lineIndex) => lineIndex === index ? { ...item, paperSize: event.target.value as PrintLine["paperSize"] } : item))}><option>A4</option><option>A5</option><option>A3</option><option>LETTER</option><option>LEGAL</option></select></label><label className="field">Quality<select value={line.quality} onChange={(event) => update("printLines", draft.printLines.map((item, lineIndex) => lineIndex === index ? { ...item, quality: event.target.value as PrintLine["quality"] } : item))}><option value="draft">Draft</option><option value="standard">Standard</option><option value="best">Best</option></select></label><label className="field">Coverage<select value={line.coverage} onChange={(event) => update("printLines", draft.printLines.map((item, lineIndex) => lineIndex === index ? { ...item, coverage: event.target.value as PrintLine["coverage"] } : item))}><option value="black_white">Black &amp; white</option><option value="light_color">Light color</option><option value="normal_color">Normal color</option><option value="photo_heavy">Photo heavy</option></select></label></div>
                <div className="cost-line-fields print-numeric-fields"><label className="field">Sheets<input type="number" step="0.01" min="0.01" value={line.sheetCount} onChange={(event) => update("printLines", draft.printLines.map((item, lineIndex) => lineIndex === index ? { ...item, sheetCount: Number(event.target.value) } : item))} /></label><label className="field">Finished pieces<input type="number" step="0.01" min="0.01" value={line.finishedPieces} onChange={(event) => update("printLines", draft.printLines.map((item, lineIndex) => lineIndex === index ? { ...item, finishedPieces: Number(event.target.value) } : item))} /></label><span className="line-result">{formatMoney(lineCost, currency)}<small>per finished piece</small></span><button className="icon-button remove-line" onClick={() => update("printLines", draft.printLines.filter((_, lineIndex) => lineIndex !== index))} aria-label="Remove print line"><Trash2 size={16} /></button></div>
                {printer && <div className="multiplier-hint"><Printer size={13} /> Base ink {formatMoney(Math.floor((line.coverage === "black_white" ? printer.blackInkPriceMinor / printer.blackPageYield : printer.colorInkPriceMinor / printer.colorPageYield) + 0.5), currency)} / sheet <span>·</span> Size ×{sizeMultipliers[line.paperSize]} · Quality ×{qualityMultipliers[line.quality]} · Coverage ×{coverageMultipliers[line.coverage]}</div>}
              </div>;
            })}</div>}
            <button className="add-line-button" onClick={() => update("printLines", [...draft.printLines, { printerId: printers[0]?.id ?? "", paperSize: "A4", quality: "standard", coverage: "normal_color", sheetCount: 1, finishedPieces: draft.materialLines[0]?.finishedPieces ?? 1 }])} disabled={!printers.length}><Plus size={15} /> Add printing line</button>
            {!printers.length && <p className="inline-hint">Add a printer to get your base ink costs. <a href="/print-hub">Open Print hub <ArrowRight size={13} /></a></p>}
          </section>

          <section className="costing-section adjustments-section">
            <div className="costing-section-title"><span className="step-number">03</span><div><h2>Adjustments</h2><p>Include setup, production loss, operating costs, and your time.</p></div></div>
            <div className="adjustments-grid">
              <label className="field">Overage<input type="number" min="0" step="0.1" value={draft.overagePercent} onChange={(event) => update("overagePercent", Number(event.target.value))} /><small>Extra for setup &amp; cutting · %</small></label>
              <label className="field">Production loss<input type="number" min="0" step="0.1" value={draft.lossPercent} onChange={(event) => update("lossPercent", Number(event.target.value))} /><small>Misprints &amp; damaged pieces · %</small></label>
              <label className="field">Operational fee<input type="number" min="0" step="0.01" value={(draft.operationalFeeMinor / 100).toFixed(2)} onChange={(event) => update("operationalFeeMinor", Math.max(0, Math.round(Number(event.target.value) * 100)))} /><small>Power, machine time, and wear · {currency}</small></label>
              <label className="field">Labor<input type="number" min="0" step="0.1" value={draft.laborPercent} onChange={(event) => update("laborPercent", Number(event.target.value))} /><small>Labor as a share of adjusted cost · %</small></label>
              <label className="field">Packaging cost<input type="number" min="0" step="0.01" value={(draft.packagingCostMinor / 100).toFixed(2)} onChange={(event) => update("packagingCostMinor", Math.max(0, Math.round(Number(event.target.value) * 100)))} /><small>Optional packaging add-on · {currency}</small></label>
            </div>
          </section>

          <section className="costing-section markup-section">
            <div className="costing-section-title"><span className="step-number">04</span><div><h2>Suggested prices</h2><p>Adjust a markup and see the price and profit per finished piece.</p></div></div>
            <div className="markup-grid">
              {([
                ["retail", "Retail", "markupRetailPercent", "pink"],
                ["bulk", "Bulk", "markupBulkPercent", "teal"],
                ["promo", "Promo", "markupPromoPercent", "orange"],
                ["loyal", "Loyal customer", "markupLoyalPercent", "purple"],
              ] as const).map(([key, label, percentKey, tone]) => <div className={`markup-card markup-${tone}`} key={key}><span>{label}</span><b>{formatMoney(result.prices[key], currency)}</b><label>Markup <input aria-label={`${label} markup percent`} type="number" min="0" step="1" value={draft[percentKey]} onChange={(event) => update(percentKey, Number(event.target.value))} />%</label><small>Profit {formatMoney(result.profits[key], currency)}</small></div>)}
            </div>
            <div className="cost-total-card">
              <div><span className="eyebrow">YOUR PRODUCTION COST, PER PIECE</span><b>{formatMoney(result.productionCostMinor, currency)}</b><small>Materials {formatMoney(result.materialPerPieceMinor, currency)} + printing {formatMoney(result.printingPerPieceMinor, currency)} + adjustments {formatMoney(result.productionCostMinor - result.materialPerPieceMinor - result.printingPerPieceMinor, currency)}</small></div>
              <div className="cost-breakdown-mini"><span>Direct cost <b>{formatMoney(result.directMinor, currency)}</b></span><span>Loss &amp; overage <b>{formatMoney(result.lossMinor + result.overageMinor, currency)}</b></span><span>Labor <b>{formatMoney(result.laborMinor, currency)}</b></span><span>Packaging <b>{formatMoney(result.packagingCostMinor, currency)}</b></span></div>
            </div>
          </section>

          <section className="costing-section save-price-section">
            <div className="costing-section-title"><span className="step-number">05</span><div><h2>Save a price set</h2><p>Keep this product variation in your price list.</p></div></div>
            <div className="price-set-form">
              <label className="field">Variation name<input value={priceName} onChange={(event) => setPriceName(event.target.value)} placeholder="e.g. 80-page matte notebook" /></label>
              <label className="field">Category<input value={priceCategory} onChange={(event) => setPriceCategory(event.target.value)} placeholder="e.g. Notebooks" /></label>
              <label className="field">Retail price ({currency})<input type="number" min="0" step="0.01" value={retailInput} onChange={(event) => setRetailInput(event.target.value)} placeholder={(result.prices.retail / 100).toFixed(2)} /></label>
              <label className="field">Bulk price ({currency})<input type="number" min="0" step="0.01" value={bulkInput} onChange={(event) => setBulkInput(event.target.value)} placeholder={(result.prices.bulk / 100).toFixed(2)} /></label>
              <button className="button button-secondary" onClick={savePrice} disabled={isPending || !priceName.trim()}><Check size={16} /> Save to price list</button>
            </div>
            {activeTab?.priceSets.length ? <div className="saved-variations"><b>Saved variations</b>{activeTab.priceSets.map((price) => <div key={price.id}><span>{price.name}<small>{price.category}</small></span><span>{formatMoney(price.productionCostMinor, currency)} cost</span><span>{formatMoney(price.retailPriceMinor, currency)} retail</span></div>)}</div> : null}
          </section>
          {(error || notice) && <div className={error ? "action-message action-message-error" : "action-message action-message-success"} role={error ? "alert" : "status"}>{error || notice}</div>}
        </div>
      </div>
    </div>
  );
}
