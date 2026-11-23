import Link from "next/link";
import { Plus } from "lucide-react";
import { OrderBoard } from "@/components/order-board";
import { orderTotals, formatIsoDate, isOrderStage } from "@/lib/orders";
import { prisma } from "@/lib/prisma";
import { requireCrafter } from "@/lib/session";
import { resolveCurrency } from "@/lib/money";

export default async function OrdersPage() {
  const user = await requireCrafter("orders");
  const [settings, orders, lines] = await Promise.all([
    prisma.shopSettings.findUnique({ where: { userId: user.id } }),
    prisma.shopOrder.findMany({ where: { userId: user.id }, orderBy: { updatedAt: "desc" } }),
    prisma.shopOrderLine.findMany({ where: { userId: user.id } }),
  ]);
  const currency = resolveCurrency(settings?.currency);
  const boardOrders = orders.flatMap((order) => {
    if (!isOrderStage(order.stage)) return [];
    const orderLines = lines.filter((line) => line.orderId === order.id);
    const totals = orderTotals({
      lines: orderLines,
      discountMinor: order.discountMinor,
      shippingMinor: order.shippingMinor,
    });
    return [{
      id: order.id,
      customerName: order.customerName,
      stage: order.stage,
      totalMinor: totals.totalMinor,
      dueOn: formatIsoDate(order.dueOn),
    }];
  });

  return <div className="feature-page">
    <div className="page-heading">
      <div><span className="eyebrow">FROM INQUIRY TO DONE</span><h1>Order <em>board</em></h1><p>Drag a card between columns. A deposit before production is only a recommendation.</p></div>
      <Link href="/orders/new" className="button button-primary"><Plus size={17} /> New order</Link>
    </div>
    <OrderBoard orders={boardOrders} currency={currency} />
  </div>;
}
