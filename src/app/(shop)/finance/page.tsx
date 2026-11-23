import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireCrafter } from "@/lib/session";
import { financeSummary, financeWindow, type FinanceRange } from "@/lib/finance";
import { formatMoney, resolveCurrency } from "@/lib/money";

const ranges: { id: FinanceRange; label: string }[] = [
  { id: "week", label: "This week" },
  { id: "seven", label: "Last 7 days" },
  { id: "month", label: "This month" },
];

export default async function FinancePage({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  const user = await requireCrafter();
  const { range: requested } = await searchParams;
  const range: FinanceRange = requested === "week" || requested === "seven" ? requested : "month";
  const { from, to } = financeWindow(range, new Date());
  const [settings, sales, expenses] = await Promise.all([
    prisma.shopSettings.findUnique({ where: { userId: user.id } }),
    prisma.sale.findMany({
      where: { userId: user.id, recognizedOn: { gte: from, lte: to } },
      orderBy: { recognizedOn: "desc" },
    }),
    prisma.expense.findMany({
      where: { userId: user.id, occurredOn: { gte: from, lte: to } },
      orderBy: { occurredOn: "desc" },
    }),
  ]);
  const orders = sales.length
    ? await prisma.shopOrder.findMany({ where: { userId: user.id, id: { in: sales.map((sale) => sale.orderId) } }, select: { id: true, customerName: true } })
    : [];
  const names = new Map(orders.map((order) => [order.id, order.customerName]));
  const currency = resolveCurrency(settings?.currency);
  const summary = financeSummary({
    from,
    to,
    sales: sales.map((sale) => ({ amountMinor: sale.amountMinor, recognizedOn: sale.recognizedOn })),
    expenses: expenses.map((expense) => ({ amountMinor: expense.amountMinor, occurredOn: expense.occurredOn })),
  });

  return <div className="feature-page">
    <div className="page-heading">
      <div><span className="eyebrow">SALES AND EXPENSES</span><h1>Finance</h1><p>Revenue is the sale recorded when an order is delivered. Expenses are restocks and printer supplies.</p></div>
    </div>
    <div className="category-chips">{ranges.map((item) => <Link key={item.id} href={`/finance?range=${item.id}`} className={`category-chip ${range === item.id ? "category-chip-selected" : ""}`}>{item.label}</Link>)}</div>
    <div className="material-summary-row">
      <div className="material-summary-card"><span><b>{formatMoney(summary.revenueMinor, currency)}</b><small>product revenue</small></span></div>
      <div className="material-summary-card"><span><b>{formatMoney(summary.expenseMinor, currency)}</b><small>expenses</small></span></div>
      <div className="material-summary-card"><span><b>{formatMoney(summary.profitMinor, currency)}</b><small>revenue minus expenses</small></span></div>
    </div>
    <section className="panel">
      <div className="panel-heading"><div><span className="eyebrow">SALES</span><h2>Delivered orders</h2></div></div>
      {sales.length ? <ul className="movement-list">{sales.map((sale) => <li key={sale.id}><b>{names.get(sale.orderId) ?? "Order"}</b><span>{formatMoney(sale.amountMinor, resolveCurrency(sale.currency))}</span><small>{sale.recognizedOn.toLocaleString()}</small></li>)}</ul> : <p className="empty-copy">No delivered sales in this range.</p>}
    </section>
    <section className="panel">
      <div className="panel-heading"><div><span className="eyebrow">EXPENSES</span><h2>Recorded purchases</h2></div></div>
      {expenses.length ? <ul className="movement-list">{expenses.map((expense) => <li key={expense.id}><b>{expense.description}</b><span>{formatMoney(expense.amountMinor, currency)}</span><small>{expense.occurredOn.toLocaleString()}</small></li>)}</ul> : <p className="empty-copy">No expenses in this range.</p>}
    </section>
  </div>;
}
