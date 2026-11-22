import { AppFrame } from "@/components/app-frame";
import { prisma } from "@/lib/prisma";
import { requireCrafter } from "@/lib/session";

export default async function ShopLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const user = await requireCrafter();
  const settings = await prisma.shopSettings.findUnique({ where: { userId: user.id } });
  return (
    <div data-theme={settings?.theme ?? "pink"} data-scheme={settings?.colorScheme ?? "light"}>
      <AppFrame name={user.name} businessName={settings?.businessName ?? ""} welcomeNeeded={!user.welcomedAt}>{children}</AppFrame>
    </div>
  );
}
