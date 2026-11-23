"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { documentTotals } from "@/lib/documents";
import { parseMoneyToMinor, resolveCurrency } from "@/lib/money";
import { PAYMENT_STATUSES } from "@/lib/orders";
import { prisma } from "@/lib/prisma";
import { requireCrafter } from "@/lib/session";

const lineSchema = z.object({
  label: z.string().trim().min(1).max(120),
  quantity: z.number().finite().positive(),
  unitPriceMinor: z.number().int().nonnegative(),
});

const documentSchema = z.object({
  orderId: z.string().optional(),
  kind: z.enum(["invoice", "receipt"]),
  customerName: z.string().trim().min(1).max(120),
  customerPhone: z.string().trim().max(40),
  customerEmail: z.union([z.literal(""), z.string().trim().email().max(120)]),
  customerAddress: z.string().trim().max(300),
  discountMinor: z.number().int().nonnegative(),
  shippingMinor: z.number().int().nonnegative(),
  taxLabel: z.string().trim().max(40),
  taxMinor: z.number().int().nonnegative(),
  paymentStatus: z.enum(PAYMENT_STATUSES.map((status) => status.id) as [string, ...string[]]),
  deliveryMethod: z.enum(["", "pickup", "courier", "meetup", "other"]),
  courier: z.string().trim().max(80),
  terms: z.string().trim().max(500),
  note: z.string().trim().max(500),
  lines: z.array(lineSchema).min(1).max(30),
});

function moneyOrZero(value: unknown) {
  if (typeof value === "number" && Number.isInteger(value) && value >= 0) return value;
  const minor = parseMoneyToMinor(String(value ?? ""));
  if (minor === null) throw new Error("Enter a valid amount.");
  return minor;
}

export async function saveDocument(payload: unknown) {
  const user = await requireCrafter();
  const raw = typeof payload === "object" && payload !== null ? payload as Record<string, unknown> : {};
  const parsed = documentSchema.safeParse({
    ...raw,
    discountMinor: moneyOrZero(raw.discountMinor ?? raw.discount ?? "0"),
    shippingMinor: moneyOrZero(raw.shippingMinor ?? raw.shipping ?? "0"),
    taxMinor: moneyOrZero(raw.taxMinor ?? raw.tax ?? "0"),
  });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Check the document.");
  const input = parsed.data;
  documentTotals({
    lines: input.lines,
    discountMinor: input.discountMinor,
    shippingMinor: input.shippingMinor,
    taxMinor: input.taxMinor,
  });

  if (input.orderId) {
    const order = await prisma.shopOrder.findFirst({ where: { id: input.orderId, userId: user.id }, select: { id: true } });
    if (!order) throw new Error("That order is not on your board.");
  }

  const settings = await prisma.shopSettings.findUnique({ where: { userId: user.id } });
  const prefix = input.kind === "receipt" ? "RCT" : "INV";

  let createdId = "";
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const count = await prisma.businessDocument.count({ where: { userId: user.id, kind: input.kind } });
    const number = `${prefix}-${String(count + 1 + attempt).padStart(4, "0")}`;
    try {
      const created = await prisma.$transaction(async (tx) => {
        const document = await tx.businessDocument.create({
        data: {
          userId: user.id,
          orderId: input.orderId ?? "",
          kind: input.kind,
          number,
          customerName: input.customerName,
          customerPhone: input.customerPhone,
          customerEmail: input.customerEmail.toLowerCase(),
          customerAddress: input.customerAddress,
          businessName: settings?.businessName ?? "",
          businessAddress: settings?.businessAddress ?? "",
          businessPhone: settings?.businessPhone ?? "",
          businessEmail: settings?.businessEmail ?? "",
          logoPath: settings?.logoPath ?? "",
          paymentAccountName: settings?.paymentAccountName ?? "",
          bankDetails: settings?.bankDetails ?? "",
          gcashNumber: settings?.gcashNumber ?? "",
          currency: resolveCurrency(settings?.currency),
          discountMinor: input.discountMinor,
          shippingMinor: input.shippingMinor,
          taxLabel: input.taxLabel,
          taxMinor: input.taxMinor,
          paymentStatus: input.paymentStatus,
          deliveryMethod: input.deliveryMethod,
          courier: input.courier,
          terms: input.terms,
          note: input.note,
        },
      });
        await tx.businessDocumentLine.createMany({
          data: input.lines.map((line) => ({
            documentId: document.id,
            userId: user.id,
            label: line.label,
            quantity: line.quantity,
            unitPriceMinor: line.unitPriceMinor,
          })),
        });
        return document;
      });
      createdId = created.id;
      break;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002" && attempt < 2) continue;
      throw error;
    }
  }

  revalidatePath("/documents");
  revalidatePath(`/documents/${createdId}`);
  return { id: createdId };
}
