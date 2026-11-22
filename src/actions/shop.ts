"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { calculateCost, calculateMaterialCostPerPiece, calculatePrinterBaseCosts } from "@/lib/costing";
import { parseMoneyToMinor } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { requireCrafter } from "@/lib/session";
import { checklistSteps, parseChecklist } from "@/lib/checklist";
import { convertImageUploadToAvif } from "@/lib/images";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const settingsSchema = z.object({
  currency: z.enum(["PHP", "USD"]),
  theme: z.enum(["pink", "purple", "green", "blue", "red", "beige", "orange", "gray", "black"]),
  colorScheme: z.enum(["light", "dark"]),
  businessName: z.string().trim().max(100),
  businessAddress: z.string().trim().max(300),
  businessPhone: z.string().trim().max(40),
  businessEmail: z.union([z.literal(""), z.string().email()]),
  paymentAccountName: z.string().trim().max(100),
  bankDetails: z.string().trim().max(300),
  gcashNumber: z.string().trim().max(40),
});

export async function saveSettings(formData: FormData) {
  const user = await requireCrafter();
  const parsed = settingsSchema.safeParse({
    currency: formData.get("currency"),
    theme: formData.get("theme"),
    colorScheme: formData.get("colorScheme"),
    businessName: formData.get("businessName") ?? "",
    businessAddress: formData.get("businessAddress") ?? "",
    businessPhone: formData.get("businessPhone") ?? "",
    businessEmail: formData.get("businessEmail") ?? "",
    paymentAccountName: formData.get("paymentAccountName") ?? "",
    bankDetails: formData.get("bankDetails") ?? "",
    gcashNumber: formData.get("gcashNumber") ?? "",
  });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Invalid shop settings.");

  const existing = await prisma.shopSettings.findUnique({ where: { userId: user.id } });
  const checklist = parseChecklist(existing?.checklistJson ?? "{}");
  checklist.personalize = new Date().toISOString();
  await prisma.shopSettings.upsert({
    where: { userId: user.id },
    update: { ...parsed.data, checklistJson: JSON.stringify(checklist) },
    create: { userId: user.id, ...parsed.data, checklistJson: JSON.stringify(checklist) },
  });
  revalidatePath("/", "layout");
}

export async function saveColorScheme(colorScheme: "light" | "dark") {
  const user = await requireCrafter();
  const parsed = z.enum(["light", "dark"]).safeParse(colorScheme);
  if (!parsed.success) throw new Error("Choose light or dark mode.");
  await prisma.shopSettings.upsert({
    where: { userId: user.id },
    update: { colorScheme: parsed.data },
    create: { userId: user.id, colorScheme: parsed.data },
  });
  revalidatePath("/", "layout");
}

const ownPasswordSchema = z.object({
  currentPassword: z.string().min(1),
  password: z.string().min(10, "Use at least 10 characters for your new password."),
  confirmPassword: z.string(),
}).refine((value) => value.password === value.confirmPassword, {
  message: "The passwords do not match.",
  path: ["confirmPassword"],
});

export async function changeOwnPassword(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "crafter") {
    throw new Error("Sign in to your crafter account to change its password.");
  }
  const parsed = ownPasswordSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Check your password details.");
  const account = await prisma.user.findFirst({
    where: { id: session.user.id, role: "crafter" },
    select: { passwordHash: true },
  });
  if (!account || !(await bcrypt.compare(parsed.data.currentPassword, account.passwordHash))) {
    throw new Error("Your current password is incorrect.");
  }
  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  await prisma.user.update({
    where: { id: session.user.id },
    data: { passwordHash },
  });
  revalidatePath("/settings");
}

const checklistActionSchema = z.object({
  step: z.enum(checklistSteps.map((step) => step.id)),
  done: z.enum(["true", "false"]),
});

export async function toggleChecklistStep(formData: FormData) {
  const user = await requireCrafter();
  const parsed = checklistActionSchema.safeParse({
    step: formData.get("step"),
    done: formData.get("done"),
  });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Choose a valid checklist step.");
  const settings = await prisma.shopSettings.findUnique({ where: { userId: user.id } });
  const checklist = parseChecklist(settings?.checklistJson ?? "{}");
  if (parsed.data.done === "true") checklist[parsed.data.step] = new Date().toISOString();
  else delete checklist[parsed.data.step];
  await prisma.shopSettings.upsert({
    where: { userId: user.id },
    update: { checklistJson: JSON.stringify(checklist) },
    create: { userId: user.id, checklistJson: JSON.stringify(checklist) },
  });
  revalidatePath("/dashboard");
}

export async function uploadShopLogo(formData: FormData) {
  const user = await requireCrafter();
  const fileSchema = z.instanceof(File)
    .refine((file) => file.size > 0, "Choose an image file to upload.")
    .refine((file) => file.size <= 2 * 1024 * 1024, "The logo must be 2 MB or smaller.");
  const fileResult = fileSchema.safeParse(formData.get("logo"));
  if (!fileResult.success) throw new Error(fileResult.error.issues[0]?.message ?? "Check the logo file.");
  const file = fileResult.data;
  const image = await convertImageUploadToAvif(file);
  const directory = path.join(process.cwd(), "public", "uploads", user.id);
  const filename = `business-logo-${randomUUID()}.avif`;
  await mkdir(directory, { recursive: true });
  await writeFile(path.join(directory, filename), image.buffer, { flag: "wx" });
  const logoPath = `/uploads/${user.id}/${filename}`;

  await prisma.shopSettings.upsert({
    where: { userId: user.id },
    update: { logoPath },
    create: { userId: user.id, logoPath },
  });
  revalidatePath("/", "layout");
  revalidatePath("/settings");
}

const materialSchema = z.object({
  name: z.string().trim().min(1).max(100),
  category: z.string().trim().min(1).max(60),
  piecesPerPack: z.number().finite().positive(),
  pricePerPackMinor: z.number().int().nonnegative(),
  quantityOnHand: z.number().finite().nonnegative(),
  lowStockAlert: z.number().finite().nonnegative().nullable(),
  unitLabel: z.string().trim().min(1).max(30),
  finish: z.enum(["matte", "glossy", "satin", "other"]),
  finishOther: z.string().trim().max(50),
  gsm: z.string().trim().max(40),
  thickness: z.string().trim().max(40),
  sizeNote: z.string().trim().max(100),
  supplierUrl: z.union([z.literal(""), z.string().url()]),
});

export async function createMaterial(formData: FormData) {
  const user = await requireCrafter();
  const pricePerPackMinor = parseMoneyToMinor(String(formData.get("pricePerPack") ?? ""));
  if (pricePerPackMinor === null) throw new Error("Enter a valid pack price.");

  const alertText = String(formData.get("lowStockAlert") ?? "").trim();
  const parsed = materialSchema.safeParse({
    name: formData.get("name"),
    category: formData.get("category"),
    piecesPerPack: Number(formData.get("piecesPerPack")),
    pricePerPackMinor,
    quantityOnHand: Number(formData.get("quantityOnHand")),
    lowStockAlert: alertText ? Number(alertText) : null,
    unitLabel: formData.get("unitLabel"),
    finish: formData.get("finish"),
    finishOther: formData.get("finishOther") ?? "",
    gsm: formData.get("gsm") ?? "",
    thickness: formData.get("thickness") ?? "",
    sizeNote: formData.get("sizeNote") ?? "",
    supplierUrl: formData.get("supplierUrl") ?? "",
  });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Check the material details.");

  await prisma.material.create({
    data: { userId: user.id, ...parsed.data },
  });
  revalidatePath("/materials");
  revalidatePath("/dashboard");
}

const printerSchema = z.object({
  name: z.string().trim().min(1).max(100),
  inkType: z.enum(["dye", "sublimation", "pigment"]),
  colorInkPriceMinor: z.number().int().nonnegative(),
  colorPageYield: z.number().finite().positive(),
  blackInkPriceMinor: z.number().int().nonnegative(),
  blackPageYield: z.number().finite().positive(),
});

export async function createPrinter(formData: FormData) {
  const user = await requireCrafter();
  const colorInkPriceMinor = parseMoneyToMinor(String(formData.get("colorInkPrice") ?? ""));
  const blackInkPriceMinor = parseMoneyToMinor(String(formData.get("blackInkPrice") ?? ""));
  if (colorInkPriceMinor === null || blackInkPriceMinor === null) {
    throw new Error("Enter valid ink prices.");
  }
  const parsed = printerSchema.safeParse({
    name: formData.get("name"),
    inkType: formData.get("inkType"),
    colorInkPriceMinor,
    colorPageYield: Number(formData.get("colorPageYield")),
    blackInkPriceMinor,
    blackPageYield: Number(formData.get("blackPageYield")),
  });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Check the printer details.");

  await prisma.printer.create({ data: { userId: user.id, ...parsed.data } });
  revalidatePath("/print-hub");
  revalidatePath("/costing");
}

const costingPayloadSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1).max(100),
  overagePercent: z.number().finite().min(0).max(1000),
  lossPercent: z.number().finite().min(0).max(1000),
  operationalFeeMinor: z.number().int().nonnegative(),
  laborPercent: z.number().finite().min(0).max(1000),
  packagingCostMinor: z.number().int().nonnegative(),
  markupRetailPercent: z.number().finite().min(0).max(1000),
  markupBulkPercent: z.number().finite().min(0).max(1000),
  markupPromoPercent: z.number().finite().min(0).max(1000),
  markupLoyalPercent: z.number().finite().min(0).max(1000),
  materialLines: z.array(
    z.object({
      materialId: z.string().min(1),
      unitsUsed: z.number().finite().positive(),
      finishedPieces: z.number().finite().positive(),
    }),
  ),
  printLines: z.array(
    z.object({
      printerId: z.string().min(1),
      paperSize: z.enum(["A4", "A5", "A3", "LETTER", "LEGAL"]),
      quality: z.enum(["draft", "standard", "best"]),
      coverage: z.enum(["black_white", "light_color", "normal_color", "photo_heavy"]),
      sheetCount: z.number().finite().positive(),
      finishedPieces: z.number().finite().positive(),
    }),
  ),
});

export async function saveCostingTab(payload: unknown) {
  const user = await requireCrafter();
  const parsed = costingPayloadSchema.safeParse(payload);
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Check the costing inputs.");
  const input = parsed.data;

  const [materials, printers] = await Promise.all([
    prisma.material.findMany({
      where: { userId: user.id, id: { in: input.materialLines.map((line) => line.materialId) } },
    }),
    prisma.printer.findMany({
      where: { userId: user.id, id: { in: input.printLines.map((line) => line.printerId) } },
    }),
  ]);
  if (materials.length !== new Set(input.materialLines.map((line) => line.materialId)).size) {
    throw new Error("A selected material could not be found in this shop.");
  }
  if (printers.length !== new Set(input.printLines.map((line) => line.printerId)).size) {
    throw new Error("A selected printer could not be found in this shop.");
  }

  const result = calculateCost({
    materialLines: input.materialLines.map((line) => {
      const material = materials.find((item) => item.id === line.materialId);
      if (!material) throw new Error("A selected material is no longer available.");
      return {
        costPerPieceMinor: calculateMaterialCostPerPiece(
          material.pricePerPackMinor,
          Number(material.piecesPerPack),
        ),
        unitsUsed: line.unitsUsed,
        finishedPieces: line.finishedPieces,
      };
    }),
    printLines: input.printLines.map((line) => {
      const printer = printers.find((item) => item.id === line.printerId);
      if (!printer) throw new Error("A selected printer is no longer available.");
      return {
        ...line,
        printer: {
          colorCostPerSheetMinor: Math.floor(
            printer.colorInkPriceMinor / Number(printer.colorPageYield) + 0.5,
          ),
          blackCostPerSheetMinor: Math.floor(
            printer.blackInkPriceMinor / Number(printer.blackPageYield) + 0.5,
          ),
        },
      };
    }),
    overagePercent: input.overagePercent,
    lossPercent: input.lossPercent,
    operationalFeeMinor: input.operationalFeeMinor,
    laborPercent: input.laborPercent,
    packagingCostMinor: input.packagingCostMinor,
    markups: {
      retail: input.markupRetailPercent,
      bulk: input.markupBulkPercent,
      promo: input.markupPromoPercent,
      loyal: input.markupLoyalPercent,
    },
  });

  const existing =
    input.id &&
    (await prisma.costingTab.findFirst({ where: { id: input.id, userId: user.id } }));
  if (input.id && !existing) throw new Error("This costing tab does not belong to your shop.");

  const savedTab = await prisma.$transaction(async (tx) => {
    const data = {
      name: input.name,
      overagePercent: input.overagePercent,
      lossPercent: input.lossPercent,
      operationalFeeMinor: input.operationalFeeMinor,
      laborPercent: input.laborPercent,
      packagingCostMinor: input.packagingCostMinor,
      markupRetailPercent: input.markupRetailPercent,
      markupBulkPercent: input.markupBulkPercent,
      markupPromoPercent: input.markupPromoPercent,
      markupLoyalPercent: input.markupLoyalPercent,
    };
    const tab = existing
      ? await tx.costingTab.update({ where: { id: existing.id }, data })
      : await tx.costingTab.create({ data: { userId: user.id, ...data } });

    await tx.costingMaterialLine.deleteMany({ where: { costingTabId: tab.id } });
    await tx.costingPrintLine.deleteMany({ where: { costingTabId: tab.id } });
    if (input.materialLines.length) {
      await tx.costingMaterialLine.createMany({
        data: input.materialLines.map((line) => ({ ...line, costingTabId: tab.id })),
      });
    }
    if (input.printLines.length) {
      await tx.costingPrintLine.createMany({
        data: input.printLines.map((line) => ({ ...line, costingTabId: tab.id })),
      });
    }
    return tab;
  });

  revalidatePath("/costing");
  revalidatePath("/dashboard");
  return { id: savedTab.id, name: savedTab.name, result };
}

const priceSetSchema = z.object({
  costingTabId: z.string().min(1),
  name: z.string().trim().min(1).max(100),
  category: z.string().trim().min(1).max(60),
  retailPriceMinor: z.number().int().nonnegative(),
  bulkPriceMinor: z.number().int().nonnegative(),
});

export async function savePriceSet(payload: unknown) {
  const user = await requireCrafter();
  const parsed = priceSetSchema.safeParse(payload);
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Check the price details.");
  const tab = await prisma.costingTab.findFirst({
    where: { id: parsed.data.costingTabId, userId: user.id },
    include: {
      materialLines: { include: { material: true } },
      printLines: { include: { printer: true } },
    },
  });
  if (!tab) throw new Error("This costing tab does not belong to your shop.");

  const result = calculateCost({
    materialLines: tab.materialLines.map((line) => ({
      costPerPieceMinor: calculateMaterialCostPerPiece(
        line.material.pricePerPackMinor,
        Number(line.material.piecesPerPack),
      ),
      unitsUsed: Number(line.unitsUsed),
      finishedPieces: Number(line.finishedPieces),
    })),
    printLines: tab.printLines.map((line) => ({
      paperSize: line.paperSize as "A4" | "A5" | "A3" | "LETTER" | "LEGAL",
      quality: line.quality as "draft" | "standard" | "best",
      coverage: line.coverage as "black_white" | "light_color" | "normal_color" | "photo_heavy",
      sheetCount: Number(line.sheetCount),
      finishedPieces: Number(line.finishedPieces),
      printer: calculatePrinterBaseCosts({
        colorInkPriceMinor: line.printer.colorInkPriceMinor,
        colorPageYield: Number(line.printer.colorPageYield),
        blackInkPriceMinor: line.printer.blackInkPriceMinor,
        blackPageYield: Number(line.printer.blackPageYield),
      }),
    })),
    overagePercent: Number(tab.overagePercent),
    lossPercent: Number(tab.lossPercent),
    operationalFeeMinor: tab.operationalFeeMinor,
    laborPercent: Number(tab.laborPercent),
    packagingCostMinor: tab.packagingCostMinor,
    markups: {
      retail: Number(tab.markupRetailPercent),
      bulk: Number(tab.markupBulkPercent),
      promo: Number(tab.markupPromoPercent),
      loyal: Number(tab.markupLoyalPercent),
    },
  });

  await prisma.priceSet.create({
    data: {
      userId: user.id,
      ...parsed.data,
      productionCostMinor: result.productionCostMinor,
    },
  });
  revalidatePath("/prices");
  revalidatePath("/dashboard");
  return { success: true, productionCostMinor: result.productionCostMinor };
}
