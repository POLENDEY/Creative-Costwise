"use server";

import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const notificationSchema = z.object({
  id: z.string().min(1),
  title: z.string(),
  message: z.string(),
  href: z.string(),
  createdAt: z.string(),
});

async function getAccountId() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("Sign in to view your notifications.");
  return session.user.id;
}

export async function getMyNotifications() {
  const userId = await getAccountId();
  const notifications = await prisma.notification.findMany({
    where: { userId, readAt: null },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: { id: true, title: true, message: true, href: true, createdAt: true },
  });
  return z.array(notificationSchema).parse(notifications.map((notification) => ({
    ...notification,
    createdAt: notification.createdAt.toISOString(),
  })));
}

export async function markNotificationRead(notificationId: string) {
  const userId = await getAccountId();
  const parsedId = z.string().min(1).safeParse(notificationId);
  if (!parsedId.success) throw new Error("Choose a valid notification.");
  const result = await prisma.notification.updateMany({
    where: { id: parsedId.data, userId, readAt: null },
    data: { readAt: new Date() },
  });
  return result.count > 0;
}
