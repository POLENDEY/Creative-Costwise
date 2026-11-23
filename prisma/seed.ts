import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import fs from "fs";
import path from "path";
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

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL ?? "admin@local.test";
  const adminPassword = process.env.ADMIN_PASSWORD ?? "admin12345";
  const crafterEmail = process.env.DEMO_CRAFTER_EMAIL ?? "hello@creativecostwise.local";
  const crafterPassword = process.env.DEMO_CRAFTER_PASSWORD ?? "craft12345";

  const adminHash = await bcrypt.hash(adminPassword, 12);
  const crafterHash = await bcrypt.hash(crafterPassword, 12);

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      name: "Creative Costwise Admin",
      email: adminEmail,
      passwordHash: adminHash,
      role: "admin",
    },
  });

  const crafter = await prisma.user.upsert({
    where: { email: crafterEmail },
    update: {},
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
