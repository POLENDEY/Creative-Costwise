import { ArrowUpRight, Info, Plus, Printer, Sparkles } from "lucide-react";
import { createPrinter } from "@/actions/shop";
import { prisma } from "@/lib/prisma";
import { requireCrafter } from "@/lib/session";
import { calculatePrinterBaseCosts } from "@/lib/costing";
import { formatMoney, resolveCurrency } from "@/lib/money";

export default async function PrintHubPage() {
  const user = await requireCrafter();
  const [settings, printers] = await Promise.all([
    prisma.shopSettings.findUnique({ where: { userId: user.id } }),
    prisma.printer.findMany({ where: { userId: user.id }, orderBy: { name: "asc" } }),
  ]);
  const currency = resolveCurrency(settings?.currency);

  return (
    <div className="feature-page">
      <div className="page-heading">
        <div><span className="eyebrow">INK, PAPER &amp; POSSIBILITIES</span><h1>Your <em>Print hub</em></h1><p>Set a helpful baseline for the prints that make your products yours.</p></div>
        <a className="button button-primary" href="#add-printer"><Plus size={17} /> Add printer</a>
      </div>
      <div className="print-hub-note"><span><Info size={17} /></span><p>These are your <b>base ink costs per sheet.</b> Your product calculator scales them for paper size, quality, and coverage.</p></div>
      {printers.length ? <div className="printer-grid">{printers.map((printer, index) => {
        const base = calculatePrinterBaseCosts({
          colorInkPriceMinor: printer.colorInkPriceMinor,
          colorPageYield: Number(printer.colorPageYield),
          blackInkPriceMinor: printer.blackInkPriceMinor,
          blackPageYield: Number(printer.blackPageYield),
        });
        return <article className={`printer-card printer-card-${index % 3}`} key={printer.id}>
          <div className="printer-card-head"><span className="printer-icon"><Printer size={21} /></span><span className="printer-type">{printer.inkType} ink</span></div>
          <h2>{printer.name}</h2><p className="printer-meta">Ink yield based on your saved estimates</p>
          <div className="printer-cost-grid"><div><span>COLOR · BASE COST</span><b>{formatMoney(base.colorCostPerSheetMinor, currency)}</b><small>per sheet</small></div><div><span>BLACK · BASE COST</span><b>{formatMoney(base.blackCostPerSheetMinor, currency)}</b><small>per sheet</small></div></div>
          <div className="printer-yields"><span>Color yield <b>{Number(printer.colorPageYield).toLocaleString()} pages</b></span><span>Black yield <b>{Number(printer.blackPageYield).toLocaleString()} pages</b></span></div>
        </article>;
      })}</div> : <div className="panel empty-state"><div className="empty-illustration"><Printer size={25} /></div><b>Let’s get your prints figured out.</b><p>Add a printer and ink yield to estimate the base ink cost on every sheet.</p></div>}
      <details className="panel form-panel add-form-panel" id="add-printer">
        <summary><span><Plus size={18} /> Add a printer</span><span className="summary-hint">Add ink prices and the page yield from the manufacturer</span></summary>
        <form action={createPrinter} className="form-grid">
          <label className="field field-span-2">Printer name<input name="name" placeholder="e.g. Epson EcoTank L3250" required maxLength={100} /></label>
          <label className="field">Ink type<select name="inkType" defaultValue="dye"><option value="dye">Dye</option><option value="sublimation">Sublimation</option><option value="pigment">Pigment</option></select></label>
          <div className="form-grid-section"><span className="eyebrow">COLOR INK</span><label className="field">Ink price ({currency})<input name="colorInkPrice" type="number" min="0" step="0.01" placeholder="1,200.00" required /></label><label className="field">Estimated page yield<input name="colorPageYield" type="number" min="0.01" step="0.01" placeholder="7,500" required /></label></div>
          <div className="form-grid-section"><span className="eyebrow">BLACK INK</span><label className="field">Ink price ({currency})<input name="blackInkPrice" type="number" min="0" step="0.01" placeholder="850.00" required /></label><label className="field">Estimated page yield<input name="blackPageYield" type="number" min="0.01" step="0.01" placeholder="4,500" required /></label></div>
          <div className="form-actions"><span><Sparkles size={14} /> You can update these estimates anytime.</span><button className="button button-primary" type="submit">Save printer <ArrowUpRight size={15} /></button></div>
        </form>
      </details>
    </div>
  );
}
