import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function requireCrafter() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");
  if (session.user.role !== "crafter") redirect("/admin/users");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, email: true, expiresAt: true, disabledAt: true, mustChangePassword: true, plan: true, welcomedAt: true },
  });
  if (!user) redirect("/login");
  if (user.disabledAt) redirect("/session-disabled");
  if (user.mustChangePassword) redirect("/change-password");
  if (user.expiresAt && user.expiresAt.getTime() < Date.now()) redirect("/account-expired");
  return user;
}
