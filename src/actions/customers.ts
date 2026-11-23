"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireCrafter } from "@/lib/session";

const customerSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1).max(120),
  phone: z.string().trim().max(40),
  email: z.union([z.literal(""), z.string().trim().email().max(120)]),
  address: z.string().trim().max(300),
  notes: z.string().trim().max(500),
});

export async function saveCustomer(formData: FormData) {
  const user = await requireCrafter();
  const id = String(formData.get("id") ?? "").trim();
  const parsed = customerSchema.safeParse({
    id: id || undefined,
    name: formData.get("name"),
    phone: formData.get("phone") ?? "",
    email: String(formData.get("email") ?? "").trim(),
    address: formData.get("address") ?? "",
    notes: formData.get("notes") ?? "",
  });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Check the customer details.");
  const email = parsed.data.email.toLowerCase();
  const phone = parsed.data.phone;

  const existing = await prisma.customer.findMany({
    where: { userId: user.id, ...(parsed.data.id ? { id: { not: parsed.data.id } } : {}) },
    select: { email: true, phone: true },
  });
  if (email && existing.some((customer) => customer.email.toLowerCase() === email)) {
    throw new Error("A customer with this email is already saved.");
  }
  if (phone && existing.some((customer) => customer.phone === phone)) {
    throw new Error("A customer with this phone number is already saved.");
  }

  const data = { name: parsed.data.name, phone, email, address: parsed.data.address, notes: parsed.data.notes };
  if (parsed.data.id) {
    const owned = await prisma.customer.findFirst({ where: { id: parsed.data.id, userId: user.id }, select: { id: true } });
    if (!owned) throw new Error("That customer is not in your list.");
    await prisma.customer.update({ where: { id: owned.id }, data });
  } else {
    await prisma.customer.create({ data: { userId: user.id, ...data } });
  }
  revalidatePath("/customers");
  revalidatePath("/orders");
}
