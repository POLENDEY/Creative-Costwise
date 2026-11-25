import { AppFrame } from "@/components/app-frame";
import { prisma } from "@/lib/prisma";
import { requireCrafter } from "@/lib/session";
import { withDatabasePage } from "@/lib/with-database-page";

async function ShopLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const user = await requireCrafter();
  const [settings, notifications] = await Promise.all([
    prisma.shopSettings.findUnique({ where: { userId: user.id } }),
    prisma.notification.findMany({
      where: { userId: user.id, readAt: null },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: { id: true, title: true, message: true, href: true, createdAt: true },
    }),
  ]);
  return (
    <div data-theme={settings?.theme ?? "pink"} data-scheme={settings?.colorScheme ?? "light"}>
      <AppFrame
        userId={user.id}
        name={user.name}
        businessName={settings?.businessName ?? ""}
        welcomeNeeded={!user.welcomedAt}
        plan={user.plan ?? "quarterly"}
        expiresAt={user.expiresAt?.toISOString() ?? null}
        accessReason={user.access.reason}
        colorScheme={settings?.colorScheme === "dark" ? "dark" : "light"}
        notifications={notifications.map((notification) => ({ ...notification, createdAt: notification.createdAt.toISOString() }))}
      >{children}</AppFrame>
    </div>
  );
}

export default withDatabasePage(ShopLayout);
