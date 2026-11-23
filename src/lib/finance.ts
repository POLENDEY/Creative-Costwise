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
