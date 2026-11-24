import { AlertTriangle, ArrowUpRight, PackagePlus, Star } from "lucide-react";
import { MaterialLibrary } from "@/components/material-library";
import { SupplierOrders } from "@/components/supplier-orders";
import { ValueChart } from "@/components/compare-chart";
import { createMaterial } from "@/actions/shop";
import { calculateMaterialCostPerPiece } from "@/lib/costing";
import { prisma } from "@/lib/prisma";
import { requireCrafter } from "@/lib/session";
import { formatMoney, resolveCurrency } from "@/lib/money";

export default async function MaterialsPage() {
  const user = await requireCrafter();
  const [settings, materials, savedCategories, movements, supplierOrders] = await Promise.all([
    prisma.shopSettings.findUnique({ where: { userId: user.id }, select: { currency: true } }),
    prisma.material.findMany({ where: { userId: user.id }, orderBy: [{ category: "asc" }, { name: "asc" }] }),
    prisma.materialCategory.findMany({ where: { userId: user.id }, orderBy: { name: "asc" } }),
    prisma.inventoryMovement.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 8,
      select: { id: true, materialId: true, quantityBefore: true, quantityAfter: true, expenseId: true, createdAt: true },
    }),
    prisma.supplierOrder.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: "desc" },
      take: 12,
      include: { lines: { select: { materialName: true, packs: true, packPriceMinor: true } } },
    }),
  ]);
  const currency = resolveCurrency(settings?.currency);
  const names = new Set(savedCategories.map((category) => category.name));
  const categories = [
    ...savedCategories.map((category) => ({ name: category.name, starred: category.starred })),
    ...materials.filter((material) => !names.has(material.category)).map((material) => ({ name: material.category, starred: false })),
  ].filter((category, index, list) => list.findIndex((item) => item.name === category.name) === index);
  const starredCount = categories.filter((category) => category.starred).length;
  const shelfValue = (pricePerPackMinor: number, piecesPerPack: number, quantityOnHand: number) => {
    const pieces = Number(piecesPerPack);
    if (pieces <= 0) return 0;
    return Math.round(Number(quantityOnHand) * calculateMaterialCostPerPiece(pricePerPackMinor, pieces));
  };
  const stockValueMinor = materials.reduce((sum, material) => sum + shelfValue(material.pricePerPackMinor, Number(material.piecesPerPack), Number(material.quantityOnHand)), 0);
  const categoryValue = new Map<string, number>();
  for (const material of materials) {
    const value = shelfValue(material.pricePerPackMinor, Number(material.piecesPerPack), Number(material.quantityOnHand));
    categoryValue.set(material.category, (categoryValue.get(material.category) ?? 0) + value);
  }
  const materialNames = new Map(materials.map((material) => [material.id, material.name]));
  const expenseIds = movements.flatMap((movement) => movement.expenseId ? [movement.expenseId] : []);
  const expenses = expenseIds.length
    ? await prisma.expense.findMany({ where: { userId: user.id, id: { in: expenseIds } } })
    : [];
  const expenseAmounts = new Map(expenses.map((expense) => [expense.id, expense.amountMinor]));

  return (
    <div className="feature-page">
      <div className="page-heading">
        <div><span className="eyebrow">YOUR SUPPLY SHELF</span><h1>Materials <em>&amp; inventory</em></h1><p>Each row is one supply. Example: sticker paper, 20 sheets in a pack, ₱250 for the pack, 40 sheets on the shelf, and a low-stock alert at 10.</p></div>
        <a href="#add-material" className="button button-primary"><PackagePlus size={17} /> Add material</a>
      </div>
      <ValueChart
        title="Stock value by category"
        total={{ amount: formatMoney(stockValueMinor, currency), label: "stock on the shelf, at pack cost" }}
        rows={[...categoryValue.entries()].map(([label, value]) => ({ label, value, detail: formatMoney(value, currency) }))}
        aside={(
          <div className="material-summary-row">
            <div className="material-summary-card"><span className="summary-icon summary-icon-pink"><PackagePlus size={19} /></span><span><b>{materials.length}</b><small>materials in your library</small></span></div>
            <div className="material-summary-card"><span className="summary-icon summary-icon-amber"><AlertTriangle size={19} /></span><span><b>{materials.filter((material) => material.lowStockAlert !== null && Number(material.quantityOnHand) <= Number(material.lowStockAlert)).length}</b><small>need a restock check</small></span></div>
            <div className="material-summary-card"><span className="summary-icon summary-icon-purple"><Star size={19} /></span><span><b>{starredCount}</b><small>starred categories, five at most</small></span></div>
          </div>
        )}
      />
      <MaterialLibrary
        currency={currency}
        categories={categories}
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
      <SupplierOrders
        currency={currency}
        materials={materials.map((material) => ({
          id: material.id,
          name: material.name,
          unitLabel: material.unitLabel,
          piecesPerPack: Number(material.piecesPerPack),
          pricePerPackMinor: material.pricePerPackMinor,
          quantityOnHand: Number(material.quantityOnHand),
          lowStockAlert: material.lowStockAlert === null ? null : Number(material.lowStockAlert),
        }))}
        orders={supplierOrders.map((order) => ({
          id: order.id,
          supplierName: order.supplierName,
          status: order.status,
          note: order.note,
          lines: order.lines.map((line) => ({
            materialName: line.materialName,
            packs: Number(line.packs),
            packPriceMinor: line.packPriceMinor,
          })),
        }))}
      />
      <details className="panel form-panel add-form-panel" id="add-material">
        <summary><span><PackagePlus size={18} /> Add a material</span><span className="summary-hint">Add a pack, see its unit cost automatically</span></summary>
        <form action={createMaterial} className="form-grid">
          <label className="field field-span-2">Material name<input name="name" placeholder="e.g. Matte photo paper" required maxLength={100} /></label>
          <label className="field">Category<input name="category" list="material-category-options" placeholder="e.g. Paper" required maxLength={60} /><datalist id="material-category-options">{categories.map((category) => <option key={category.name} value={category.name} />)}</datalist></label>
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
      <section className="panel">
        <div className="panel-heading"><div><span className="eyebrow">STOCK HISTORY</span><h2>Recent quantity changes</h2></div></div>
        {movements.length ? <ul className="movement-list">{movements.map((movement) => {
          const spent = movement.expenseId ? expenseAmounts.get(movement.expenseId) : undefined;
          return <li key={movement.id}><b>{materialNames.get(movement.materialId) ?? "Material"}</b><span>{movement.quantityBefore} → {movement.quantityAfter}</span>{spent !== undefined && <span>{formatMoney(spent, currency)}</span>}<small>{movement.createdAt.toLocaleString()}</small></li>;
        })}</ul> : <p className="empty-copy">Updating stock sets the on-hand total you type and records the change here.</p>}
      </section>
    </div>
  );
}
