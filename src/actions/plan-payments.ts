"use server";

import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireCrafter } from "@/lib/session";
import { requireAdminSession } from "@/lib/admin-session";
import { convertImageUploadToAvif } from "@/lib/images";
import { addPlanMonths, PLAN_KEYS, planFromPrices, planMonths } from "@/lib/plans";
import { getPlanCatalog } from "@/lib/plan-catalog";
import { isPlanPaymentMethod } from "@/lib/plan-payment-options";
import {
  notifyAdminsOfPlanPayment,
  notifyCrafterOfPlanPaymentDecision,
  sendPlanPaymentReceipt,
} from "@/lib/plan-payments";

const PROOF_ROOT = path.join(process.cwd(), "private-uploads");
const QR_ROOT = path.join(process.cwd(), "private-uploads", "plan-payments-qr");
/** QR codes saved by an earlier version lived in the public folder. */
const LEGACY_QR_ROOT = path.join(process.cwd(), "public", "uploads", "plan-payments", "qr");

async function removeProofFile(storedPath: string) {
  if (!storedPath) return;
  const filePath = path.resolve(PROOF_ROOT, storedPath);
  if (filePath.startsWith(PROOF_ROOT + path.sep)) {
    await rm(filePath, { force: true });
  }
}

async function removeQrFile(storedPath: string | null | undefined) {
  const filename = storedPath ? path.basename(storedPath) : "";
  if (!filename) return;
  for (const root of [QR_ROOT, LEGACY_QR_ROOT]) {
    await rm(path.join(root, filename), { force: true });
  }
}

const submitSchema = z.object({
  plan: z.enum(PLAN_KEYS),
  method: z.enum(["gcash", "maya", "bank", "other"]),
  reference: z.string().trim().max(80),
  note: z.string().trim().max(300),
});

function proofFile(formData: FormData) {
  const file = formData.get("proof");
  if (!(file instanceof File) || file.size === 0) {
    throw new Error("Attach a screenshot of your payment.");
  }
  if (file.size > 10 * 1024 * 1024) {
    throw new Error("The screenshot must be 10 MB or smaller.");
  }
  return file;
}

export async function submitPlanPayment(formData: FormData) {
  const user = await requireCrafter();
  const parsed = submitSchema.safeParse({
    plan: formData.get("plan"),
    method: formData.get("method"),
    reference: formData.get("reference") ?? "",
    note: formData.get("note") ?? "",
  });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Check the payment details.");
  if (!isPlanPaymentMethod(parsed.data.method)) throw new Error("Choose how you paid.");

  const file = proofFile(formData);
  const image = await convertImageUploadToAvif(file, {
    maxInputBytes: 10 * 1024 * 1024,
    maxDimension: 2400,
    quality: 78,
  });

  const directory = path.join(PROOF_ROOT, user.id);
  const filename = `${randomUUID()}.avif`;
  await mkdir(directory, { recursive: true });
  await writeFile(path.join(directory, filename), image.buffer, { flag: "wx" });

  const plan = planFromPrices(parsed.data.plan, await getPlanCatalog());
  const submittedAt = new Date();
  const payment = await prisma.planPayment.create({
    data: {
      userId: user.id,
      plan: plan.key,
      amountMinor: plan.priceMinor,
      method: parsed.data.method,
      reference: parsed.data.reference,
      note: parsed.data.note,
      proofPath: path.posix.join("plan-payments", user.id, filename),
      status: "pending",
      submittedAt,
    },
  });

  const notice = await notifyAdminsOfPlanPayment({
    paymentId: payment.id,
    crafterName: user.name,
    crafterEmail: user.email,
    plan: plan.key,
    amountMinor: plan.priceMinor,
    method: parsed.data.method,
    reference: parsed.data.reference,
    note: parsed.data.note,
    submittedAt,
  });

  // Both sides keep the same record: the admin gets the proof to review, the
  // crafter gets a receipt saying the screenshot arrived.
  const receipt = await sendPlanPaymentReceipt({
    paymentId: payment.id,
    crafterName: user.name,
    crafterEmail: user.email,
    plan: plan.key,
    amountMinor: plan.priceMinor,
    method: parsed.data.method,
    reference: parsed.data.reference,
    note: parsed.data.note,
    submittedAt,
  });

  const note = notice.sent && receipt.sent
    ? "Your admin was emailed the screenshot, and your receipt is on its way to your inbox."
    : receipt.sent
      ? "A receipt is on its way to your inbox. The admin also sees the proof in the admin workspace."
      : notice.sent
        ? "Your admin was emailed and has the screenshot in the admin workspace."
        : `${notice.reason} ${receipt.reason}`.trim();

  revalidatePath("/pricing");
  revalidatePath("/admin/payments");
  revalidatePath("/admin", "layout");
  return {
    plan: plan.label,
    emailSent: notice.sent,
    crafterEmailed: receipt.sent,
    note,
  };
}

const reviewSchema = z.object({
  paymentId: z.string().min(1),
  decision: z.enum(["approve", "reject"]),
  adminNote: z.string().trim().max(300),
});

export async function reviewPlanPayment(formData: FormData) {
  const admin = await requireAdminSession();
  const parsed = reviewSchema.safeParse({
    paymentId: formData.get("paymentId"),
    decision: formData.get("decision"),
    adminNote: formData.get("adminNote") ?? "",
  });
  if (!parsed.success) throw new Error("Choose whether to approve or reject this payment.");

  const payment = await prisma.planPayment.findUnique({
    where: { id: parsed.data.paymentId },
    include: { user: { select: { id: true, name: true, email: true, plan: true, expiresAt: true } } },
  });
  if (!payment) throw new Error("That payment proof could not be found.");
  if (payment.status !== "pending") throw new Error("This payment proof was already reviewed.");

  const reviewedAt = new Date();
  let renewedUntil: Date | null = null;
  if (parsed.data.decision === "reject") {
    await prisma.planPayment.update({
      where: { id: payment.id },
      data: {
        status: "rejected",
        adminNote: parsed.data.adminNote,
        reviewedAt,
        reviewedBy: admin.id,
      },
    });
  } else {
    const now = new Date();
    const start = payment.user.expiresAt && payment.user.expiresAt > now ? payment.user.expiresAt : now;
    const expiresAt = addPlanMonths(start, planMonths(payment.plan));
    renewedUntil = expiresAt;
    await prisma.$transaction(async (tx) => {
      await tx.planPayment.update({
        where: { id: payment.id },
        data: {
          status: "approved",
          adminNote: parsed.data.adminNote,
          reviewedAt,
          reviewedBy: admin.id,
        },
      });
      // The new term clears the reminder marker, so the automatic renewal email
      // only starts again once this fresh term has ended.
      await tx.user.update({
        where: { id: payment.userId },
        data: {
          plan: payment.plan,
          expiresAt,
          renewalReminderFor: null,
          renewalReminderSentAt: null,
        },
      });
    });
  }

  const decisionNotice = await notifyCrafterOfPlanPaymentDecision({
    crafterId: payment.user.id,
    crafterName: payment.user.name,
    crafterEmail: payment.user.email,
    plan: payment.plan,
    amountMinor: payment.amountMinor,
    decision: parsed.data.decision,
    adminNote: parsed.data.adminNote,
    expiresAt: renewedUntil,
  });

  revalidatePath("/admin/payments");
  revalidatePath("/admin/users");
  revalidatePath("/pricing");
  revalidatePath("/", "layout");
  return {
    emailed: decisionNotice.sent,
    note: decisionNotice.sent
      ? "The crafter has an in-app notification and an email."
      : `The crafter has an in-app notification. ${decisionNotice.reason}`,
  };
}

export async function deletePlanPayment(paymentId: string) {
  await requireAdminSession();
  if (!paymentId) throw new Error("Choose a payment proof to delete.");
  const payment = await prisma.planPayment.findUnique({
    where: { id: paymentId },
    select: { id: true, proofPath: true },
  });
  if (!payment) return;
  await prisma.planPayment.delete({ where: { id: payment.id } });
  await removeProofFile(payment.proofPath);
  revalidatePath("/admin/payments");
  revalidatePath("/pricing");
}

export async function deletePlanPaymentQr() {
  await requireAdminSession();
  const settings = await prisma.planPaymentSettings.findUnique({
    where: { id: "plan-payments" },
    select: { qrPath: true },
  });
  if (!settings?.qrPath) return;
  await prisma.planPaymentSettings.update({
    where: { id: "plan-payments" },
    data: { qrPath: null },
  });
  await removeQrFile(settings.qrPath);
  revalidatePath("/admin/payments");
  revalidatePath("/pricing");
}

const settingsSchema = z.object({
  accountName: z.string().trim().max(100),
  gcashNumber: z.string().trim().max(40),
  mayaNumber: z.string().trim().max(40),
  bankDetails: z.string().trim().max(300),
  instructions: z.string().trim().max(400),
});

export async function savePlanPaymentSettings(formData: FormData) {
  await requireAdminSession();
  const parsed = settingsSchema.safeParse({
    accountName: formData.get("accountName") ?? "",
    gcashNumber: formData.get("gcashNumber") ?? "",
    mayaNumber: formData.get("mayaNumber") ?? "",
    bankDetails: formData.get("bankDetails") ?? "",
    instructions: formData.get("instructions") ?? "",
  });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Check the payment details.");

  const previous = await prisma.planPaymentSettings.findUnique({
    where: { id: "plan-payments" },
    select: { qrPath: true },
  });
  let qrPath: string | undefined;
  const file = formData.get("qr");
  if (file instanceof File && file.size > 0) {
    const image = await convertImageUploadToAvif(file, {
      maxInputBytes: 4 * 1024 * 1024,
      maxDimension: 1200,
      quality: 85,
    });
    await mkdir(QR_ROOT, { recursive: true });
    const filename = `payment-qr-${randomUUID()}.avif`;
    await writeFile(path.join(QR_ROOT, filename), image.buffer, { flag: "wx" });
    qrPath = filename;
  }

  await prisma.planPaymentSettings.upsert({
    where: { id: "plan-payments" },
    update: { ...parsed.data, ...(qrPath ? { qrPath } : {}) },
    create: { id: "plan-payments", ...parsed.data, qrPath: qrPath ?? null },
  });
  if (qrPath && previous?.qrPath && path.basename(previous.qrPath) !== qrPath) {
    await removeQrFile(previous.qrPath);
  }

  revalidatePath("/admin/payments");
  revalidatePath("/pricing");
}
