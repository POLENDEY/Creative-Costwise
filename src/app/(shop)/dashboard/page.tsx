import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Calculator,
  Package,
  Printer,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireCrafter } from "@/lib/session";
import { calculateMaterialCostPerPiece } from "@/lib/costing";
import { financeSummary, financeWindow } from "@/lib/finance";
import { formatMoney, resolveCurrency } from "@/lib/money";
import { checklistSteps, parseChecklist } from "@/lib/checklist";
import { toggleChecklistStep } from "@/actions/shop";
import { CurrencyMark } from "@/components/currency-mark";

export default async function DashboardPage() {
  const user = await requireCrafter();
  const month = financeWindow("month", new Date());
  const [settings, materials, printers, tabs, priceSets, sales, expenses] = await Promise.all([
    prisma.shopSettings.findUnique({ where: { userId: user.id } }),
    prisma.material.findMany({ where: { userId: user.id }, orderBy: { updatedAt: "desc" } }),
    prisma.printer.count({ where: { userId: user.id } }),
    prisma.costingTab.findMany({ where: { userId: user.id }, orderBy: { updatedAt: "desc" }, take: 3 }),
    prisma.priceSet.findMany({ where: { userId: user.id }, orderBy: { updatedAt: "desc" }, take: 3 }),
    prisma.sale.findMany({ where: { userId: user.id, recognizedOn: { gte: month.from, lte: month.to } }, select: { amountMinor: true, recognizedOn: true } }),
    prisma.expense.findMany({ where: { userId: user.id, occurredOn: { gte: month.from, lte: month.to } }, select: { amountMinor: true, occurredOn: true } }),
  ]);
  const monthFinance = financeSummary({ from: month.from, to: month.to, sales, expenses });
  const currency = resolveCurrency(settings?.currency);
  const lowStock = materials.filter(
    (material) => material.lowStockAlert !== null && Number(material.quantityOnHand) <= Number(material.lowStockAlert),
  );
  const checklist = parseChecklist(settings?.checklistJson ?? "{}");
  const visibleSteps = checklistSteps.filter((step) => !step.annualOnly || user.plan === "annual");
  const completed = visibleSteps.filter((step) => checklist[step.id]).length;

  return (
    <div className="dashboard-page">
      <div className="page-heading dashboard-heading">
        <div>
          <span className="eyebrow">YOUR BUSINESS AT A GLANCE</span>
          <h1>Good things are <em>taking shape.</em></h1>
          <p>A calm place to keep your costs clear and your ideas moving.</p>
        </div>
        <Link className="button button-primary" href="/costing"><Calculator size={17} /> Cost a product</Link>
      </div>

      <section className="welcome-strip">
        <div className="welcome-flower"><Sparkles size={22} /></div>
        <div><b>Welcome to your creative workspace.</b><p>Start with materials, then build a cost estimate that feels right for your business.</p></div>
        <Link href="/guide" aria-label="Open the getting started guide"><ArrowRight size={20} /></Link>
      </section>

      <section className="overview-grid" aria-label="Workspace overview">
        <article className="overview-card overview-card-pink">
          <div className="overview-card-top"><span className="overview-icon"><Package size={18} /></span><span className="overview-tag">INVENTORY</span></div>
          <b className="overview-value">{materials.length}</b><span className="overview-label">materials saved</span>
          <div className="overview-card-bottom">{lowStock.length ? <span className="inline-warning">{lowStock.length} need a restock check</span> : <span>Everything on your shelf</span>}</div>
        </article>
        <article className="overview-card overview-card-teal">
          <div className="overview-card-top"><span className="overview-icon"><Printer size={18} /></span><span className="overview-tag">PRINT HUB</span></div>
          <b className="overview-value">{printers}</b><span className="overview-label">printers ready to go</span>
          <div className="overview-card-bottom">{printers ? <span>Base ink costs are set</span> : <Link href="/print-hub">Add your first printer <ArrowUpRight size={13} /></Link>}</div>
        </article>
        <article className="overview-card overview-card-lilac">
          <div className="overview-card-top"><span className="overview-icon"><Calculator size={18} /></span><span className="overview-tag">COSTING</span></div>
          <b className="overview-value">{tabs.length}</b><span className="overview-label">recent cost estimates</span>
          <div className="overview-card-bottom"><Link href="/costing">Open calculator <ArrowUpRight size={13} /></Link></div>
        </article>
        <article className="overview-card overview-card-sand">
          <div className="overview-card-top"><span className="overview-icon"><CurrencyMark currency={currency} /></span><span className="overview-tag">PRICE LIST</span></div>
          <b className="overview-value">{priceSets.length}</b><span className="overview-label">saved price sets</span>
          <div className="overview-card-bottom"><Link href="/prices">Browse prices <ArrowUpRight size={13} /></Link></div>
        </article>
      </section>

      <section className="material-summary-row">
        <Link href="/finance" className="material-summary-card"><span><b>{formatMoney(monthFinance.revenueMinor, currency)}</b><small>revenue this month</small></span></Link>
        <Link href="/finance" className="material-summary-card"><span><b>{formatMoney(monthFinance.expenseMinor, currency)}</b><small>expenses this month</small></span></Link>
        <Link href="/finance" className="material-summary-card"><span><b>{formatMoney(monthFinance.profitMinor, currency)}</b><small>revenue minus expenses</small></span></Link>
      </section>

      <section className="dashboard-lower-grid">
        <div className="panel recent-panel">
          <div className="panel-heading"><div><span className="eyebrow">PICK UP WHERE YOU LEFT OFF</span><h2>Recent cost estimates</h2></div><Link className="text-link" href="/costing">View all <ArrowRight size={15} /></Link></div>
          {tabs.length ? (
            <div className="recent-list">
              {tabs.map((tab) => <Link className="recent-row" href={`/costing?tab=${tab.id}`} key={tab.id}>
                <span className="recent-product-icon"><Calculator size={17} /></span>
                <span className="recent-product-copy"><b>{tab.name}</b><small>Updated {new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(tab.updatedAt)}</small></span>
                <span className="recent-product-cost">{formatMoney(Number(tab.operationalFeeMinor), currency)}<small>base fee</small></span><ArrowRight className="recent-arrow" size={16} />
              </Link>)}
            </div>
          ) : (
            <div className="empty-state compact-empty"><div className="empty-illustration"><TrendingUp size={23} /></div><b>Your first estimate starts here.</b><p>Add your materials and create a costing tab to see a full breakdown.</p><Link className="button button-secondary" href="/costing">Open product costing <ArrowRight size={15} /></Link></div>
          )}
        </div>
        <aside className="panel checklist-panel">
          <div className="panel-heading"><div><span className="eyebrow">A GENTLE START</span><h2>Getting started</h2></div><Sparkles className="checklist-sparkle" size={18} /></div>
          <div className="progress-meta"><span>{completed} of {visibleSteps.length} steps</span><b>{Math.round((completed / visibleSteps.length) * 100)}%</b></div>
          <div className="progress-track"><span style={{ width: `${(completed / visibleSteps.length) * 100}%` }} /></div>
          <div className="checklist-items">
            {visibleSteps.map((step, index) => <form action={toggleChecklistStep} className="checklist-item" key={step.id}>
              <input type="hidden" name="step" value={step.id} />
              <button type="submit" name="done" value={checklist[step.id] ? "false" : "true"} className={`check-circle ${checklist[step.id] ? "check-circle-done" : ""}`} aria-label={`${checklist[step.id] ? "Mark incomplete" : "Mark complete"}: ${step.label}`}>{checklist[step.id] ? "✓" : index + 1}</button><span>{step.label}</span>
            </form>)}
          </div>
          <Link className="text-link checklist-link" href="/guide">See your getting-started guide <ArrowRight size={14} /></Link>
        </aside>
      </section>

      {lowStock.length > 0 && <section className="panel low-stock-panel">
        <div className="panel-heading"><div><span className="eyebrow">INVENTORY CHECK-IN</span><h2>Running a little low</h2></div><Link href="/materials" className="text-link">View materials <ArrowRight size={15} /></Link></div>
        <div className="low-stock-list">{lowStock.slice(0, 4).map((material) => <div className="low-stock-row" key={material.id}><span className="stock-dot" /><b>{material.name}</b><span>{Number(material.quantityOnHand)} {material.unitLabel} left</span><small>Alert at {Number(material.lowStockAlert)}</small><span className="stock-piece-cost">{formatMoney(calculateMaterialCostPerPiece(material.pricePerPackMinor, Number(material.piecesPerPack)), currency)} / {material.unitLabel}</span></div>)}</div>
      </section>}
    </div>
  );
}
