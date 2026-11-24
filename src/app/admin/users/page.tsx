import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { UsersRound, Sparkles } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AdminUsers } from "@/components/admin-users";
import { emailConfigured } from "@/lib/mailer";
import { getPlanCatalog } from "@/lib/plan-catalog";

export default async function AdminUsersPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");
  if (session.user.role !== "admin") redirect("/dashboard");
  const [users, prices] = await Promise.all([
    prisma.user.findMany({
    where: { role: "crafter" },
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, email: true, plan: true, expiresAt: true, disabledAt: true },
  }),
    getPlanCatalog(),
  ]);
  return <main className="admin-page"><span className="eyebrow"><Sparkles size={13} /> CREATIVE COSTWISE ADMIN</span><h1>Crafter accounts</h1><p>Create a login after a customer’s purchase and manage their toolkit access.</p><AdminUsers emailReady={emailConfigured()} prices={prices} users={users.map((user) => ({ ...user, expiresAt: user.expiresAt?.toISOString() ?? null, disabledAt: user.disabledAt?.toISOString() ?? null }))} /><div className="admin-admin-note"><UsersRound size={15} /> Admin access is separate from each crafter’s shop and plan.</div></main>;
}
