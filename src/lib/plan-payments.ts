import { appUrl, createMailTransport, escapeHtml, mailFromAddress } from "@/lib/mailer";
import { prisma } from "@/lib/prisma";
import { formatPlanPrice, getPlan } from "@/lib/plans";
import { paymentMethodLabel } from "@/lib/plan-payment-options";
import { getAdminNotificationAddress } from "@/lib/purchase-order-email";

/**
 * Renewal payments by online transfer.
 *
 * A crafter whose plan ended (or is about to) pays with GCash, Maya or a bank
 * transfer, then uploads a screenshot of the payment. The admin is notified by
 * email and in the admin workspace, checks the screenshot, and approving it
 * starts a fresh term.
 */

const SETTINGS_ID = "plan-payments";

export type PlanPaymentDetails = {
  accountName: string;
  gcashNumber: string;
  mayaNumber: string;
  bankDetails: string;
  instructions: string;
  qrPath: string | null;
};

export async function getPlanPaymentDetails(): Promise<PlanPaymentDetails> {
  const settings = await prisma.planPaymentSettings.findUnique({ where: { id: SETTINGS_ID } });
  return {
    accountName: settings?.accountName ?? "",
    gcashNumber: settings?.gcashNumber ?? "",
    mayaNumber: settings?.mayaNumber ?? "",
    bankDetails: settings?.bankDetails ?? "",
    instructions: settings?.instructions ?? "",
    qrPath: settings?.qrPath ?? null,
  };
}

export function hasPlanPaymentDetails(details: PlanPaymentDetails) {
  return Boolean(details.qrPath || details.gcashNumber || details.mayaNumber || details.bankDetails);
}

export async function getPlanPaymentsForUser(userId: string) {
  return prisma.planPayment.findMany({
    where: { userId },
    orderBy: { submittedAt: "desc" },
    take: 5,
    select: {
      id: true,
      plan: true,
      amountMinor: true,
      method: true,
      reference: true,
      status: true,
      adminNote: true,
      submittedAt: true,
    },
  });
}

const dateTimeFormatter = new Intl.DateTimeFormat("en", { dateStyle: "long", timeStyle: "short" });

export type PlanPaymentNotice = {
  paymentId: string;
  crafterName: string;
  crafterEmail: string;
  plan: string;
  amountMinor: number;
  method: string;
  reference: string;
  note: string;
  submittedAt: Date;
};

export function buildPlanPaymentEmail(input: PlanPaymentNotice) {
  const plan = getPlan(input.plan);
  const amount = formatPlanPrice(input.amountMinor);
  const submitted = dateTimeFormatter.format(input.submittedAt);
  const reviewUrl = appUrl("/admin/payments");

  const text = [
    `Hello,`,
    "",
    `${input.crafterName} (${input.crafterEmail}) sent a payment proof for the ${plan.label} plan.`,
    "",
    `- Plan: ${plan.label} (${amount} ${plan.cadence})`,
    `- Paid with: ${paymentMethodLabel(input.method)}`,
    input.reference ? `- Reference: ${input.reference}` : "- Reference: not given",
    input.note ? `- Crafter note: ${input.note}` : "",
    `- Sent: ${submitted}`,
    "",
    "Open the payment proofs page to look at the screenshot, then approve it to start the new term or reject it if the payment does not match:",
    reviewUrl,
    "",
    "Creative Costwise — automatic payment notice.",
  ].filter((line) => line !== "").join("\n");

  const html = `<div style="font-family:Arial,Helvetica,sans-serif;max-width:620px;margin:auto;color:#312a33;line-height:1.55">
    <div style="padding:20px 24px;background:#fdf1f6;border-radius:14px 14px 0 0">
      <p style="margin:0;font-size:12px;letter-spacing:.14em;color:#a4245b">CREATIVE COSTWISE</p>
      <h1 style="margin:8px 0 0;font-size:21px">New ${escapeHtml(plan.label)} payment proof</h1>
    </div>
    <div style="padding:24px;border:1px solid #f3e2ea;border-top:none;border-radius:0 0 14px 14px">
      <p style="margin-top:0"><b>${escapeHtml(input.crafterName)}</b> (${escapeHtml(input.crafterEmail)}) sent a payment proof for the <b>${escapeHtml(plan.label)}</b> plan.</p>
      <table style="width:100%;border-collapse:collapse;margin-bottom:18px">
        <tr><td style="padding:7px 0;color:#6d5b66">Amount</td><td style="padding:7px 0"><b>${escapeHtml(amount)}</b> ${escapeHtml(plan.cadence)}</td></tr>
        <tr><td style="padding:7px 0;color:#6d5b66">Paid with</td><td style="padding:7px 0">${escapeHtml(paymentMethodLabel(input.method))}</td></tr>
        <tr><td style="padding:7px 0;color:#6d5b66">Reference</td><td style="padding:7px 0">${escapeHtml(input.reference || "not given")}</td></tr>
        ${input.note ? `<tr><td style="padding:7px 0;color:#6d5b66">Crafter note</td><td style="padding:7px 0">${escapeHtml(input.note)}</td></tr>` : ""}
        <tr><td style="padding:7px 0;color:#6d5b66">Sent</td><td style="padding:7px 0">${escapeHtml(submitted)}</td></tr>
      </table>
      <p style="margin-bottom:18px"><a href="${escapeHtml(reviewUrl)}" style="display:inline-block;background:#b3185f;color:#fff;text-decoration:none;padding:11px 18px;border-radius:10px">Open the payment proofs</a></p>
      <p style="margin-bottom:0;color:#6d5b66;font-size:13px">The screenshot is attached to the submission on that page. Approving it starts the new term; rejecting it leaves the plan unchanged.</p>
    </div>
  </div>`;

  return {
    subject: `${input.crafterName} sent a ${plan.label} payment proof — ${amount}`,
    text,
    html,
  };
}

export async function notifyAdminsOfPlanPayment(
  input: PlanPaymentNotice,
): Promise<{ sent: boolean; reason: string }> {
  const admins = (
    await prisma.user.findMany({ where: { role: "admin" }, select: { id: true, email: true, disabledAt: true } })
  ).filter((admin) => !admin.disabledAt);

  const plan = getPlan(input.plan);
  const summary = `${input.crafterName} sent a ${plan.label} payment proof (${formatPlanPrice(input.amountMinor)}) — review it to renew the plan.`;
  if (admins.length) {
    await prisma.notification.createMany({
      data: admins.map((admin) => ({
        userId: admin.id,
        title: "New plan payment proof",
        message: summary,
        href: "/admin/payments",
      })),
    });
  }

  const recipients = Array.from(
    new Set(
      [getAdminNotificationAddress(), ...admins.map((admin) => admin.email)]
        .map((address) => address.trim())
        .filter(Boolean),
    ),
  );
  const transport = createMailTransport();
  const from = mailFromAddress();
  if (!transport || !from) {
    return { sent: false, reason: "The admin notice is in the admin workspace, but no mailbox is configured to email it." };
  }
  if (!recipients.length) {
    return { sent: false, reason: "The admin notice is in the admin workspace, but no admin email address is set." };
  }

  const message = buildPlanPaymentEmail(input);
  try {
    await transport.sendMail({ from, to: recipients.join(", "), replyTo: input.crafterEmail, ...message });
    return { sent: true, reason: "" };
  } catch (error) {
    console.error("Plan payment admin notice failed.", error);
    return { sent: false, reason: "The admin notice is in the admin workspace, but the email could not be delivered." };
  }
}
