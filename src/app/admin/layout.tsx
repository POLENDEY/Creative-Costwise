import { AdminFrame } from "@/components/admin-frame";
import { requireAdminSession } from "@/lib/admin-session";
import { prisma } from "@/lib/prisma";
import { withDatabasePage } from "@/lib/with-database-page";

async function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const user = await requireAdminSession();
  const notifications = await prisma.notification.findMany({
    where: { userId: user.id, readAt: null },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: { id: true, title: true, message: true, href: true, createdAt: true },
  });
  return <AdminFrame
    name={user.name ?? "Administrator"}
    notifications={notifications.map((notification) => ({ ...notification, createdAt: notification.createdAt.toISOString() }))}
  >{children}</AdminFrame>;
}

export default withDatabasePage(AdminLayout);
