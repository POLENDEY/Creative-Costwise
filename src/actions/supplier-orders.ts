"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { expenseSourceKey } from "@/lib/inventory";
import { prisma } from "@/lib/prisma";
import { requireCrafter } from "@/lib/session";
import { resolveCurrency } from "@/lib/money";

const lineSchema = z.object({
  materialId: z.string().min(1),
  packs: z.number().positive().max(10000),
  packPriceMinor: z.number().int().nonnegative(),
});

const createSchema = z.object({
  supplierName: z.string().trim().min(1).max(120),
  note: z.string().trim().max(500),
  lines: z.array(lineSchema).min(1).max(40),
});

export async function createSupplierOrder(payload: unknown) {
  const user = await requireCrafter();
  const parsed = createSchema.safeParse(payload);
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Check the supplier order.");
  const materials = await prisma.material.findMany({
    where: { userId: user.id, id: { in: parsed.data.lines.map((line) => line.materialId) } },
    select: { id: true, name: true },
  });
  const names = new Map(materials.map((material) => [material.id, material.name]));
  if (names.size !== new Set(parsed.data.lines.map((line) => line.materialId)).size) {
    throw new Error("One of those materials is not on your shelf.");
  }
  const settings = await prisma.shopSettings.findUnique({ where: { userId: user.id }, select: { currency: true } });
  await prisma.supplierOrder.create({
    data: {
      userId: user.id,
      supplierName: parsed.data.supplierName,
      note: parsed.data.note,
      currency: resolveCurrency(settings?.currency),
      status: "draft",
      lines: {
        create: parsed.data.lines.map((line) => ({
          userId: user.id,
          materialId: line.materialId,
          materialName: names.get(line.materialId) ?? "Material",
          packs: line.packs,
          packPriceMinor: line.packPriceMinor,
        })),
      },
    },
  });
  revalidatePath("/materials");
}

export async function setSupplierOrderStatus(orderId: string, status: "sent" | "received") {
  const user = await requireCrafter();
  const order = await prisma.supplierOrder.findFirst({
    where: { id: orderId, userId: user.id },
    include: { lines: true },
  });
  if (!order) throw new Error("That supplier order is not in your shop.");
  if (order.status === "received") return;
  if (status === "sent") {
    await prisma.supplierOrder.update({ where: { id: order.id }, data: { status: "sent" } });
    revalidatePath("/materials");
    return;
  }

  await prisma.$transaction(async (tx) => {
    for (const line of order.lines) {
      const material = await tx.material.findFirst({
        where: { id: line.materialId, userId: user.id },
        select: { id: true, name: true, quantityOnHand: true, piecesPerPack: true },
      });
      if (!material) continue;
      const added = line.packs * Number(material.piecesPerPack);
      const next = Number(material.quantityOnHand) + added;
      const sourceKey = expenseSourceKey("restock", user.id, `supplier-${order.id}-${line.id}`);
      try {
        const expense = await tx.expense.create({
          data: {
            userId: user.id,
            amountMinor: Math.round(line.packs * line.packPriceMinor),
            category: "packaging_supplies",
            paymentMethod: "other",
            description: `${order.supplierName}: ${line.materialName}`,
            sourceKey,
          },
        });
        await tx.inventoryMovement.create({
          data: {
            userId: user.id,
            materialId: material.id,
            kind: "restock",
            quantityBefore: Number(material.quantityOnHand),
            quantityAfter: next,
            expenseId: expense.id,
            note: `Received ${line.packs} pack${line.packs === 1 ? "" : "s"} from ${order.supplierName}`,
          },
        });
        await tx.material.update({ where: { id: material.id }, data: { quantityOnHand: next } });
      } catch (error) {
        if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") throw error;
      }
    }
    await tx.supplierOrder.update({
      where: { id: order.id },
      data: { status: "received", receivedAt: new Date() },
    });
  });
  revalidatePath("/materials");
  revalidatePath("/finance");
  revalidatePath("/dashboard");
}

export async function deleteSupplierOrder(orderId: string) {
  const user = await requireCrafter();
  const order = await prisma.supplierOrder.findFirst({
    where: { id: orderId, userId: user.id },
    select: { id: true, status: true },
  });
  if (!order) return;
  if (order.status === "received") throw new Error("A received order already updated your stock, so it stays in the list.");
  try {
    await prisma.supplierOrderLine.deleteMany({ where: { orderId: order.id, userId: user.id } });
    await prisma.supplierOrder.delete({ where: { id: order.id } });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") return;
    throw error;
  }
  revalidatePath("/materials");
}
