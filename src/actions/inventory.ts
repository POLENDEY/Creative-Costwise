"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { expenseSourceKey, MAX_STARRED_CATEGORIES, PAYMENT_METHODS, restockToNewTotal } from "@/lib/inventory";
import { parseMoneyToMinor } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { requireCrafter } from "@/lib/session";
import { userFacingError } from "@/lib/user-facing-error";

const starSchema = z.object({
  name: z.string().trim().min(1).max(60),
  starred: z.enum(["true", "false"]),
});

export async function setMaterialCategoryStar(formData: FormData) {
  const user = await requireCrafter();
  const parsed = starSchema.safeParse({
    name: formData.get("name"),
    starred: formData.get("starred"),
  });
  if (!parsed.success) throw new Error("Choose a category to star.");
  const starred = parsed.data.starred === "true";

  if (starred) {
    const alreadyStarred = await prisma.materialCategory.count({
      where: { userId: user.id, starred: true, name: { not: parsed.data.name } },
    });
    if (alreadyStarred >= MAX_STARRED_CATEGORIES) {
      throw new Error("Five categories are already starred. Unstar one first.");
    }
  }

  await prisma.materialCategory.upsert({
    where: { userId_name: { userId: user.id, name: parsed.data.name } },
    create: { userId: user.id, name: parsed.data.name, starred },
    update: { starred },
  });
  revalidatePath("/materials");
}

const restockSchema = z.object({
  materialId: z.string().min(1),
  newTotal: z.number().finite().nonnegative(),
  amountMinor: z.number().int().nonnegative(),
  paymentMethod: z.enum(PAYMENT_METHODS),
  requestKey: z.string().uuid(),
});

export async function restockMaterial(formData: FormData) {
  const user = await requireCrafter();
  const amountMinor = parseMoneyToMinor(String(formData.get("amount") ?? ""));
  if (amountMinor === null) throw new Error("Enter the amount you spent.");
  const parsed = restockSchema.safeParse({
    materialId: formData.get("materialId"),
    newTotal: Number(formData.get("newTotal")),
    amountMinor,
    paymentMethod: formData.get("paymentMethod"),
    requestKey: formData.get("requestKey"),
  });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Check the restock details.");

  const material = await prisma.material.findFirst({
    where: { id: parsed.data.materialId, userId: user.id },
  });
  if (!material) throw new Error("That material is not in your library.");

  const next = restockToNewTotal(Number(material.quantityOnHand), parsed.data.newTotal);
  const sourceKey = expenseSourceKey("restock", user.id, parsed.data.requestKey);

  try {
    await prisma.$transaction(async (tx) => {
      const existing = await tx.expense.findUnique({ where: { sourceKey } });
      if (existing) return;
      const expense = await tx.expense.create({
        data: {
          userId: user.id,
          amountMinor: parsed.data.amountMinor,
          category: "packaging_supplies",
          paymentMethod: parsed.data.paymentMethod,
          description: `Restock ${material.name}`,
          sourceKey,
        },
      });
      await tx.inventoryMovement.create({
        data: {
          userId: user.id,
          materialId: material.id,
          kind: "restock",
          quantityBefore: Number(material.quantityOnHand),
          quantityAfter: next.quantityOnHand,
          expenseId: expense.id,
          note: `Set on-hand total to ${next.quantityOnHand}`,
        },
      });
      await tx.material.update({
        where: { id: material.id },
        data: { quantityOnHand: next.quantityOnHand },
      });
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return;
    throw new Error(userFacingError(error, "Could not update stock."));
  }

  revalidatePath("/materials");
  revalidatePath("/dashboard");
}
