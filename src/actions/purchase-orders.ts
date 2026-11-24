"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireCrafter } from "@/lib/session";
import { requireAdminSession } from "@/lib/admin-session";
import { getProductCostBreakdown } from "@/lib/product-breakdown";
import { getAdminNotificationAddress, sendPurchaseOrderEmail } from "@/lib/purchase-order-email";

const lineRequestSchema = z.object({
  priceSetId: z.string().min(1),
  pricingOption: z.enum(["retail", "bulk"]),
  quantity: z.number().int().min(1).max(10000),
});
const draftBaseSchema = z.object({
  lines: z.array(lineRequestSchema).max(30),
  note: z.string().trim().max(1200),
});
const draftSchema = draftBaseSchema.refine((value) => new Set(value.lines.map((line) => line.priceSetId)).size === value.lines.length, {
  message: "Add each product only once and update its quantity.",
});
const requestSchema = draftBaseSchema.extend({
  lines: z.array(lineRequestSchema).min(1).max(30),
}).refine((value) => new Set(value.lines.map((line) => line.priceSetId)).size === value.lines.length, {
  message: "Add each product only once and update its quantity.",
});
const MAX_STORED_MONEY_MINOR = 2_147_483_647;

async function buildLineSnapshots(userId: string, lines: z.infer<typeof lineRequestSchema>[]) {
  const selectedIds = lines.map((line) => line.priceSetId);
  const [settings, priceSets] = await Promise.all([
    prisma.shopSettings.findUnique({ where: { userId } }),
    prisma.priceSet.findMany({
      where: { userId, id: { in: selectedIds } },
      include: {
        costingTab: {
          include: {
            materialLines: { include: { material: true } },
            printLines: { include: { printer: true } },
          },
        },
      },
    }),
  ]);
  if (priceSets.length !== selectedIds.length) {
    throw new Error("One or more selected products could not be found in your shop.");
  }
  const currency = settings?.currency ?? "PHP";
  const lineSnapshots = lines.map((requestedLine) => {
    const priceSet = priceSets.find((item) => item.id === requestedLine.priceSetId);
    if (!priceSet) throw new Error("A selected product is no longer available.");
    const breakdown = getProductCostBreakdown(priceSet);
    const unitPriceMinor = requestedLine.pricingOption === "retail"
      ? priceSet.retailPriceMinor
      : priceSet.bulkPriceMinor;
    const lineTotalMinor = unitPriceMinor * requestedLine.quantity;
    const lineProductionCostMinor = breakdown.productionCostMinor * requestedLine.quantity;
    if (
      !Number.isSafeInteger(lineTotalMinor) ||
      lineTotalMinor > MAX_STORED_MONEY_MINOR ||
      !Number.isSafeInteger(lineProductionCostMinor) ||
      lineProductionCostMinor > MAX_STORED_MONEY_MINOR
    ) {
      throw new Error(`${priceSet.name} exceeds the maximum supported order value.`);
    }
    return {
      priceSetId: priceSet.id,
      productName: priceSet.name,
      category: priceSet.category,
      pricingOption: requestedLine.pricingOption,
      quantity: requestedLine.quantity,
      unitPriceMinor,
      unitProductionCostMinor: breakdown.productionCostMinor,
      lineTotalMinor,
      lineProductionCostMinor,
      breakdownJson: JSON.stringify(breakdown),
    };
  });
  return {
    currency,
    lineSnapshots,
    totalMinor: lineSnapshots.reduce((total, line) => total + line.lineTotalMinor, 0),
  };
}

export async function savePurchaseOrderDraft(payload: unknown) {
  const crafter = await requireCrafter();
  const parsed = draftSchema.safeParse(payload);
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Check the draft details.");
  const { currency, lineSnapshots } = await buildLineSnapshots(crafter.id, parsed.data.lines);
  const hasContent = parsed.data.lines.length > 0 || parsed.data.note.length > 0;
  const draft = await prisma.$transaction(async (tx) => {
    const existing = await tx.purchaseOrder.findFirst({
      where: { userId: crafter.id, status: "draft" },
      select: { id: true },
      orderBy: { updatedAt: "desc" },
    });
    if (!hasContent) {
      if (existing) await tx.purchaseOrder.delete({ where: { id: existing.id } });
      return null;
    }
    if (existing) {
      return tx.purchaseOrder.update({
        where: { id: existing.id },
        data: {
          note: parsed.data.note,
          currency,
          lines: { deleteMany: {}, create: lineSnapshots },
        },
        select: { id: true, updatedAt: true },
      });
    }
    return tx.purchaseOrder.create({
      data: {
        userId: crafter.id,
        status: "draft",
        currency,
        note: parsed.data.note,
        lines: { create: lineSnapshots },
      },
      select: { id: true, updatedAt: true },
    });
  });
  return { id: draft?.id ?? null, savedAt: draft?.updatedAt.toISOString() ?? null };
}

export async function submitPurchaseOrder(payload: unknown) {
  const crafter = await requireCrafter();
  const parsed = requestSchema.safeParse(payload);
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Check the purchase request.");
  const { currency, lineSnapshots, totalMinor } = await buildLineSnapshots(crafter.id, parsed.data.lines);
  const purchaseOrder = await prisma.$transaction(async (tx) => {
    const draft = await tx.purchaseOrder.findFirst({
      where: { userId: crafter.id, status: "draft" },
      select: { id: true },
      orderBy: { updatedAt: "desc" },
    });
    const order = draft
      ? await tx.purchaseOrder.update({
          where: { id: draft.id },
          data: {
            status: "pending",
            currency,
            note: parsed.data.note,
            lines: { deleteMany: {}, create: lineSnapshots },
          },
          include: { lines: true },
        })
      : await tx.purchaseOrder.create({
          data: {
            userId: crafter.id,
            currency,
            note: parsed.data.note,
            lines: { create: lineSnapshots },
          },
          include: { lines: true },
        });
    const admins = await tx.user.findMany({ where: { role: "admin" }, select: { id: true } });
    await Promise.all(admins.map((admin) => tx.notification.create({
      data: {
        userId: admin.id,
        title: "New purchase request",
        message: `${crafter.name} submitted request ${order.id.slice(-8).toUpperCase()}.`,
        href: "/admin/orders",
      },
    })));
    return order;
  });

  const adminEmail = getAdminNotificationAddress();
  const notification = adminEmail
    ? await sendPurchaseOrderEmail({
        to: adminEmail,
        recipientName: "Creative Costwise admin",
        purchaseOrderId: purchaseOrder.id,
        crafterName: crafter.name,
        crafterEmail: crafter.email,
        currency,
        note: purchaseOrder.note,
        statusLabel: "received",
        lines: purchaseOrder.lines,
        totalMinor,
        actionPath: "/admin/orders",
      })
    : { sent: false, reason: "Admin email is not configured; the request is available in the admin inbox." };

  revalidatePath("/purchase-orders");
  revalidatePath("/admin/orders");
  return {
    id: purchaseOrder.id,
    emailSent: notification.sent,
    message: notification.reason,
  };
}

const responseSchema = z.object({
  purchaseOrderId: z.string().min(1),
  status: z.enum(["approved", "declined", "changes_requested"]),
  response: z.string().trim().min(2, "Add a short reply for the crafter.").max(1200),
});

const lineSnapshotSchema = z.object({
  productName: z.string(),
  category: z.string(),
  quantity: z.number().int().positive(),
  unitPriceMinor: z.number().int().nonnegative(),
  unitProductionCostMinor: z.number().int().nonnegative(),
  breakdownJson: z.string(),
});

export async function respondToPurchaseOrder(formData: FormData) {
  await requireAdminSession();
  const parsed = responseSchema.safeParse({
    purchaseOrderId: formData.get("purchaseOrderId"),
    status: formData.get("status"),
    response: formData.get("response"),
  });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Check your response.");

  const purchaseOrder = await prisma.$transaction(async (tx) => {
    const existing = await tx.purchaseOrder.findUnique({
      where: { id: parsed.data.purchaseOrderId },
      include: { crafter: { select: { id: true, name: true, email: true } }, lines: true },
    });
    if (!existing) throw new Error("This purchase request could not be found.");
    if (!["pending", "changes_requested"].includes(existing.status)) {
      throw new Error("This purchase request has already received a final decision.");
    }

    await tx.purchaseOrder.update({
      where: { id: existing.id },
      data: { status: parsed.data.status, response: parsed.data.response, respondedAt: new Date() },
    });
    await tx.notification.create({
      data: {
        userId: existing.crafter.id,
        title: `Purchase request ${parsed.data.status.replaceAll("_", " ")}`,
        message: `Your request ${existing.id.slice(-8).toUpperCase()} has a new admin response.`,
        href: "/purchase-orders",
      },
    });

    if (parsed.data.status === "approved") {
      for (const line of existing.lines) {
        const snapshot = lineSnapshotSchema.safeParse({
          productName: line.productName,
          category: line.category,
          quantity: line.quantity,
          unitPriceMinor: line.unitPriceMinor,
          unitProductionCostMinor: line.unitProductionCostMinor,
          breakdownJson: line.breakdownJson,
        });
        if (!snapshot.success) throw new Error("A product snapshot is invalid; the request was not approved.");
        await tx.adminInventoryItem.create({
          data: {
            purchaseOrderLineId: line.id,
            crafterName: existing.crafter.name,
            crafterEmail: existing.crafter.email,
            productName: snapshot.data.productName,
            category: snapshot.data.category,
            currency: existing.currency,
            quantityReceived: snapshot.data.quantity,
            quantityOnHand: snapshot.data.quantity,
            unitPriceMinor: snapshot.data.unitPriceMinor,
            unitProductionCostMinor: snapshot.data.unitProductionCostMinor,
            breakdownJson: snapshot.data.breakdownJson,
          },
        });
      }
    }
    return { ...existing, status: parsed.data.status, response: parsed.data.response };
  });

  const lineSnapshots = purchaseOrder.lines.map((line) => ({
    productName: line.productName,
    quantity: line.quantity,
    unitPriceMinor: line.unitPriceMinor,
    unitProductionCostMinor: line.unitProductionCostMinor,
    lineTotalMinor: line.lineTotalMinor,
    breakdownJson: line.breakdownJson,
  }));
  const totalMinor = lineSnapshots.reduce((total, line) => total + line.lineTotalMinor, 0);
  const notification = await sendPurchaseOrderEmail({
    to: purchaseOrder.crafter.email,
    recipientName: purchaseOrder.crafter.name,
    purchaseOrderId: purchaseOrder.id,
    crafterName: purchaseOrder.crafter.name,
    crafterEmail: purchaseOrder.crafter.email,
    currency: purchaseOrder.currency,
    note: purchaseOrder.note,
    response: purchaseOrder.response,
    statusLabel: purchaseOrder.status.replaceAll("_", " "),
    lines: lineSnapshots,
    totalMinor,
    actionPath: "/purchase-orders",
  });

  revalidatePath("/admin/orders");
  revalidatePath("/admin/inventory");
  revalidatePath("/purchase-orders");
  return { emailSent: notification.sent, message: notification.reason };
}

const inventorySchema = z.object({
  inventoryItemId: z.string().min(1),
  quantityOnHand: z.number().int().min(0).max(100000000),
});

export async function updateAdminInventoryQuantity(formData: FormData) {
  await requireAdminSession();
  const quantityText = formData.get("quantityOnHand");
  if (typeof quantityText !== "string" || !/^\d+$/.test(quantityText)) {
    throw new Error("Enter a whole-number inventory count.");
  }
  const parsed = inventorySchema.safeParse({
    inventoryItemId: formData.get("inventoryItemId"),
    quantityOnHand: Number(quantityText),
  });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Enter a valid inventory count.");
  const updated = await prisma.adminInventoryItem.updateMany({
    where: { id: parsed.data.inventoryItemId },
    data: { quantityOnHand: parsed.data.quantityOnHand },
  });
  if (updated.count !== 1) throw new Error("The inventory item could not be found.");
  revalidatePath("/admin/inventory");
}
