import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function requireAdminSession() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, email: true, role: true, disabledAt: true },
  });
  if (!user) redirect("/login");
  if (user.disabledAt) redirect("/session-disabled");
  if (user.role !== "admin") redirect("/dashboard");

  return user;
}
