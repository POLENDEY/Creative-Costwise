import { z } from "zod";

export const checklistSteps = [
  { id: "personalize", label: "Personalize the toolkit", annualOnly: false },
  { id: "guide", label: "Read the welcome guide and FAQs", annualOnly: false },
  { id: "materials", label: "Add materials", annualOnly: false },
  { id: "print-hub", label: "Set up Print hub", annualOnly: false },
  { id: "costing", label: "Cost a product", annualOnly: false },
  { id: "prices", label: "Save a price", annualOnly: false },
  { id: "customer", label: "Add a customer", annualOnly: false },
  { id: "order", label: "Create an order", annualOnly: false },
  { id: "document", label: "Make an invoice or receipt", annualOnly: false },
  { id: "finance", label: "Review sales and finance", annualOnly: false },
  { id: "calendar", label: "Open the calendar", annualOnly: false },
] as const;

const checklistSchema = z.record(z.string(), z.string());

export function parseChecklist(value: string) {
  let decoded: unknown;
  try {
    decoded = JSON.parse(value);
  } catch {
    throw new Error("Saved checklist data is invalid.");
  }
  const parsed = checklistSchema.safeParse(decoded);
  if (!parsed.success) throw new Error("Saved checklist data is invalid.");
  return parsed.data;
}
