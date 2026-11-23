"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { expenseSourceKey, PAYMENT_METHODS } from "@/lib/inventory";
import { parseMoneyToMinor } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { requireCrafter } from "@/lib/session";

const supplySchema = z.object({
  name: z.string().trim().min(1).max(100),
  supplierUrl: z.union([z.literal(""), z.string().url().max(300)]),
  amountMinor: z.number().int().nonnegative(),
  paymentMethod: z.enum(PAYMENT_METHODS),
  requestKey: z.string().uuid(),
});

export async function recordPrinterSupplyPurchase(formData: FormData) {
  const user = await requireCrafter();
  const amountMinor = parseMoneyToMinor(String(formData.get("amount") ?? ""));
  if (amountMinor === null) throw new Error("Enter the amount you spent.");
  const parsed = supplySchema.safeParse({
    name: formData.get("name"),
    supplierUrl: String(formData.get("supplierUrl") ?? ""),
    amountMinor,
    paymentMethod: formData.get("paymentMethod"),
    requestKey: formData.get("requestKey"),
  });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Check the supply details.");

  const sourceKey = expenseSourceKey("supply", user.id, parsed.data.requestKey);
  try {
    await prisma.$transaction(async (tx) => {
      const existing = await tx.expense.findUnique({ where: { sourceKey } });
      if (existing) return;
      await tx.printerSupply.upsert({
        where: { userId_name: { userId: user.id, name: parsed.data.name } },
        create: {
          userId: user.id,
          name: parsed.data.name,
          supplierUrl: parsed.data.supplierUrl,
          lastPriceMinor: parsed.data.amountMinor,
        },
        update: {
          supplierUrl: parsed.data.supplierUrl,
          lastPriceMinor: parsed.data.amountMinor,
        },
      });
      await tx.expense.create({
        data: {
          userId: user.id,
          amountMinor: parsed.data.amountMinor,
          category: "printer_supplies",
          paymentMethod: parsed.data.paymentMethod,
          description: `Printer supply: ${parsed.data.name}`,
          sourceKey,
        },
      });
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return;
    throw error;
  }

  revalidatePath("/print-hub");
}

const templateSchema = z.object({
  name: z.string().trim().min(1).max(100),
  url: z.string().url().max(300),
  note: z.string().trim().max(200),
});

export async function createPrintTemplate(formData: FormData) {
  const user = await requireCrafter();
  const parsed = templateSchema.safeParse({
    name: formData.get("name"),
    url: formData.get("url"),
    note: formData.get("note") ?? "",
  });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Check the template link.");

  await prisma.printTemplate.create({
    data: { userId: user.id, ...parsed.data },
  });
  revalidatePath("/print-hub");
}
