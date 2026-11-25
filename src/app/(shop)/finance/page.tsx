import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireCrafter } from "@/lib/session";
import { CompareChart } from "@/components/compare-chart";
import { financeDaily, financeSummary, financeWindow, type FinanceRange } from "@/lib/finance";
import { formatMoney, resolveCurrency } from "@/lib/money";
import { withDatabasePage } from "@/lib/with-database-page";

const ranges: { id: FinanceRange; label: string }[] = [
  { id: "week", label: "This week" },
  { id: "seven", label: "Last 7 days" },
  { id: "month", label: "This month" },
];

async function FinancePage({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  const user = await requireCrafter("finance");
  const { range: requested } = await searchParams;
  const range: FinanceRange = requested === "week" || requested === "seven" ? requested : "month";
  const { from, to } = financeWindow(range, new Date());
  const [settings, sales, expenses] = await Promise.all([
    prisma.shopSettings.findUnique({ where: { userId: user.id } }),
    prisma.sale.findMany({
      where: { userId: user.id, recognizedOn: { gte: from, lte: to } },
      orderBy: { recognizedOn: "desc" },
      select: { id: true, orderId: true, amountMinor: true, currency: true, recognizedOn: true },
    }),
    prisma.expense.findMany({
      where: { userId: user.id, occurredOn: { gte: from, lte: to } },
      orderBy: { occurredOn: "desc" },
      select: { id: true, description: true, amountMinor: true, occurredOn: true },
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
    <nav className="range-switch" aria-label="Date range">
      {ranges.map((item) => (
        <Link key={item.id} href={`/finance?range=${item.id}`} aria-current={range === item.id ? "page" : undefined}>{item.label}</Link>
      ))}
    </nav>
    <section className="finance-chart-card">
      <CompareChart title="Revenue and expenses by day" rows={financeDaily({ from, to, sales, expenses })} />
    </section>
    <div className="finance-summary">
      <div className="finance-stat is-revenue"><span>Money in</span><b>{formatMoney(summary.revenueMinor, currency)}</b><small>product revenue</small></div>
      <div className="finance-stat is-expense"><span>Money out</span><b>{formatMoney(summary.expenseMinor, currency)}</b><small>restocks and supplies</small></div>
      <div className={`finance-stat ${summary.profitMinor < 0 ? "is-loss" : "is-profit"}`}><span>{summary.profitMinor < 0 ? "Short by" : "Kept"}</span><b>{formatMoney(summary.profitMinor, currency)}</b><small>revenue minus expenses</small></div>
    </div>
    <section className="panel">
      <div className="panel-heading"><div><span className="eyebrow">SALES</span><h2>Delivered orders</h2></div></div>
      {sales.length ? <ul className="record-list">{sales.map((sale) => <li className="record-card" key={sale.id}>
        <div className="record-main">
          <b>{names.get(sale.orderId) ?? "Order"}</b>
          <p className="record-meta"><span>{sale.recognizedOn.toLocaleString()}</span></p>
        </div>
        <span className="record-price">{formatMoney(sale.amountMinor, resolveCurrency(sale.currency))}</span>
      </li>)}</ul> : <p className="empty-copy">No delivered sales in this range.</p>}
    </section>
    <section className="panel">
      <div className="panel-heading"><div><span className="eyebrow">EXPENSES</span><h2>Recorded purchases</h2></div></div>
      {expenses.length ? <ul className="record-list">{expenses.map((expense) => <li className="record-card" key={expense.id}>
        <div className="record-main">
          <b>{expense.description}</b>
          <p className="record-meta"><span>{expense.occurredOn.toLocaleString()}</span></p>
        </div>
        <span className="record-price">{formatMoney(expense.amountMinor, currency)}</span>
      </li>)}</ul> : <p className="empty-copy">No expenses in this range.</p>}
    </section>
  </div>;
}

export default withDatabasePage(FinancePage);
