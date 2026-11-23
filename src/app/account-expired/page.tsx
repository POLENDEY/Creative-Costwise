import { getServerSession } from "next-auth";
import { Clock3 } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ExpiredSignOut } from "@/components/expired-sign-out";

export default async function AccountExpiredPage() {
  const session = await getServerSession(authOptions);
  const user = session?.user?.id ? await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { name: true, expiresAt: true, role: true },
  }) : null;
  if (!user || user.role !== "crafter") return <ExpiredSignOut />;
  const date = user.expiresAt
    ? new Intl.DateTimeFormat("en", { dateStyle: "long" }).format(user.expiresAt)
    : "the end of your current plan";
  return <main className="expired-screen"><section className="expired-card"><span className="expired-mark"><Clock3 size={22} /></span><h1>Your toolkit access has ended.</h1><p>{user.name}, your plan ended on <b>{date}</b>. Your shop records are still saved. Contact your toolkit admin to renew access.</p><div className="expired-actions"><ExpiredSignOut /></div></section></main>;
}
