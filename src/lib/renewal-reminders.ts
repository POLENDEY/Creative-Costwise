import { prisma } from "@/lib/prisma";
import { appUrl, createMailTransport, emailConfigured, escapeHtml, mailFromAddress } from "@/lib/mailer";
import { formatPlanDate, PLAN_FEATURES } from "@/lib/plan-features";
import {
  formatPlanPrice,
  PLAN_KEYS,
  planFromPrices,
  planMonthlyMinor,
  planSavingsPercent,
  type PlanPriceMap,
} from "@/lib/plans";
import { getPlanCatalog } from "@/lib/plan-catalog";

/**
 * Automatic renewal reminders.
 *
 * Only a crafter whose plan has already ended gets this message. It is written by
 * the system and sent from the shop's own mailbox (SMTP_USER, normally the shop
 * Gmail) to the crafter's email address. Each ended term is reminded once: the
 * reminder records which expiry date it covered, so renewing (manually or by an
 * approved payment proof) clears it and a still-expired account is never spammed.
 * A crafter who already sent a payment proof waits for review instead.
 *
 * The job runs every few hours from the server process, and the admin page can
 * trigger it by hand.
 */

const CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;
const STARTUP_DELAY_MS = 20_000;

export type RenewalReminderResult = {
  configured: boolean;
  checked: number;
  sent: number;
  failed: number;
  waiting: number;
  recipients: string[];
};

const dateFormatter = new Intl.DateTimeFormat("en", { dateStyle: "long" });

function formatEndDate(value: Date) {
  return dateFormatter.format(value) || formatPlanDate(value) || "";
}

function planOptions(prices: PlanPriceMap) {
  return PLAN_KEYS.map((key) => {
    const plan = planFromPrices(key, prices);
    const savings = planSavingsPercent(key, prices);
    const monthly = `≈ ${formatPlanPrice(planMonthlyMinor(key, prices))} per month`;
    const detail = plan.months === 1
      ? "billed every month, no long commitment"
      : `${monthly}${savings > 0 ? `, save ${savings}%` : ""}`;
    return {
      label: plan.label,
      price: `${formatPlanPrice(plan.priceMinor)} ${plan.cadence}`,
      perMonth: detail,
    };
  });
}

export function buildRenewalEmail(input: {
  name: string;
  plan: string | null;
  expiresAt: Date;
  prices: PlanPriceMap;
}) {
  const plan = planFromPrices(input.plan, input.prices);
  const endedOn = formatEndDate(input.expiresAt);
  const pricingUrl = appUrl("/pricing");
  const locked = Object.values(PLAN_FEATURES).map((feature) => feature.label);
  const options = planOptions(input.prices);

  const text = [
    `Hello ${input.name},`,
    "",
    "This is an automatic reminder from Creative Costwise.",
    "",
    `Your ${plan.label} plan ended on ${endedOn}. Your workspace is still open — your materials, printers, customers, settings and every saved price are untouched — but these tools are locked until your plan is renewed:`,
    "",
    ...locked.map((feature) => `- ${feature}`),
    "",
    "To unlock them again, choose a plan, pay with GCash, Maya, or an online bank transfer, then upload a screenshot of the payment proof:",
    "",
    ...options.map((option) => `- ${option.label}: ${option.price} (${option.perMonth})`),
    "",
    `Send the payment proof here: ${pricingUrl}`,
    "",
    "Your toolkit admin is notified automatically and switches the plan back on once the payment is checked. Your login, materials and saved prices stay exactly as they are.",
    "",
    "Creative Costwise",
    "Automatic plan reminder — sent from the shop's own mailbox.",
  ].join("\n");

  const optionsHtml = options
    .map(
      (option) => `<tr>
        <td style="padding:9px 10px;border-bottom:1px solid #f0e3ea"><b>${escapeHtml(option.label)}</b></td>
        <td style="padding:9px 10px;border-bottom:1px solid #f0e3ea">${escapeHtml(option.price)}</td>
        <td style="padding:9px 10px;border-bottom:1px solid #f0e3ea;color:#6d5b66">${escapeHtml(option.perMonth)}</td>
      </tr>`,
    )
    .join("");

  const html = `<div style="font-family:Arial,Helvetica,sans-serif;max-width:640px;margin:auto;color:#312a33;line-height:1.55">
    <div style="padding:20px 24px;background:#fdf1f6;border-radius:14px 14px 0 0">
      <p style="margin:0;font-size:12px;letter-spacing:.14em;color:#a4245b">CREATIVE COSTWISE</p>
      <h1 style="margin:8px 0 0;font-size:22px">Your ${escapeHtml(plan.label)} plan has ended</h1>
    </div>
    <div style="padding:24px;border:1px solid #f3e2ea;border-top:none;border-radius:0 0 14px 14px">
      <p style="margin-top:0">Hello ${escapeHtml(input.name)},</p>
      <p>This is an automatic reminder from Creative Costwise. Your <b>${escapeHtml(plan.label)}</b> plan ended on <b>${escapeHtml(endedOn)}</b>.</p>
      <p>Your workspace is still open — your materials, printers, customers, settings and every saved price are untouched — but these tools are locked until your plan is renewed:</p>
      <ul style="margin:0 0 18px;padding-left:20px">${locked.map((feature) => `<li>${escapeHtml(feature)}</li>`).join("")}</ul>
      <p style="margin-bottom:6px"><b>To unlock them again, choose a plan, pay with GCash, Maya, or an online bank transfer, then upload a screenshot of the payment proof:</b></p>
      <table style="width:100%;border-collapse:collapse;margin-bottom:18px">${optionsHtml}</table>
      <p style="margin-bottom:18px"><a href="${escapeHtml(pricingUrl)}" style="display:inline-block;background:#b3185f;color:#fff;text-decoration:none;padding:11px 18px;border-radius:10px">Send the payment proof</a></p>
      <p>Your toolkit admin is notified automatically and switches the plan back on once the payment is checked. Your login, materials and saved prices stay exactly as they are.</p>
      <p style="margin-bottom:0;color:#6d5b66;font-size:13px">Creative Costwise — automatic plan reminder, sent from the shop's own mailbox.</p>
    </div>
  </div>`;

  return {
    subject: `Your ${plan.label} plan ended — renew to unlock the full toolkit`,
    text,
    html,
  };
}

let running = false;

function isDue(user: {
  expiresAt: Date | null;
  renewalReminderFor: Date | null;
}) {
  if (!user.expiresAt) return false;
  if (!user.renewalReminderFor) return true;
  return user.renewalReminderFor.getTime() < user.expiresAt.getTime();
}

export async function runRenewalReminders(): Promise<RenewalReminderResult> {
  const configured = emailConfigured();
  const result: RenewalReminderResult = { configured, checked: 0, sent: 0, failed: 0, waiting: 0, recipients: [] };
  if (running) return result;
  running = true;

  try {
    const now = new Date();
    const ended = await prisma.user.findMany({
      where: { role: "crafter", expiresAt: { lte: now } },
      orderBy: { expiresAt: "asc" },
      take: 50,
      select: {
        id: true,
        name: true,
        email: true,
        plan: true,
        expiresAt: true,
        disabledAt: true,
        renewalReminderFor: true,
      },
    });
    // Paused accounts are skipped. This is filtered here rather than in the query:
    // on MongoDB a `disabledAt: null` filter also drops records that never set it.
    const candidates = ended.filter((user) => !user.disabledAt && user.expiresAt);
    result.checked = candidates.length;

    // Someone who already sent a payment proof is waiting on the admin, not on a
    // reminder. Pausing here also means a rejected proof can still be reminded later.
    const pendingPayments = await prisma.planPayment.findMany({
      where: { status: "pending", userId: { in: candidates.map((user) => user.id) } },
      select: { userId: true },
    });
    const awaitingReview = new Set(pendingPayments.map((payment) => payment.userId));

    const due = candidates.filter(
      (user) => user.expiresAt && isDue(user) && !awaitingReview.has(user.id),
    );
    result.waiting = due.length;
    if (!due.length) return result;

    const prices = await getPlanCatalog();
    const transport = createMailTransport();
    const from = mailFromAddress();
    if (!transport || !from) return result;

    for (const user of due) {
      // Re-read at send time: a plan renewed moments ago must never be reminded.
      const fresh = await prisma.user.findUnique({
        where: { id: user.id },
        select: { expiresAt: true, disabledAt: true, renewalReminderFor: true },
      });
      if (!fresh?.expiresAt || fresh.disabledAt || fresh.expiresAt.getTime() > Date.now() || !isDue(fresh)) {
        result.waiting -= 1;
        continue;
      }
      const expiresAt = fresh.expiresAt;
      const message = buildRenewalEmail({ name: user.name, plan: user.plan, expiresAt, prices });
      try {
        await transport.sendMail({ from, to: user.email, ...message });
        await prisma.user.update({
          where: { id: user.id },
          data: { renewalReminderSentAt: new Date(), renewalReminderFor: expiresAt },
        });
        result.sent += 1;
        result.waiting -= 1;
        result.recipients.push(user.email);
      } catch (error) {
        result.failed += 1;
        result.waiting -= 1;
        console.error(`Renewal reminder to ${user.email} failed.`, error);
      }
    }
    console.info(
      `Renewal reminders: ${result.sent} sent, ${result.failed} failed, ${result.waiting} waiting.`,
    );
    return result;
  } finally {
    running = false;
  }
}

const globalForRenewalReminders = globalThis as unknown as {
  renewalReminderTimer?: ReturnType<typeof setInterval>;
  renewalReminderStartup?: ReturnType<typeof setTimeout>;
};

export function startRenewalReminderSchedule() {
  if (globalForRenewalReminders.renewalReminderTimer) return;
  const run = () => {
    void runRenewalReminders().catch((error: unknown) => {
      console.error("Renewal reminder run failed.", error);
    });
  };
  globalForRenewalReminders.renewalReminderStartup = setTimeout(run, STARTUP_DELAY_MS);
  globalForRenewalReminders.renewalReminderStartup.unref?.();
  const timer = setInterval(run, CHECK_INTERVAL_MS);
  timer.unref?.();
  globalForRenewalReminders.renewalReminderTimer = timer;
  console.info("Automatic renewal reminders are checking every 6 hours.");
}
