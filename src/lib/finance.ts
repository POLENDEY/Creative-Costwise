import { startOfMonth, startOfWeek, subDays } from "date-fns";

export type FinanceRange = "week" | "seven" | "month";

export function financeWindow(range: FinanceRange, now: Date) {
  if (range === "seven") return { from: subDays(now, 7), to: now };
  if (range === "month") return { from: startOfMonth(now), to: now };
  return { from: startOfWeek(now, { weekStartsOn: 1 }), to: now };
}

export function financeSummary(input: {
  sales: { amountMinor: number; recognizedOn: Date }[];
  expenses: { amountMinor: number; occurredOn: Date }[];
  from: Date;
  to: Date;
}) {
  const revenueMinor = input.sales
    .filter((sale) => sale.recognizedOn >= input.from && sale.recognizedOn <= input.to)
    .reduce((sum, sale) => sum + sale.amountMinor, 0);
  const expenseMinor = input.expenses
    .filter((expense) => expense.occurredOn >= input.from && expense.occurredOn <= input.to)
    .reduce((sum, expense) => sum + expense.amountMinor, 0);
  return { revenueMinor, expenseMinor, profitMinor: revenueMinor - expenseMinor };
}

export function financeDaily(input: {
  sales: { amountMinor: number; recognizedOn: Date }[];
  expenses: { amountMinor: number; occurredOn: Date }[];
  from: Date;
  to: Date;
}) {
  const rows: { label: string; revenue: number; expense: number }[] = [];
  const cursor = new Date(input.from);
  cursor.setHours(0, 0, 0, 0);
  const end = new Date(input.to);
  while (cursor <= end && rows.length < 31) {
    const day = cursor.toLocaleDateString("en-CA");
    const label = String(cursor.getDate());
    const revenue = input.sales
      .filter((sale) => sale.recognizedOn.toLocaleDateString("en-CA") === day)
      .reduce((sum, sale) => sum + sale.amountMinor, 0);
    const expense = input.expenses
      .filter((item) => item.occurredOn.toLocaleDateString("en-CA") === day)
      .reduce((sum, item) => sum + item.amountMinor, 0);
    rows.push({ label, revenue, expense });
    cursor.setDate(cursor.getDate() + 1);
  }
  return rows;
}
