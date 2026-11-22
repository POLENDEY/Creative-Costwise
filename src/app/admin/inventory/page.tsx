import { requireAdminSession } from "@/lib/admin-session";
import { prisma } from "@/lib/prisma";
import { AdminInventory } from "@/components/admin-inventory";

export default async function AdminInventoryPage() {
  await requireAdminSession();
  const items = await prisma.adminInventoryItem.findMany({ orderBy: { updatedAt: "desc" } });
  return <div className="admin-page"><span className="eyebrow">APPROVED PRODUCTS</span><h1>Product inventory</h1><p>Inventory is admin-only. Approving a purchase request adds its products and initial quantities here.</p><AdminInventory items={items.map((item) => ({ ...item, createdAt: item.createdAt.toISOString() }))} /></div>;
}
