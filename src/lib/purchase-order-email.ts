import nodemailer from "nodemailer";
import { formatMoney, resolveCurrency } from "@/lib/money";
import { parseProductCostBreakdown } from "@/lib/product-breakdown";

type PurchaseOrderEmailLine = {
  productName: string;
  quantity: number;
  unitPriceMinor: number;
  unitProductionCostMinor: number;
  lineTotalMinor: number;
  breakdownJson: string;
};

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character] ?? character);
}

function smtpPassword() {
  return process.env.SMTP_PASSWORD || process.env.SMTP_PASS || "";
}

function createTransport() {
  const user = process.env.SMTP_USER?.trim();
  const pass = smtpPassword();
  if (!user || !pass) return null;

  const service = process.env.SMTP_SERVICE?.trim().toLowerCase();
  if (service === "gmail") {
    return nodemailer.createTransport({ service: "gmail", auth: { user, pass } });
  }

  const host = process.env.SMTP_HOST?.trim();
  const port = Number(process.env.SMTP_PORT ?? 587);
  if (!host || !Number.isInteger(port) || port < 1 || port > 65535) return null;
  const secure = process.env.SMTP_SECURE
    ? process.env.SMTP_SECURE.toLowerCase() === "true"
    : port === 465;
  return nodemailer.createTransport({ host, port, secure, auth: { user, pass } });
}

function mailFromAddress() {
  return process.env.MAIL_FROM?.trim() || process.env.EMAIL_FROM?.trim() || process.env.SMTP_USER?.trim() || "";
}

export async function sendPurchaseOrderEmail(input: {
  to: string;
  recipientName: string;
  purchaseOrderId: string;
  crafterName: string;
  crafterEmail: string;
  currency: string;
  note: string;
  response?: string;
  statusLabel: string;
  lines: PurchaseOrderEmailLine[];
  totalMinor: number;
  actionPath: "/admin/orders" | "/purchase-orders";
}) {
  const transport = createTransport();
  const from = mailFromAddress();
  if (!transport || !from) {
    return { sent: false, reason: "Email is not configured; the request is still available in the website inbox." };
  }

  const currency = resolveCurrency(input.currency);
  const rowsText = input.lines
    .map((line) => `- ${line.productName} × ${line.quantity}: ${formatMoney(line.lineTotalMinor, currency)} (cost ${formatMoney(line.unitProductionCostMinor, currency)} each)\n${emailBreakdownText(line.breakdownJson, currency)}`)
    .join("\n");
  const rowsHtml = input.lines.map((line) => `
    <tr>
      <td style="padding:10px;border-bottom:1px solid #eee">${escapeHtml(line.productName)}<br><small>Production cost: ${formatMoney(line.unitProductionCostMinor, currency)} / piece</small>${emailBreakdown(line.breakdownJson, currency)}</td>
      <td style="padding:10px;border-bottom:1px solid #eee">${line.quantity}</td>
      <td style="padding:10px;border-bottom:1px solid #eee">${formatMoney(line.lineTotalMinor, currency)}</td>
    </tr>`).join("");
  const responseText = input.response ? `\n\nMessage: ${input.response}` : "";
  const responseHtml = input.response
    ? `<p style="white-space:pre-wrap">${escapeHtml(input.response)}</p>`
    : "";
  const actionUrl = new URL(input.actionPath, process.env.NEXTAUTH_URL ?? "http://localhost:3000").toString();

  try {
    await transport.sendMail({
      from,
      to: input.to,
      replyTo: input.crafterEmail,
      subject: input.statusLabel === "received"
        ? `Transaction received — purchase request ${input.purchaseOrderId.slice(-8).toUpperCase()}`
        : `Purchase request ${input.purchaseOrderId.slice(-8).toUpperCase()} — ${input.statusLabel}`,
      text: `Hello ${input.recipientName},\n\nPurchase request ${input.purchaseOrderId} from ${input.crafterName} (${input.crafterEmail}) is ${input.statusLabel}.\n\n${rowsText}\n\nTotal: ${formatMoney(input.totalMinor, currency)}${input.note ? `\n\nCrafter note: ${input.note}` : ""}${responseText}\n\nOpen the request: ${actionUrl}`,
      html: `<div style="font-family:Arial,sans-serif;max-width:680px;margin:auto;color:#312a33"><p>Hello ${escapeHtml(input.recipientName)},</p><p>Purchase request <b>${escapeHtml(input.purchaseOrderId)}</b> from <b>${escapeHtml(input.crafterName)}</b> (${escapeHtml(input.crafterEmail)}) is <b>${escapeHtml(input.statusLabel)}</b>.</p><table style="width:100%;border-collapse:collapse"><thead><tr><th align="left" style="padding:10px">Product</th><th align="left" style="padding:10px">Qty</th><th align="left" style="padding:10px">Line total</th></tr></thead><tbody>${rowsHtml}</tbody></table><p><b>Total: ${formatMoney(input.totalMinor, currency)}</b></p>${input.note ? `<p>Crafter note: ${escapeHtml(input.note)}</p>` : ""}${responseHtml}<p><a href="${escapeHtml(actionUrl)}">Open purchase requests</a></p></div>`,
    });
    return { sent: true, reason: "" };
  } catch (error) {
    console.error("Purchase order email delivery failed.", error);
    return { sent: false, reason: "Email delivery failed; the request is still available in the website inbox." };
  }
}

export function getAdminNotificationAddress() {
  return process.env.ADMIN_NOTIFICATION_EMAIL?.trim()
    || process.env.INQUIRY_NOTIFY_TO?.trim()
    || process.env.ADMIN_EMAIL?.trim()
    || "";
}

function emailBreakdown(breakdownJson: string, currency: ReturnType<typeof resolveCurrency>) {
  const breakdown = parseProductCostBreakdown(breakdownJson);
  const rows = [
    ...breakdown.materials.map((line) => `${line.name} · ${formatMoney(line.perPieceMinor, currency)} / piece`),
    ...breakdown.printing.map((line) => `${line.printerName} printing · ${formatMoney(line.perPieceMinor, currency)} / piece`),
    `Overage: ${formatMoney(breakdown.overageMinor, currency)}`,
    `Production loss: ${formatMoney(breakdown.lossMinor, currency)}`,
    `Operations: ${formatMoney(breakdown.operationalFeeMinor, currency)}`,
    `Labor: ${formatMoney(breakdown.laborMinor, currency)}`,
    `Packaging: ${formatMoney(breakdown.packagingCostMinor, currency)}`,
  ];
  return `<div style="margin-top:7px;padding-top:6px;border-top:1px solid #eee;font-size:12px;color:#625962">${rows.map((row) => `<div>${escapeHtml(row)}</div>`).join("")}</div>`;
}

function emailBreakdownText(breakdownJson: string, currency: ReturnType<typeof resolveCurrency>) {
  const breakdown = parseProductCostBreakdown(breakdownJson);
  return [
    ...breakdown.materials.map((line) => `  Material ${line.name}: ${formatMoney(line.perPieceMinor, currency)} / piece`),
    ...breakdown.printing.map((line) => `  Printing ${line.printerName}: ${formatMoney(line.perPieceMinor, currency)} / piece`),
    `  Overage: ${formatMoney(breakdown.overageMinor, currency)}`,
    `  Production loss: ${formatMoney(breakdown.lossMinor, currency)}`,
    `  Operations: ${formatMoney(breakdown.operationalFeeMinor, currency)}`,
    `  Labor: ${formatMoney(breakdown.laborMinor, currency)}`,
    `  Packaging: ${formatMoney(breakdown.packagingCostMinor, currency)}`,
  ].join("\n");
}
