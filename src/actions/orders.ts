"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { calculateBundle } from "@/lib/bundle";
import { parseMoneyToMinor, resolveCurrency } from "@/lib/money";
import {
  DELIVERY_METHODS,
  discountAmount,
  isOrderStage,
  orderTotals,
  parseOptionalDate,
  PAYMENT_STATUSES,
} from "@/lib/orders";
import { prisma } from "@/lib/prisma";
import { requirePlanFeature } from "@/lib/session";
import { userFacingError } from "@/lib/user-facing-error";

const lineSchema = z.object({
  kind: z.enum(["product", "bundle", "digital"]).default("product"),
  priceSetId: z.string().default(""),
  sourceId: z.string().default(""),
  priceOption: z.enum(["retail", "bulk"]),
  quantity: z.number().finite().positive(),
});

const orderSchema = z.object({
  id: z.string().optional(),
  customerId: z.string().optional(),
  customerName: z.string().trim().min(1).max(120),
  customerPhone: z.string().trim().max(40),
  customerEmail: z.union([z.literal(""), z.string().trim().email().max(120)]),
  customerAddress: z.string().trim().max(300),
  paymentStatus: z.enum(PAYMENT_STATUSES.map((status) => status.id) as [string, ...string[]]),
  deliveryMethod: z.enum(DELIVERY_METHODS.map((method) => method.id) as [string, ...string[]]),
  dueOn: z.string().max(10),
  followUpOn: z.string().max(10),
  note: z.string().trim().max(500),
  discountKind: z.enum(["percent", "fixed"]),
  discountValue: z.string(),
  shipping: z.string(),
  lines: z.array(lineSchema).min(1).max(30),
});

function moneyOrZero(value: string) {
  if (!value.trim()) return 0;
  const minor = parseMoneyToMinor(value);
  if (minor === null) throw new Error("Enter a valid amount.");
  return minor;
}

export async function saveOrder(payload: unknown) {
  const user = await requirePlanFeature("orders");
  const parsed = orderSchema.safeParse(payload);
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Check the order details.");
  const input = parsed.data;
  const dueOn = parseOptionalDate(input.dueOn);
  const followUpOn = parseOptionalDate(input.followUpOn);

  if (input.customerId) {
    const customer = await prisma.customer.findFirst({ where: { id: input.customerId, userId: user.id }, select: { id: true } });
    if (!customer) throw new Error("That customer is not in your list.");
  }

  const existing = input.id
    ? await prisma.shopOrder.findFirst({ where: { id: input.id, userId: user.id } })
    : null;
  if (input.id && !existing) throw new Error("That order is not in your board.");
  if (existing) {
    const sale = await prisma.sale.findUnique({ where: { orderId: existing.id }, select: { id: true } });
    if (sale) throw new Error("This order is already in the sales record. Reorder it if you need a new one.");
  }

  const productIds = input.lines.flatMap((line) => line.kind === "product" && line.priceSetId ? [line.priceSetId] : []);
  const bundleIds = input.lines.flatMap((line) => line.kind === "bundle" && line.sourceId ? [line.sourceId] : []);
  const digitalIds = input.lines.flatMap((line) => line.kind === "digital" && line.sourceId ? [line.sourceId] : []);
  const [priceSets, bundles, bundleItems, digitals, previousLines] = await Promise.all([
    prisma.priceSet.findMany({ where: { userId: user.id, id: { in: productIds } } }),
    prisma.bundle.findMany({ where: { userId: user.id, id: { in: bundleIds } } }),
    prisma.bundleItem.findMany({ where: { userId: user.id, bundleId: { in: bundleIds } } }),
    prisma.digitalProduct.findMany({ where: { userId: user.id, id: { in: digitalIds } } }),
    existing ? prisma.shopOrderLine.findMany({ where: { orderId: existing.id, userId: user.id } }) : Promise.resolve([]),
  ]);
  const bundlePriceSets = await prisma.priceSet.findMany({
    where: { userId: user.id, id: { in: bundleItems.map((item) => item.priceSetId) } },
  });

  const lines = input.lines.map((line) => {
    const previous = previousLines.find((item) => {
      const kind = item.kind || "product";
      if (kind !== line.kind) return false;
      if (line.kind === "product") return item.priceSetId === line.priceSetId && item.priceOption === line.priceOption;
      return item.sourceId === line.sourceId;
    });
    if (line.kind === "bundle") {
      const bundle = bundles.find((item) => item.id === line.sourceId);
      if (!bundle && !previous) throw new Error("Choose a bundle from your list.");
      const items = bundleItems.filter((item) => item.bundleId === bundle?.id).map((item) => {
        const product = bundlePriceSets.find((priceSet) => priceSet.id === item.priceSetId);
        return {
          regularPriceMinor: product?.retailPriceMinor ?? 0,
          productionCostMinor: product?.productionCostMinor ?? 0,
          quantity: Number(item.quantity),
        };
      });
      const costMinor = bundle && items.length ? calculateBundle({ items, bundlePriceMinor: bundle.priceMinor }).costMinor : previous?.productionCostMinor ?? 0;
      return {
        userId: user.id,
        kind: "bundle",
        priceSetId: "",
        sourceId: line.sourceId,
        label: previous?.label ?? bundle?.name ?? "Bundle",
        priceOption: "retail",
        quantity: line.quantity,
        unitPriceMinor: previous?.unitPriceMinor ?? bundle!.priceMinor,
        productionCostMinor: previous?.productionCostMinor ?? costMinor,
      };
    }
    if (line.kind === "digital") {
      const digital = digitals.find((item) => item.id === line.sourceId);
      if (!digital && !previous) throw new Error("Choose a digital product from your list.");
      return {
        userId: user.id,
        kind: "digital",
        priceSetId: "",
        sourceId: line.sourceId,
        label: previous?.label ?? digital?.name ?? "Digital product",
        priceOption: "retail",
        quantity: line.quantity,
        unitPriceMinor: previous?.unitPriceMinor ?? digital!.priceMinor,
        productionCostMinor: previous?.productionCostMinor ?? 0,
      };
    }
    const product = priceSets.find((item) => item.id === line.priceSetId);
    if (!product && !previous) throw new Error("Choose a product from your price list.");
    return {
      userId: user.id,
      kind: "product",
      priceSetId: line.priceSetId,
      sourceId: "",
      label: previous?.label ?? product?.name ?? "Product",
      priceOption: line.priceOption,
      quantity: line.quantity,
      unitPriceMinor: previous?.unitPriceMinor ?? (line.priceOption === "bulk" ? product!.bulkPriceMinor : product!.retailPriceMinor),
      productionCostMinor: previous?.productionCostMinor ?? product!.productionCostMinor,
    };
  });

  const subtotal = orderTotals({ lines, discountMinor: 0, shippingMinor: 0 }).subtotalMinor;
  const discountMinor = input.discountKind === "percent"
    ? discountAmount(subtotal, "percent", Number(input.discountValue || "0")).discountMinor
    : discountAmount(subtotal, "fixed", moneyOrZero(input.discountValue)).discountMinor;
  const shippingMinor = moneyOrZero(input.shipping);
  orderTotals({ lines, discountMinor, shippingMinor });

  const settings = await prisma.shopSettings.findUnique({ where: { userId: user.id }, select: { currency: true } });
  const currency = existing?.currency ?? resolveCurrency(settings?.currency);
  const data = {
    customerId: input.customerId ?? "",
    customerName: input.customerName,
    customerPhone: input.customerPhone,
    customerEmail: input.customerEmail.toLowerCase(),
    customerAddress: input.customerAddress,
    paymentStatus: input.paymentStatus,
    deliveryMethod: input.deliveryMethod,
    discountMinor,
    shippingMinor,
    dueOn,
    followUpOn,
    note: input.note,
  };

  const orderId = await prisma.$transaction(async (tx) => {
    if (existing) {
      await tx.shopOrder.update({ where: { id: existing.id }, data });
      await tx.shopOrderLine.deleteMany({ where: { orderId: existing.id, userId: user.id } });
      await tx.shopOrderLine.createMany({ data: lines.map((line) => ({ ...line, orderId: existing.id })) });
      return existing.id;
    }
    const created = await tx.shopOrder.create({ data: { userId: user.id, currency, stage: "inquiry", ...data } });
    await tx.shopOrderLine.createMany({ data: lines.map((line) => ({ ...line, orderId: created.id })) });
    await tx.shopOrderStatus.create({
      data: { orderId: created.id, userId: user.id, fromStage: "", toStage: "inquiry" },
    });
    return created.id;
  });

  revalidatePath("/orders");
  revalidatePath(`/orders/${orderId}`);
  return { id: orderId };
}

export async function moveOrderStage(orderId: string, stage: string) {
  const user = await requirePlanFeature("orders");
  if (!isOrderStage(stage)) throw new Error("Choose a stage from the board.");

  const order = await prisma.shopOrder.findFirst({ where: { id: orderId, userId: user.id } });
  if (!order) throw new Error("That order is not in your board.");
  if (order.stage === stage) return;

  const lines = await prisma.shopOrderLine.findMany({ where: { orderId: order.id, userId: user.id } });
  const totals = orderTotals({
    lines,
    discountMinor: order.discountMinor,
    shippingMinor: order.shippingMinor,
  });

  try {
    await prisma.$transaction(async (tx) => {
      await tx.shopOrder.update({ where: { id: order.id }, data: { stage } });
      await tx.shopOrderStatus.create({
        data: { orderId: order.id, userId: user.id, fromStage: order.stage, toStage: stage },
      });
      if (stage === "delivered") {
        await tx.sale.create({
          data: {
            userId: user.id,
            orderId: order.id,
            amountMinor: totals.totalMinor,
            currency: order.currency,
          },
        });
      }
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return;
    const message = error instanceof Error ? error.message : "";
    if (message.includes("Transaction already closed") || message.includes("Transaction API error") || message.includes("Saving took too long")) {
      throw new Error("Saving took too long because the database was slow. Move the order again.");
    }
    throw new Error(userFacingError(error, "Could not move that order."));
  }

  revalidatePath("/orders");
  revalidatePath(`/orders/${order.id}`);
}
