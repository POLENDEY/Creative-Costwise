"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { parseGoogleSheetsUrl, parseHttpsUrl, RESOURCE_SETTINGS_ID } from "@/lib/resources";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/admin-session";
import { requireCrafter } from "@/lib/session";
import { userFacingError } from "@/lib/user-facing-error";

type ActionResult = { error?: string };

function message(error: unknown, fallback: string) {
  return userFacingError(error, fallback);
}

export async function saveMasterSheetLink(formData: FormData): Promise<ActionResult> {
  const user = await requireCrafter();
  let url = "";
  try {
    url = parseGoogleSheetsUrl(String(formData.get("masterSheetUrl") ?? ""));
  } catch (error) {
    return { error: message(error, "Paste an https Google Sheets link.") };
  }
  await prisma.shopSettings.upsert({
    where: { userId: user.id },
    update: { masterSheetUrl: url },
    create: { userId: user.id, masterSheetUrl: url },
  });
  revalidatePath("/resources/master-sheet");
  return {};
}

const wishSchema = z.object({
  title: z.string().trim().min(1, "Give the template a title.").max(120),
  details: z.string().trim().max(500),
});

export async function submitTemplateWish(formData: FormData): Promise<ActionResult> {
  const user = await requireCrafter();
  const parsed = wishSchema.safeParse({
    title: formData.get("title"),
    details: formData.get("details") ?? "",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Describe the template you want." };
  await prisma.templateWish.create({ data: { userId: user.id, ...parsed.data } });
  revalidatePath("/resources/wishes");
  revalidatePath("/admin/resources");
  return {};
}

export async function saveResourceLinks(formData: FormData): Promise<ActionResult> {
  await requireAdminSession();
  try {
    const masterTemplateUrl = parseHttpsUrl(String(formData.get("masterTemplateUrl") ?? ""), "Master template");
    const communityUrl = parseHttpsUrl(String(formData.get("communityUrl") ?? ""), "Community");
    const termsUrl = parseHttpsUrl(String(formData.get("termsUrl") ?? ""), "Terms");
    const privacyUrl = parseHttpsUrl(String(formData.get("privacyUrl") ?? ""), "Privacy");
    if (masterTemplateUrl && !masterTemplateUrl.includes("docs.google.com/spreadsheets/")) {
      return { error: "The master template must be an https Google Sheets link." };
    }
    await prisma.resourceSettings.upsert({
      where: { id: RESOURCE_SETTINGS_ID },
      update: { masterTemplateUrl, communityUrl, termsUrl, privacyUrl },
      create: { id: RESOURCE_SETTINGS_ID, masterTemplateUrl, communityUrl, termsUrl, privacyUrl },
    });
  } catch (error) {
    return { error: message(error, "Those links could not be saved.") };
  }
  revalidatePath("/resources/master-sheet");
  revalidatePath("/resources/community");
  revalidatePath("/admin/resources");
  return {};
}

const templateSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1, "Name the template.").max(120),
  category: z.string().trim().max(60),
  imageUrl: z.string().trim().max(300),
  url: z.string().trim().min(1, "Paste the template link.").max(300),
});

export async function saveTemplateEntry(formData: FormData): Promise<ActionResult> {
  await requireAdminSession();
  const id = String(formData.get("id") ?? "").trim();
  const parsed = templateSchema.safeParse({
    id: id || undefined,
    name: formData.get("name"),
    category: formData.get("category") ?? "",
    imageUrl: formData.get("imageUrl") ?? "",
    url: formData.get("url"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the template details." };
  try {
    const url = parseHttpsUrl(parsed.data.url, "Template");
    if (!url) return { error: "Paste the template link." };
    const imageUrl = parsed.data.imageUrl ? parseHttpsUrl(parsed.data.imageUrl, "Preview image") : "";
    const data = { name: parsed.data.name, category: parsed.data.category, imageUrl, url };
    if (parsed.data.id) {
      const existing = await prisma.templateEntry.findUnique({ where: { id: parsed.data.id }, select: { id: true } });
      if (!existing) return { error: "That template is no longer listed." };
      await prisma.templateEntry.update({ where: { id: existing.id }, data });
    } else {
      await prisma.templateEntry.create({ data });
    }
  } catch (error) {
    return { error: message(error, "The template could not be saved.") };
  }
  revalidatePath("/resources/templates");
  revalidatePath("/admin/resources");
  return {};
}

export async function deleteTemplateEntry(formData: FormData): Promise<ActionResult> {
  await requireAdminSession();
  const id = String(formData.get("id") ?? "");
  if (!id) return {};
  await prisma.templateEntry.deleteMany({ where: { id } });
  revalidatePath("/resources/templates");
  revalidatePath("/admin/resources");
  return {};
}
