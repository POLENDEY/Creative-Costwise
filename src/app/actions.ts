"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "admin") {
    throw new Error("Administrator access is required.");
  }
  return session.user.id;
}

const passwordSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().email(),
  plan: z.enum(["quarterly", "annual"]),
});

function addCalendarMonths(date: Date, months: number) {
  const result = new Date(date);
  const originalDay = result.getDate();
  result.setMonth(result.getMonth() + months, 1);
  const lastDay = new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate();
  result.setDate(Math.min(originalDay, lastDay));
  return result;
}

export async function createCrafter(formData: FormData) {
  await requireAdmin();
  const parsed = passwordSchema.safeParse({
    name: formData.get("name"),
    email: String(formData.get("email") ?? "").toLowerCase(),
    plan: formData.get("plan"),
  });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Check the account details.");

  const exists = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (exists) throw new Error("An account with that email already exists.");
  const temporaryPassword = crypto.randomUUID().replace(/-/g, "").slice(0, 12);
  const passwordHash = await bcrypt.hash(temporaryPassword, 12);
  const now = new Date();
  const expiresAt = addCalendarMonths(now, parsed.data.plan === "annual" ? 12 : 3);

  await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        ...parsed.data,
        passwordHash,
        role: "crafter",
        expiresAt,
        mustChangePassword: true,
      },
    });
    await tx.shopSettings.create({ data: { userId: user.id } });
  });
  revalidatePath("/admin/users");
  return {
    temporaryPassword,
    crafterName: parsed.data.name,
    crafterEmail: parsed.data.email,
  };
}

const changePasswordSchema = z.object({
  password: z.string().min(10, "Use at least 10 characters for your new password."),
  confirmPassword: z.string(),
}).refine((value) => value.password === value.confirmPassword, {
  message: "The passwords do not match.",
  path: ["confirmPassword"],
});

export async function changePassword(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");
  const parsed = changePasswordSchema.safeParse({
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Check your new password.");
  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  const result = await prisma.user.updateMany({
    where: { id: session.user.id, mustChangePassword: true },
    data: { passwordHash, mustChangePassword: false },
  });
  if (result.count !== 1) throw new Error("Your password could not be updated. Sign in again and retry.");
  revalidatePath("/", "layout");
  redirect(session.user.role === "admin" ? "/admin/users" : "/dashboard");
}

const accessActionSchema = z.object({
  userId: z.string().min(1),
  action: z.enum(["renew", "change-plan", "disable", "enable"]),
  plan: z.enum(["quarterly", "annual"]).optional(),
});

export async function updateCrafterAccess(formData: FormData) {
  await requireAdmin();
  const parsed = accessActionSchema.safeParse({
    userId: formData.get("userId"),
    action: formData.get("action"),
    plan: formData.get("plan") || undefined,
  });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Choose a valid account action.");
  const user = await prisma.user.findFirst({
    where: { id: parsed.data.userId, role: "crafter" },
    select: { id: true, plan: true, expiresAt: true },
  });
  if (!user) throw new Error("That crafter account could not be found.");

  if (parsed.data.action === "renew") {
    const now = new Date();
    const renewalStart = user.expiresAt && user.expiresAt > now ? user.expiresAt : now;
    await prisma.user.update({
      where: { id: user.id },
      data: { expiresAt: addCalendarMonths(renewalStart, user.plan === "annual" ? 12 : 3) },
    });
  } else if (parsed.data.action === "change-plan") {
    if (!parsed.data.plan) throw new Error("Choose a plan before changing access.");
    await prisma.user.update({ where: { id: user.id }, data: { plan: parsed.data.plan } });
  } else if (parsed.data.action === "disable") {
    await prisma.user.update({ where: { id: user.id }, data: { disabledAt: new Date() } });
  } else {
    await prisma.user.update({ where: { id: user.id }, data: { disabledAt: null } });
  }
  revalidatePath("/admin/users");
}

export async function markWelcomed() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "crafter") redirect("/login");
  await prisma.user.updateMany({
    where: { id: session.user.id, welcomedAt: null },
    data: { welcomedAt: new Date() },
  });
  revalidatePath("/", "layout");
}
