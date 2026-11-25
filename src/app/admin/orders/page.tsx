import { requireAdminSession } from "@/lib/admin-session";
import { prisma } from "@/lib/prisma";
import { AdminOrders } from "@/components/admin-orders";
import { withDatabasePage } from "@/lib/with-database-page";

async function AdminOrdersPage() {
  await requireAdminSession();
  const orders = await prisma.purchaseOrder.findMany({
    where: { status: { not: "draft" } },
    include: {
      crafter: { select: { name: true, email: true } },
      lines: { orderBy: { createdAt: "asc" } },
    },
    orderBy: { createdAt: "desc" },
  });
  return <div className="admin-page"><span className="eyebrow">CRAFTS &amp; PRODUCT REQUESTS</span><h1>Purchase requests</h1><p>Review submitted products and cost snapshots, then send a clear response to the crafter.</p><AdminOrders orders={orders.map((order) => ({...order, createdAt: order.createdAt.toISOString(), respondedAt: order.respondedAt?.toISOString() ?? null, lines: order.lines}))} /></div>;
}

export default withDatabasePage(AdminOrdersPage);
