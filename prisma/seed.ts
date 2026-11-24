import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import fs from "fs";
import path from "path";
import { calculateCost, calculateMaterialCostPerPiece, calculatePrinterBaseCosts } from "../src/lib/costing";
import { discountAmount } from "../src/lib/orders";
import { getProductCostBreakdown } from "../src/lib/product-breakdown";
import { assertProjectDatabase } from "../src/lib/project-database";

function loadLocalEnv() {
  const file = path.join(process.cwd(), ".env");
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separator = trimmed.indexOf("=");
    if (separator <= 0) continue;
    const key = trimmed.slice(0, separator).trim();
    if (process.env[key]) continue;
    let value = trimmed.slice(separator + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

loadLocalEnv();
assertProjectDatabase();

const prisma = new PrismaClient();

async function named<T extends { id: string }>(
  find: () => Promise<T | null>,
  create: () => Promise<T>,
) {
  return (await find()) ?? create();
}

async function seedExamples(userId: string) {
  const blank = (value: string | null | undefined) => value?.trim() ? value : undefined;
  const settings = await prisma.shopSettings.findUnique({ where: { userId } });
  await prisma.shopSettings.update({
    where: { userId },
    data: {
      businessName: blank(settings?.businessName) ?? "Mia's Paper Studio",
      businessAddress: blank(settings?.businessAddress) ?? "12 Sampaguita St, Quezon City",
      businessPhone: blank(settings?.businessPhone) ?? "0917 555 0142",
      businessEmail: blank(settings?.businessEmail) ?? "hello@creativecostwise.local",
      paymentAccountName: blank(settings?.paymentAccountName) ?? "Mia Santos",
    },
  });

  for (const name of ["Paper", "Packaging"]) {
    await prisma.materialCategory.upsert({
      where: { userId_name: { userId, name } },
      update: {},
      create: { userId, name, starred: true },
    });
  }

  const stickerPaper = await named(
    () => prisma.material.findFirst({ where: { userId, name: "Sticker paper" } }),
    () => prisma.material.create({
      data: {
        userId,
        category: "Paper",
        name: "Sticker paper",
        piecesPerPack: 20,
        pricePerPackMinor: 25000,
        gsm: "80",
        sizeNote: "A4",
        finish: "matte",
        unitLabel: "sheet",
        quantityOnHand: 40,
        lowStockAlert: 10,
      },
    }),
  );
  const laminate = await named(
    () => prisma.material.findFirst({ where: { userId, name: "Matte laminate" } }),
    () => prisma.material.create({
      data: {
        userId,
        category: "Paper",
        name: "Matte laminate",
        piecesPerPack: 10,
        pricePerPackMinor: 18000,
        sizeNote: "A4",
        finish: "matte",
        unitLabel: "sheet",
        quantityOnHand: 8,
        lowStockAlert: 4,
      },
    }),
  );
  await named(
    () => prisma.material.findFirst({ where: { userId, name: "Kraft envelope" } }),
    () => prisma.material.create({
      data: {
        userId,
        category: "Packaging",
        name: "Kraft envelope",
        piecesPerPack: 50,
        pricePerPackMinor: 15000,
        unitLabel: "piece",
        quantityOnHand: 30,
        lowStockAlert: 10,
      },
    }),
  );

  const printer = await named(
    () => prisma.printer.findFirst({ where: { userId, name: "Epson L3250" } }),
    () => prisma.printer.create({
      data: {
        userId,
        name: "Epson L3250",
        inkType: "dye",
        colorInkPriceMinor: 45000,
        colorPageYield: 4500,
        blackInkPriceMinor: 35000,
        blackPageYield: 6000,
      },
    }),
  );
  await named(
    () => prisma.printerSupply.findFirst({ where: { userId, name: "Color ink bottle" } }),
    () => prisma.printerSupply.create({
      data: { userId, name: "Color ink bottle", lastPriceMinor: 45000 },
    }),
  );

  const stickerCost = calculateCost({
    materialLines: [{
      costPerPieceMinor: calculateMaterialCostPerPiece(stickerPaper.pricePerPackMinor, Number(stickerPaper.piecesPerPack)),
      unitsUsed: 1,
      finishedPieces: 8,
    }],
    printLines: [{
      printer: calculatePrinterBaseCosts({
        colorInkPriceMinor: printer.colorInkPriceMinor,
        colorPageYield: Number(printer.colorPageYield),
        blackInkPriceMinor: printer.blackInkPriceMinor,
        blackPageYield: Number(printer.blackPageYield),
      }),
      paperSize: "A4",
      quality: "standard",
      coverage: "normal_color",
      sheetCount: 1,
      finishedPieces: 8,
    }],
    overagePercent: 0,
    lossPercent: 3,
    operationalFeeMinor: 1000,
    laborPercent: 100,
    packagingCostMinor: 0,
    markups: { retail: 100, bulk: 50, promo: 30, loyal: 40 },
  });
  const cardCost = calculateCost({
    materialLines: [{
      costPerPieceMinor: calculateMaterialCostPerPiece(laminate.pricePerPackMinor, Number(laminate.piecesPerPack)),
      unitsUsed: 1,
      finishedPieces: 4,
    }],
    printLines: [{
      printer: calculatePrinterBaseCosts({
        colorInkPriceMinor: printer.colorInkPriceMinor,
        colorPageYield: Number(printer.colorPageYield),
        blackInkPriceMinor: printer.blackInkPriceMinor,
        blackPageYield: Number(printer.blackPageYield),
      }),
      paperSize: "A5",
      quality: "standard",
      coverage: "light_color",
      sheetCount: 1,
      finishedPieces: 4,
    }],
    overagePercent: 0,
    lossPercent: 3,
    operationalFeeMinor: 1000,
    laborPercent: 100,
    packagingCostMinor: 500,
    markups: { retail: 100, bulk: 50, promo: 30, loyal: 40 },
  });

  const stickerTab = await named(
    () => prisma.costingTab.findFirst({ where: { userId, name: "Birthday sticker sheet" } }),
    () => prisma.costingTab.create({
      data: {
        userId,
        name: "Birthday sticker sheet",
        lossPercent: 3,
        operationalFeeMinor: 1000,
        laborPercent: 100,
        markupRetailPercent: 100,
        markupBulkPercent: 50,
        markupPromoPercent: 30,
        markupLoyalPercent: 40,
        materialLines: { create: { materialId: stickerPaper.id, unitsUsed: 1, finishedPieces: 8 } },
        printLines: { create: { printerId: printer.id, paperSize: "A4", quality: "standard", coverage: "normal_color", sheetCount: 1, finishedPieces: 8 } },
      },
    }),
  );
  const cardTab = await named(
    () => prisma.costingTab.findFirst({ where: { userId, name: "Thank-you card" } }),
    () => prisma.costingTab.create({
      data: {
        userId,
        name: "Thank-you card",
        lossPercent: 3,
        operationalFeeMinor: 1000,
        laborPercent: 100,
        packagingCostMinor: 500,
        markupRetailPercent: 100,
        markupBulkPercent: 50,
        markupPromoPercent: 30,
        markupLoyalPercent: 40,
        materialLines: { create: { materialId: laminate.id, unitsUsed: 1, finishedPieces: 4 } },
        printLines: { create: { printerId: printer.id, paperSize: "A5", quality: "standard", coverage: "light_color", sheetCount: 1, finishedPieces: 4 } },
      },
    }),
  );

  const stickerPrice = await named(
    () => prisma.priceSet.findFirst({ where: { userId, name: "Birthday sticker sheet" } }),
    () => prisma.priceSet.create({
      data: {
        userId,
        costingTabId: stickerTab.id,
        name: "Birthday sticker sheet",
        category: "Stickers",
        retailPriceMinor: stickerCost.prices.retail,
        bulkPriceMinor: stickerCost.prices.bulk,
        productionCostMinor: stickerCost.productionCostMinor,
      },
    }),
  );
  const cardPrice = await named(
    () => prisma.priceSet.findFirst({ where: { userId, name: "Thank-you card" } }),
    () => prisma.priceSet.create({
      data: {
        userId,
        costingTabId: cardTab.id,
        name: "Thank-you card",
        category: "Cards",
        retailPriceMinor: cardCost.prices.retail,
        bulkPriceMinor: cardCost.prices.bulk,
        productionCostMinor: cardCost.productionCostMinor,
      },
    }),
  );

  const ana = await named(
    () => prisma.customer.findFirst({ where: { userId, name: "Ana Reyes" } }),
    () => prisma.customer.create({
      data: {
        userId,
        name: "Ana Reyes",
        phone: "0918 555 0101",
        email: "ana.reyes.example@example.com",
        address: "Quezon City",
        notes: "Prefers Saturday pickup.",
      },
    }),
  );

  const delivered = await named(
    () => prisma.shopOrder.findFirst({ where: { userId, customerName: "Ana Reyes", stage: "delivered" } }),
    () => prisma.shopOrder.create({
      data: {
        userId,
        customerId: ana.id,
        customerName: ana.name,
        customerPhone: ana.phone,
        customerEmail: ana.email,
        customerAddress: ana.address,
        stage: "delivered",
        paymentStatus: "paid",
        deliveryMethod: "pickup",
        note: "Sample order: 2 birthday sticker sheets.",
        dueOn: new Date(),
      },
    }),
  );
  await named(
    () => prisma.shopOrderLine.findFirst({ where: { orderId: delivered.id, label: "Birthday sticker sheet" } }),
    () => prisma.shopOrderLine.create({
      data: {
        orderId: delivered.id,
        userId,
        kind: "product",
        priceSetId: stickerPrice.id,
        sourceId: stickerPrice.id,
        label: "Birthday sticker sheet",
        priceOption: "retail",
        quantity: 2,
        unitPriceMinor: stickerPrice.retailPriceMinor,
        productionCostMinor: stickerPrice.productionCostMinor,
      },
    }),
  );
  const deliveredTotal = stickerPrice.retailPriceMinor * 2;
  await named(
    () => prisma.sale.findFirst({ where: { orderId: delivered.id } }),
    () => prisma.sale.create({
      data: { userId, orderId: delivered.id, amountMinor: deliveredTotal, currency: "PHP", recognizedOn: new Date() },
    }),
  );

  await named(
    () => prisma.shopOrder.findFirst({ where: { userId, customerName: "Luis Garcia" } }),
    () => prisma.shopOrder.create({
      data: {
        userId,
        customerName: "Luis Garcia",
        customerPhone: "0919 555 0102",
        stage: "inquiry",
        paymentStatus: "unpaid",
        deliveryMethod: "courier",
        note: "Sample inquiry: asked about thank-you cards for a shop opening.",
        dueOn: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      },
    }),
  );
  const luis = await prisma.shopOrder.findFirst({ where: { userId, customerName: "Luis Garcia" } });
  if (luis) {
    await named(
      () => prisma.shopOrderLine.findFirst({ where: { orderId: luis.id } }),
      () => prisma.shopOrderLine.create({
        data: {
          orderId: luis.id,
          userId,
          kind: "product",
          priceSetId: cardPrice.id,
          sourceId: cardPrice.id,
          label: "Thank-you card",
          priceOption: "retail",
          quantity: 4,
          unitPriceMinor: cardPrice.retailPriceMinor,
          productionCostMinor: cardPrice.productionCostMinor,
        },
      }),
    );
  }

  await named(
    () => prisma.bundle.findFirst({ where: { userId, name: "Birthday desk set" } }),
    async () => {
      const bundle = await prisma.bundle.create({
        data: { userId, name: "Birthday desk set", priceMinor: stickerPrice.retailPriceMinor + cardPrice.retailPriceMinor - 2000 },
      });
      await prisma.bundleItem.createMany({
        data: [
          { bundleId: bundle.id, userId, priceSetId: stickerPrice.id, quantity: 1 },
          { bundleId: bundle.id, userId, priceSetId: cardPrice.id, quantity: 1 },
        ],
      });
      return bundle;
    },
  );

  const promo = discountAmount(stickerPrice.retailPriceMinor, "percent", 10);
  await named(
    () => prisma.promotion.findFirst({ where: { userId, code: "BDAY10" } }),
    () => prisma.promotion.create({
      data: {
        userId,
        code: "BDAY10",
        originalMinor: stickerPrice.retailPriceMinor,
        kind: "percent",
        discountMinor: promo.discountMinor,
        saleMinor: promo.saleMinor,
        note: "Sample: 10% off one birthday sticker sheet.",
      },
    }),
  );

  await named(
    () => prisma.digitalProduct.findFirst({ where: { userId, name: "Printable birthday sticker sheet" } }),
    () => prisma.digitalProduct.create({
      data: {
        userId,
        name: "Printable birthday sticker sheet",
        priceMinor: 15000,
        url: "https://example.com/birthday-sticker-sheet",
      },
    }),
  );

  const expenseKey = `sample:${userId}:sticker-restock`;
  await named(
    () => prisma.expense.findUnique({ where: { sourceKey: expenseKey } }),
    async () => {
      const expense = await prisma.expense.create({
        data: {
          userId,
          amountMinor: 25000,
          category: "packaging_supplies",
          paymentMethod: "cash",
          description: "Restock Sticker paper",
          note: "Sample expense: one pack of sticker paper.",
          sourceKey: expenseKey,
        },
      });
      await prisma.inventoryMovement.create({
        data: {
          userId,
          materialId: stickerPaper.id,
          kind: "restock",
          quantityBefore: 20,
          quantityAfter: 40,
          expenseId: expense.id,
          note: "Sample: set sticker paper on hand to 40 sheets.",
        },
      });
      return expense;
    },
  );

  await named(
    () => prisma.businessDocument.findFirst({ where: { userId, number: "INV-SAMPLE-0001" } }),
    async () => {
      const document = await prisma.businessDocument.create({
        data: {
          userId,
          orderId: delivered.id,
          kind: "invoice",
          number: "INV-SAMPLE-0001",
          customerName: ana.name,
          customerPhone: ana.phone,
          customerEmail: ana.email,
          customerAddress: ana.address,
          businessName: "Mia's Paper Studio",
          currency: "PHP",
          paymentStatus: "paid",
          deliveryMethod: "pickup",
          note: "Sample invoice. Saving a document does not create another sale.",
        },
      });
      await prisma.businessDocumentLine.create({
        data: {
          documentId: document.id,
          userId,
          label: "Birthday sticker sheet",
          quantity: 2,
          unitPriceMinor: stickerPrice.retailPriceMinor,
        },
      });
      return document;
    },
  );

  const loaded = await prisma.costingTab.findUnique({
    where: { id: stickerTab.id },
    include: {
      materialLines: { include: { material: true } },
      printLines: { include: { printer: true } },
    },
  });
  const breakdown = loaded
    ? JSON.stringify(getProductCostBreakdown({ ...stickerPrice, costingTab: loaded }))
    : "";
  if (breakdown) await named(
    () => prisma.purchaseOrder.findFirst({ where: { userId, note: "Sample request: 2 birthday sticker sheets for the studio display." } }),
    () => prisma.purchaseOrder.create({
      data: {
        userId,
        status: "pending",
        currency: "PHP",
        note: "Sample request: 2 birthday sticker sheets for the studio display.",
        lines: {
          create: {
            priceSetId: stickerPrice.id,
            productName: stickerPrice.name,
            category: stickerPrice.category,
            pricingOption: "retail",
            quantity: 2,
            unitPriceMinor: stickerPrice.retailPriceMinor,
            unitProductionCostMinor: stickerPrice.productionCostMinor,
            lineTotalMinor: stickerPrice.retailPriceMinor * 2,
            lineProductionCostMinor: stickerPrice.productionCostMinor * 2,
            breakdownJson: breakdown,
          },
        },
      },
    }),
  );

  await named(
    () => prisma.templateEntry.findFirst({ where: { name: "Sample sticker sheet" } }),
    () => prisma.templateEntry.create({
      data: {
        name: "Sample sticker sheet",
        category: "Stickers",
        url: "https://example.com/birthday-sticker-sheet",
      },
    }),
  );
  await named(
    () => prisma.templateWish.findFirst({ where: { userId, title: "Wedding menu card" } }),
    () => prisma.templateWish.create({
      data: {
        userId,
        title: "Wedding menu card",
        details: "Sample request: an A5 card with a place for the couple's names and the menu.",
      },
    }),
  );
}

function sampleBreakdown(productName: string, retailPriceMinor: number, productionCostMinor: number) {
  const bulkPriceMinor = Math.round(retailPriceMinor * 0.75);
  return JSON.stringify({
    materials: [{
      name: "Sticker paper",
      unitLabel: "sheet",
      unitsUsed: 1,
      finishedPieces: 8,
      quantityOnHand: 40,
      costPerUnitMinor: 1250,
      batchCostMinor: 1250,
      perPieceMinor: 156,
    }],
    printing: [{
      printerName: "Epson L3250",
      paperSize: "A4",
      quality: "standard",
      coverage: "normal_color",
      sheetCount: 1,
      finishedPieces: 8,
      baseInkCostPerSheetMinor: 10,
      perPieceMinor: 1,
    }],
    materialPerPieceMinor: 156,
    printingPerPieceMinor: 1,
    directMinor: 157,
    overagePercent: 0,
    overageMinor: 0,
    lossPercent: 3,
    lossMinor: 5,
    operationalFeeMinor: 1000,
    adjustedMinor: 1162,
    laborPercent: 100,
    laborMinor: 1162,
    packagingCostMinor: 0,
    productionCostMinor,
    retailPriceMinor,
    bulkPriceMinor,
    suggestedPrices: {
      retail: retailPriceMinor,
      bulk: bulkPriceMinor,
      promo: Math.round(retailPriceMinor * 0.65),
      loyal: Math.round(retailPriceMinor * 0.7),
    },
    profitAtRetailMinor: retailPriceMinor - productionCostMinor,
    profitAtBulkMinor: bulkPriceMinor - productionCostMinor,
  });
}

async function seedVolume(userId: string) {
  const sticker = await prisma.priceSet.findFirst({ where: { userId, name: "Birthday sticker sheet" } });
  const card = await prisma.priceSet.findFirst({ where: { userId, name: "Thank-you card" } });
  if (!sticker || !card) return;
  const day = (offset: number) => new Date(Date.now() + offset * 24 * 60 * 60 * 1000);

  const materials = [
    { name: "Cardstock", category: "Paper", piecesPerPack: 100, pricePerPackMinor: 32000, unitLabel: "piece", quantityOnHand: 80, lowStockAlert: 20, gsm: "220", sizeNote: "A5" },
    { name: "Vellum overlay", category: "Paper", piecesPerPack: 25, pricePerPackMinor: 20000, unitLabel: "sheet", quantityOnHand: 15, lowStockAlert: 5, gsm: "90", sizeNote: "A4" },
    { name: "Satin ribbon", category: "Trim", piecesPerPack: 10, pricePerPackMinor: 9000, unitLabel: "meter", quantityOnHand: 6, lowStockAlert: 2, gsm: "", sizeNote: "1 cm wide" },
    { name: "Cotton twine", category: "Trim", piecesPerPack: 50, pricePerPackMinor: 7500, unitLabel: "meter", quantityOnHand: 40, lowStockAlert: 10, gsm: "", sizeNote: "Natural" },
    { name: "Wax seal beads", category: "Embellishment", piecesPerPack: 100, pricePerPackMinor: 15000, unitLabel: "piece", quantityOnHand: 70, lowStockAlert: 20, gsm: "", sizeNote: "Dusty rose" },
    { name: "Clear gift bag", category: "Packaging", piecesPerPack: 30, pricePerPackMinor: 12000, unitLabel: "piece", quantityOnHand: 12, lowStockAlert: 8, gsm: "", sizeNote: "Small" },
    { name: "Tissue paper", category: "Packaging", piecesPerPack: 40, pricePerPackMinor: 8000, unitLabel: "sheet", quantityOnHand: 25, lowStockAlert: 10, gsm: "", sizeNote: "White" },
  ];
  for (const material of materials) {
    await named(
      () => prisma.material.findFirst({ where: { userId, name: material.name } }),
      () => prisma.material.create({ data: { userId, finish: "matte", ...material } }),
    );
  }

  const people = [
    ["Luis Garcia", "0919 555 0102", "Courier for a shop opening."],
    ["Sofia Cruz", "0920 555 0103", "Wants a Saturday pickup."],
    ["Marco Dela Cruz", "0921 555 0104", "Orders for a cafe counter."],
    ["Bea Navarro", "0922 555 0105", "Prefers soft colors."],
    ["Paolo Santos", "0923 555 0106", "Bulk order for a school fair."],
    ["Nina Flores", "0924 555 0107", "Needs a handwritten note."],
    ["Carlo Mendoza", "0925 555 0108", "Pays the deposit by GCash."],
    ["Irene Bautista", "0926 555 0109", "Meetup at the weekend market."],
    ["Hugo Ramos", "0927 555 0110", "Repeat customer for thank-you cards."],
  ] as const;
  for (const [name, phone, notes] of people) {
    await named(
      () => prisma.customer.findFirst({ where: { userId, name } }),
      () => prisma.customer.create({
        data: { userId, name, phone, email: `${name.split(" ")[0].toLowerCase()}.sample@example.com`, address: "Metro Manila", notes },
      }),
    );
  }

  const stages = ["quoted", "in_production", "ready", "delivered", "done", "inquiry", "quoted", "in_production"] as const;
  for (let index = 0; index < stages.length; index += 1) {
    const stage = stages[index];
    const customer = people[index];
    const product = index % 2 === 0 ? sticker : card;
    const quantity = index + 1;
    const note = `Sample order ${index + 1}: ${quantity} ${product.name} for ${customer[0]}.`;
    const order = await named(
      () => prisma.shopOrder.findFirst({ where: { userId, note } }),
      () => prisma.shopOrder.create({
        data: {
          userId,
          customerName: customer[0],
          customerPhone: customer[1],
          stage,
          paymentStatus: stage === "delivered" || stage === "done" ? "paid" : stage === "in_production" || stage === "ready" ? "deposit" : "unpaid",
          deliveryMethod: index % 3 === 0 ? "pickup" : index % 3 === 1 ? "courier" : "meetup",
          note,
          dueOn: day(index - 2),
        },
      }),
    );
    await named(
      () => prisma.shopOrderLine.findFirst({ where: { orderId: order.id, label: product.name } }),
      () => prisma.shopOrderLine.create({
        data: {
          orderId: order.id,
          userId,
          kind: "product",
          priceSetId: product.id,
          sourceId: product.id,
          label: product.name,
          priceOption: "retail",
          quantity,
          unitPriceMinor: product.retailPriceMinor,
          productionCostMinor: product.productionCostMinor,
        },
      }),
    );
    if (stage === "delivered" || stage === "done") {
      await named(
        () => prisma.sale.findFirst({ where: { orderId: order.id } }),
        () => prisma.sale.create({
          data: {
            userId,
            orderId: order.id,
            amountMinor: product.retailPriceMinor * quantity,
            currency: "PHP",
            recognizedOn: day(-index),
          },
        }),
      );
    }
  }

  const expenses = [
    ["Color ink refill", 45000, 0],
    ["Satin ribbon restock", 9000, -1],
    ["Envelope restock", 15000, -2],
    ["Weekend market booth", 50000, -3],
    ["Courier for a finished order", 8500, -4],
    ["Double-sided tape", 6500, -6],
    ["Sticker backing sheets", 12000, -8],
    ["Tissue paper restock", 8000, -10],
    ["Cardstock restock", 32000, -12],
  ] as const;
  for (const [description, amountMinor, offset] of expenses) {
    const sourceKey = `sample:${userId}:expense:${description}`;
    await named(
      () => prisma.expense.findUnique({ where: { sourceKey } }),
      () => prisma.expense.create({
        data: {
          userId,
          amountMinor,
          category: "packaging_supplies",
          paymentMethod: "cash",
          description,
          note: "Sample expense.",
          sourceKey,
          occurredOn: day(offset),
        },
      }),
    );
  }

  const downloads = [
    ["Printable place card", 8000],
    ["Monthly budget sheet", 12000],
    ["Order tracker sheet", 15000],
    ["Sticker cutting guide", 5000],
    ["Thank-you card printable", 9000],
    ["Price list template", 7000],
    ["Packing slip", 4000],
    ["Market booth checklist", 3000],
    ["Wedding menu printable", 18000],
  ] as const;
  for (const [name, priceMinor] of downloads) {
    await named(
      () => prisma.digitalProduct.findFirst({ where: { userId, name } }),
      () => prisma.digitalProduct.create({
        data: { userId, name, priceMinor, url: `https://example.com/${name.toLowerCase().replaceAll(" ", "-")}` },
      }),
    );
  }

  const promos = [
    ["HELLO15", 15, "Sample: 15% off a first order."],
    ["CARD20", 20, "Sample: 20% off thank-you cards."],
    ["FAIR10", 10, "Sample: market-day discount."],
    ["PICKUP5", 5, "Sample: pickup discount."],
    ["BULK25", 25, "Sample: bulk thank-you cards."],
    ["REPEAT10", 10, "Sample: returning customer."],
    ["WEEKEND15", 15, "Sample: weekend market."],
    ["STUDENT10", 10, "Sample: student order."],
    ["LAUNCH20", 20, "Sample: new product launch."],
  ] as const;
  for (const [code, percent, note] of promos) {
    const priced = discountAmount(card.retailPriceMinor, "percent", percent);
    await named(
      () => prisma.promotion.findFirst({ where: { userId, code } }),
      () => prisma.promotion.create({
        data: {
          userId,
          code,
          originalMinor: card.retailPriceMinor,
          kind: "percent",
          discountMinor: priced.discountMinor,
          saleMinor: priced.saleMinor,
          note,
        },
      }),
    );
  }

  const templates = [
    ["Sample place card", "Cards"],
    ["Sample menu card", "Cards"],
    ["Sample packing slip", "Shop"],
    ["Sample price list", "Shop"],
    ["Sample booth checklist", "Shop"],
    ["Sample thank-you card", "Cards"],
    ["Sample gift tag", "Tags"],
    ["Sample label sheet", "Stickers"],
    ["Sample order tracker", "Shop"],
  ] as const;
  for (const [name, category] of templates) {
    await named(
      () => prisma.templateEntry.findFirst({ where: { name } }),
      () => prisma.templateEntry.create({
        data: { name, category, url: `https://example.com/${name.toLowerCase().replaceAll(" ", "-")}` },
      }),
    );
  }

  const wishes = [
    ["Birthday bunting", "A short garland template for a dessert table."],
    ["Classroom sticker chart", "Small stars a teacher can print on sticker paper."],
    ["Cafe loyalty card", "Ten stamps on one card."],
    ["Recipe card", "A 4x6 card with a photo space."],
    ["Bookmark set", "Three bookmarks on one A4 sheet."],
    ["Gift tag sheet", "Twelve small tags with a hole mark."],
    ["Table number card", "Numbers 1 to 12, folded."],
    ["Small business invoice", "A printable invoice that matches the shop colors."],
    ["Habit tracker", "A one-page monthly tracker."],
  ] as const;
  for (const [title, details] of wishes) {
    await named(
      () => prisma.templateWish.findFirst({ where: { userId, title } }),
      () => prisma.templateWish.create({ data: { userId, title, details: `Sample request: ${details}` } }),
    );
  }
}

async function seedAdmin(passwordHash: string, miaId: string) {
  const day = (offset: number) => new Date(Date.now() + offset * 24 * 60 * 60 * 1000);
  const accounts = [
    ["Liza Cruz", "liza.cruz.sample@example.com", "monthly", 20, false],
    ["Jonah Reyes", "jonah.reyes.sample@example.com", "quarterly", 70, false],
    ["Amina Torres", "amina.torres.sample@example.com", "annual", 300, false],
    ["Paolo Villanueva", "paolo.villanueva.sample@example.com", "monthly", -12, false],
    ["Rina Gomez", "rina.gomez.sample@example.com", "quarterly", 40, true],
    ["Eli Navarro", "eli.navarro.sample@example.com", "annual", 200, false],
    ["Camille Ong", "camille.ong.sample@example.com", "monthly", 15, false],
    ["Diego Flores", "diego.flores.sample@example.com", "quarterly", 90, false],
    ["Hanna Lim", "hanna.lim.sample@example.com", "annual", 180, false],
  ] as const;
  const crafters = [];
  for (const [name, email, plan, expiresIn, disabled] of accounts) {
    const user = await prisma.user.upsert({
      where: { email },
      update: { name, role: "crafter", plan, expiresAt: day(expiresIn), disabledAt: disabled ? new Date() : null },
      create: {
        name,
        email,
        passwordHash,
        role: "crafter",
        plan,
        expiresAt: day(expiresIn),
        disabledAt: disabled ? new Date() : null,
        welcomedAt: new Date(),
      },
    });
    crafters.push(user);
    await prisma.shopSettings.upsert({
      where: { userId: user.id },
      update: {},
      create: { userId: user.id, businessName: `${name.split(" ")[0]}'s Studio` },
    });
  }

  const products = [
    ["Birthday sticker sheet", "Stickers", 2, 4648, 2324],
    ["Thank-you card", "Cards", 4, 5500, 2800],
    ["Place card", "Cards", 12, 1500, 700],
    ["Gift tag sheet", "Tags", 3, 3200, 1600],
    ["Bookmark set", "Prints", 5, 2400, 1100],
    ["Menu card", "Cards", 8, 4000, 1900],
    ["Label sheet", "Stickers", 6, 3600, 1700],
    ["Table number", "Cards", 10, 1800, 800],
    ["Packing slip pad", "Shop", 2, 2500, 1200],
    ["Loyalty card", "Cards", 20, 1200, 500],
  ] as const;
  const statuses = ["approved", "approved", "approved", "approved", "approved", "approved", "approved", "approved", "approved", "approved"] as const;
  for (let index = 0; index < products.length; index += 1) {
    const [productName, category, quantity, unitPriceMinor, unitProductionCostMinor] = products[index];
    const note = `Sample admin request ${index + 1}: ${quantity} ${productName}.`;
    const owner = index === 0 ? { id: miaId } : crafters[index % crafters.length];
    const status = statuses[index];
    const order = await named(
      () => prisma.purchaseOrder.findFirst({ where: { note } }),
      () => prisma.purchaseOrder.create({
        data: {
          userId: owner.id,
          status,
          currency: "PHP",
          note,
          response: status === "pending" ? "" : `Sample reply: this ${productName} request is ${status.replaceAll("_", " ")}.`,
          respondedAt: status === "pending" ? null : day(-index),
          lines: {
            create: {
              productName,
              category,
              pricingOption: "retail",
              quantity,
              unitPriceMinor,
              unitProductionCostMinor,
              lineTotalMinor: unitPriceMinor * quantity,
              lineProductionCostMinor: unitProductionCostMinor * quantity,
              breakdownJson: sampleBreakdown(productName, unitPriceMinor, unitProductionCostMinor),
            },
          },
        },
      }),
    );
    if (status === "approved") {
      const line = await prisma.purchaseOrderLine.findFirst({ where: { purchaseOrderId: order.id } });
      const ownerUser = await prisma.user.findUnique({ where: { id: owner.id }, select: { name: true, email: true } });
      if (line && ownerUser) {
        await named(
          () => prisma.adminInventoryItem.findUnique({ where: { purchaseOrderLineId: line.id } }),
          () => prisma.adminInventoryItem.create({
            data: {
              purchaseOrderLineId: line.id,
              crafterName: ownerUser.name,
              crafterEmail: ownerUser.email,
              productName,
              category,
              currency: "PHP",
              quantityReceived: quantity,
              quantityOnHand: Math.max(1, quantity - (index % 3)),
              unitPriceMinor,
              unitProductionCostMinor,
              breakdownJson: line.breakdownJson,
            },
          }),
        );
      }
    }
  }
  for (let index = 0; index < 4; index += 1) {
    const note = `Sample admin request pending ${index + 1}: waiting for review.`;
    const owner = crafters[index];
    await named(
      () => prisma.purchaseOrder.findFirst({ where: { note } }),
      () => prisma.purchaseOrder.create({
        data: {
          userId: owner.id,
          status: "pending",
          currency: "PHP",
          note,
          lines: {
            create: {
              productName: "Birthday sticker sheet",
              category: "Stickers",
              pricingOption: "retail",
              quantity: index + 1,
              unitPriceMinor: 4648,
              unitProductionCostMinor: 2324,
              lineTotalMinor: 4648 * (index + 1),
              lineProductionCostMinor: 2324 * (index + 1),
              breakdownJson: sampleBreakdown("Birthday sticker sheet", 4648, 2324),
            },
          },
        },
      }),
    );
  }
  for (const [status, note] of [
    ["changes_requested", "Sample admin request: please confirm the sticker quantity."],
    ["declined", "Sample admin request: this one was declined."],
  ] as const) {
    await named(
      () => prisma.purchaseOrder.findFirst({ where: { note } }),
      () => prisma.purchaseOrder.create({
        data: {
          userId: miaId,
          status,
          currency: "PHP",
          note,
          response: `Sample reply: ${status.replaceAll("_", " ")}.`,
          respondedAt: new Date(),
          lines: {
            create: {
              productName: "Thank-you card",
              category: "Cards",
              pricingOption: "retail",
              quantity: 2,
              unitPriceMinor: 5500,
              unitProductionCostMinor: 2800,
              lineTotalMinor: 11000,
              lineProductionCostMinor: 5600,
              breakdownJson: sampleBreakdown("Thank-you card", 5500, 2800),
            },
          },
        },
      }),
    );
  }

  const payments = [
    ["liza.cruz.sample@example.com", "monthly", 29900, "gcash", "pending"],
    ["jonah.reyes.sample@example.com", "quarterly", 79900, "maya", "pending"],
    ["amina.torres.sample@example.com", "annual", 279900, "bank", "pending"],
    ["eli.navarro.sample@example.com", "annual", 279900, "gcash", "approved"],
    ["camille.ong.sample@example.com", "monthly", 29900, "maya", "approved"],
    ["diego.flores.sample@example.com", "quarterly", 79900, "bank", "rejected"],
    ["hanna.lim.sample@example.com", "annual", 279900, "gcash", "pending"],
    ["paolo.villanueva.sample@example.com", "monthly", 29900, "gcash", "rejected"],
    ["amina.torres.sample@example.com", "monthly", 29900, "maya", "approved"],
    ["jonah.reyes.sample@example.com", "annual", 279900, "bank", "pending"],
  ] as const;
  for (let index = 0; index < payments.length; index += 1) {
    const [email, plan, amountMinor, method, status] = payments[index];
    const reference = `SAMPLE-PAY-${String(index + 1).padStart(2, "0")}`;
    const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (!user) continue;
    await named(
      () => prisma.planPayment.findFirst({ where: { reference } }),
      () => prisma.planPayment.create({
        data: {
          userId: user.id,
          plan,
          amountMinor,
          method,
          reference,
          note: "Sample payment proof. No real transfer was made.",
          proofPath: "sample/not-uploaded.avif",
          status,
          adminNote: status === "pending" ? "" : "Sample review note.",
          submittedAt: day(-index),
          reviewedAt: status === "pending" ? null : day(-index),
        },
      }),
    );
  }

  const existingSettings = await prisma.planPaymentSettings.findUnique({ where: { id: "plan-payments" } });
  if (!existingSettings?.accountName) {
    await prisma.planPaymentSettings.upsert({
      where: { id: "plan-payments" },
      update: {
        accountName: "Creative Costwise (sample)",
        gcashNumber: "0917 000 0000",
        mayaNumber: "0918 000 0000",
        bankDetails: "Sample bank · 0000 0000 0000",
        instructions: "Sample only. Replace these with the real account before asking a crafter to pay.",
      },
      create: {
        id: "plan-payments",
        accountName: "Creative Costwise (sample)",
        gcashNumber: "0917 000 0000",
        mayaNumber: "0918 000 0000",
        bankDetails: "Sample bank · 0000 0000 0000",
        instructions: "Sample only. Replace these with the real account before asking a crafter to pay.",
      },
    });
  }
}

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL ?? "admin@local.test";
  const adminPassword = process.env.ADMIN_PASSWORD ?? "admin12345";
  const crafterEmail = process.env.DEMO_CRAFTER_EMAIL ?? "hello@creativecostwise.local";
  const crafterPassword = process.env.DEMO_CRAFTER_PASSWORD ?? "craft12345";

  const adminHash = await bcrypt.hash(adminPassword, 12);
  const crafterHash = await bcrypt.hash(crafterPassword, 12);

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: { name: "Creative Costwise Admin", passwordHash: adminHash, role: "admin" },
    create: {
      name: "Creative Costwise Admin",
      email: adminEmail,
      passwordHash: adminHash,
      role: "admin",
    },
  });

  const crafter = await prisma.user.upsert({
    where: { email: crafterEmail },
    update: {
      name: "Mia Santos",
      passwordHash: crafterHash,
      role: "crafter",
      disabledAt: null,
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    },
    create: {
      name: "Mia Santos",
      email: crafterEmail,
      passwordHash: crafterHash,
      role: "crafter",
      plan: "annual",
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    },
  });

  await prisma.shopSettings.upsert({
    where: { userId: crafter.id },
    update: {},
    create: { userId: crafter.id, businessName: "Mia's Paper Studio" },
  });
  if (!crafter.welcomedAt) {
    await prisma.user.update({ where: { id: crafter.id }, data: { welcomedAt: new Date() } });
  }
  await seedExamples(crafter.id);
  await seedVolume(crafter.id);
  await seedAdmin(crafterHash, crafter.id);

  console.info(`Admin login: ${adminEmail} / ${adminPassword}`);
  console.info(`Demo crafter login: ${crafterEmail} / ${crafterPassword}`);
}

main()
  .catch((error: unknown) => {
    console.error("Database seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
