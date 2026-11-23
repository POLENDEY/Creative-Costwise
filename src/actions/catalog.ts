"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { calculateBundle } from "@/lib/bundle";
import { discountAmount } from "@/lib/orders";
import { prisma } from "@/lib/prisma";
import { requireCrafter } from "@/lib/session";

const bundleSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1).max(100),
  priceMinor: z.number().int().nonnegative(),
  items: z.array(z.object({
    priceSetId: z.string().min(1),
    quantity: z.number().finite().positive(),
  })).min(1).max(20),
});

export async function saveBundle(payload: unknown) {
  const user = await requireCrafter();
  const parsed = bundleSchema.safeParse(payload);
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Check the bundle.");
  const input = parsed.data;
  const priceSets = await prisma.priceSet.findMany({
    where: { userId: user.id, id: { in: input.items.map((item) => item.priceSetId) } },
  });
  if (input.items.some((item) => !priceSets.some((priceSet) => priceSet.id === item.priceSetId))) {
    throw new Error("Choose products from your price list.");
  }
  const totals = calculateBundle({
    bundlePriceMinor: input.priceMinor,
    items: input.items.map((item) => {
      const product = priceSets.find((priceSet) => priceSet.id === item.priceSetId)!;
      return {
        regularPriceMinor: product.retailPriceMinor,
        productionCostMinor: product.productionCostMinor,
        quantity: item.quantity,
      };
    }),
  });
  if (!Number.isFinite(totals.regularMinor)) throw new Error("The bundle totals could not be calculated.");

  const bundleId = await prisma.$transaction(async (tx) => {
    if (input.id) {
      const owned = await tx.bundle.findFirst({ where: { id: input.id, userId: user.id }, select: { id: true } });
      if (!owned) throw new Error("That bundle is not in your list.");
    }
    const saved = input.id
      ? await tx.bundle.update({
        where: { id: input.id },
        data: { name: input.name, priceMinor: input.priceMinor },
      })
      : await tx.bundle.create({
        data: { userId: user.id, name: input.name, priceMinor: input.priceMinor },
      });
    if (input.id) await tx.bundleItem.deleteMany({ where: { bundleId: saved.id, userId: user.id } });
    await tx.bundleItem.createMany({
      data: input.items.map((item) => ({
        bundleId: saved.id,
        userId: user.id,
        priceSetId: item.priceSetId,
        quantity: item.quantity,
      })),
    });
    return saved.id;
  });

  revalidatePath("/bundles");
  revalidatePath("/orders");
  return { id: bundleId };
}

const promotionSchema = z.object({
  code: z.string().trim().max(40),
  originalMinor: z.number().int().nonnegative(),
  kind: z.enum(["percent", "fixed"]),
  percent: z.number().finite().optional(),
  fixedMinor: z.number().int().nonnegative().optional(),
  note: z.string().trim().max(300),
  upcomingNote: z.string().trim().max(300),
});

export async function savePromotion(payload: unknown) {
  const user = await requireCrafter();
  const parsed = promotionSchema.safeParse(payload);
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Check the promotion.");
  const input = parsed.data;
  const result = input.kind === "percent"
    ? discountAmount(input.originalMinor, "percent", input.percent ?? Number.NaN)
    : discountAmount(input.originalMinor, "fixed", input.fixedMinor ?? -1);

  await prisma.promotion.create({
    data: {
      userId: user.id,
      code: input.code,
      originalMinor: input.originalMinor,
      kind: input.kind,
      discountMinor: result.discountMinor,
      saleMinor: result.saleMinor,
      note: input.note,
      upcomingNote: input.upcomingNote,
    },
  });
  revalidatePath("/promotions");
}

const digitalSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1).max(120),
  priceMinor: z.number().int().nonnegative(),
  url: z.string().url().max(300),
});

export async function saveDigitalProduct(payload: unknown) {
  const user = await requireCrafter();
  const parsed = digitalSchema.safeParse(payload);
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Check the digital product.");
  const input = parsed.data;
  if (input.id) {
    const owned = await prisma.digitalProduct.findFirst({ where: { id: input.id, userId: user.id }, select: { id: true } });
    if (!owned) throw new Error("That digital product is not in your list.");
    await prisma.digitalProduct.update({
      where: { id: owned.id },
      data: { name: input.name, priceMinor: input.priceMinor, url: input.url },
    });
  } else {
    await prisma.digitalProduct.create({
      data: { userId: user.id, name: input.name, priceMinor: input.priceMinor, url: input.url },
    });
  }
  revalidatePath("/digital");
  revalidatePath("/orders");
}
