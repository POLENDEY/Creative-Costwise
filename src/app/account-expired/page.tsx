import { getServerSession } from "next-auth";
import { Clock3, Sparkles } from "lucide-react";
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
  return <main className="expired-screen"><section className="expired-card"><span className="expired-mark"><Clock3 size={22} /></span><span className="eyebrow">A PAUSE IN YOUR JOURNEY</span><h1>Your toolkit access has ended.</h1><p>{user.name}, your plan ended on <b>{date}</b>. Your shop information is still safe. Please contact your toolkit administrator if you’d like to renew access.</p><div className="expired-actions"><ExpiredSignOut /></div><div className="expired-sparkle"><Sparkles size={15} /> Your work is still here when you return.</div></section></main>;
}
