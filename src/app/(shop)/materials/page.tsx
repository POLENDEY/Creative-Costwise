import { AlertTriangle, ArrowUpRight, PackagePlus, Star } from "lucide-react";
import { MaterialLibrary } from "@/components/material-library";
import { createMaterial } from "@/actions/shop";
import { prisma } from "@/lib/prisma";
import { requireCrafter } from "@/lib/session";
import { resolveCurrency } from "@/lib/money";

export default async function MaterialsPage() {
  const user = await requireCrafter();
  const [settings, materials] = await Promise.all([
    prisma.shopSettings.findUnique({ where: { userId: user.id } }),
    prisma.material.findMany({ where: { userId: user.id }, orderBy: [{ category: "asc" }, { name: "asc" }] }),
  ]);
  const currency = resolveCurrency(settings?.currency);
  const categories = [...new Set(materials.map((material) => material.category))];

  return (
    <div className="feature-page">
      <div className="page-heading">
        <div><span className="eyebrow">YOUR SUPPLY SHELF</span><h1>Materials <em>&amp; inventory</em></h1><p>Keep your supplies close and your costs easy to see.</p></div>
        <a href="#add-material" className="button button-primary"><PackagePlus size={17} /> Add material</a>
      </div>
      <div className="material-summary-row">
        <div className="material-summary-card"><span className="summary-icon summary-icon-pink"><PackagePlus size={19} /></span><span><b>{materials.length}</b><small>materials in your library</small></span></div>
        <div className="material-summary-card"><span className="summary-icon summary-icon-amber"><AlertTriangle size={19} /></span><span><b>{materials.filter((material) => material.lowStockAlert !== null && Number(material.quantityOnHand) <= Number(material.lowStockAlert)).length}</b><small>need a restock check</small></span></div>
        <div className="material-summary-card"><span className="summary-icon summary-icon-purple"><Star size={19} /></span><span><b>{categories.length}</b><small>material categories</small></span></div>
      </div>
      <MaterialLibrary
        currency={currency}
        materials={materials.map((material) => ({
          id: material.id,
          category: material.category,
          name: material.name,
          piecesPerPack: Number(material.piecesPerPack),
          pricePerPackMinor: material.pricePerPackMinor,
          gsm: material.gsm,
          finish: material.finish,
          finishOther: material.finishOther,
          unitLabel: material.unitLabel,
          quantityOnHand: Number(material.quantityOnHand),
          lowStockAlert: material.lowStockAlert === null ? null : Number(material.lowStockAlert),
          supplierUrl: material.supplierUrl,
        }))}
      />
      <details className="panel form-panel add-form-panel" id="add-material">
        <summary><span><PackagePlus size={18} /> Add a material</span><span className="summary-hint">Add a pack, see its unit cost automatically</span></summary>
        <form action={createMaterial} className="form-grid">
          <label className="field field-span-2">Material name<input name="name" placeholder="e.g. Matte photo paper" required maxLength={100} /></label>
          <label className="field">Category<input name="category" list="material-category-options" placeholder="e.g. Paper" required maxLength={60} /><datalist id="material-category-options">{categories.map((category) => <option key={category} value={category} />)}</datalist></label>
          <label className="field">Unit label<input name="unitLabel" placeholder="sheet, piece, meter…" defaultValue="sheet" required maxLength={30} /></label>
          <label className="field">Pieces per pack<input name="piecesPerPack" type="number" step="0.01" min="0.01" placeholder="100" required /></label>
          <label className="field">Price per pack ({currency})<input name="pricePerPack" type="number" step="0.01" min="0" placeholder="250.00" required /></label>
          <label className="field">Quantity on hand<input name="quantityOnHand" type="number" step="0.01" min="0" placeholder="25" defaultValue="0" required /></label>
          <label className="field">Low-stock alert<input name="lowStockAlert" type="number" step="0.01" min="0" placeholder="Optional" /></label>
          <label className="field">Finish<select name="finish" defaultValue="matte"><option value="matte">Matte</option><option value="glossy">Glossy</option><option value="satin">Satin</option><option value="other">Other</option></select></label>
          <label className="field">Other finish label<input name="finishOther" placeholder="Optional" maxLength={50} /></label>
          <label className="field">GSM<input name="gsm" placeholder="e.g. 220" maxLength={40} /></label>
          <label className="field">Thickness<input name="thickness" placeholder="Optional" maxLength={40} /></label>
          <label className="field">Size note<input name="sizeNote" placeholder="Optional" maxLength={100} /></label>
          <label className="field field-span-2">Supplier link<input name="supplierUrl" type="url" placeholder="https://" /></label>
          <div className="form-actions"><span>Costs are stored in cents to keep every calculation precise.</span><button type="submit" className="button button-primary">Save material <ArrowUpRight size={15} /></button></div>
        </form>
      </details>
    </div>
  );
}
