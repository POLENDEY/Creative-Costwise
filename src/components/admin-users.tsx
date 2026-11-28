"use client";

import { userFacingError } from "@/lib/user-facing-error";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Copy, MailCheck, UserPlus } from "lucide-react";
import { createCrafter, sendRenewalRemindersNow, updateCrafterAccess } from "@/app/actions";
import type { RenewalReminderResult } from "@/lib/renewal-reminders";
import { formatPlanDate } from "@/lib/plan-features";
import { savePlanPrices } from "@/actions/plan-catalog";
import { formatPlanPrice, getPlan, PLAN_KEYS, planExpiry, plansWithPrices, PLANS, type PlanPriceMap } from "@/lib/plans";

type UserRow = {
  id: string;
  name: string;
  email: string;
  plan: string | null;
  expiresAt: string | null;
  disabledAt: string | null;
};

function accessStatus(user: UserRow) {
  if (user.disabledAt) return "Disabled";
  if (user.expiresAt && new Date(user.expiresAt).getTime() < Date.now()) return "Expired";
  return "Active";
}

function PlanPicker({ user, prices }: { user: UserRow; prices: PlanPriceMap }) {
  const catalog = plansWithPrices(prices);
  const [plan, setPlan] = useState(user.plan ?? "quarterly");
  const definition = getPlan(plan);
  const endsOn = formatPlanDate(planExpiry(plan));
  return (
    <div className="plan-picker">
      <form action={updateCrafterAccess} className="inline-admin-action">
        <input type="hidden" name="userId" value={user.id} />
        <input type="hidden" name="action" value="change-plan" />
        <select
          name="plan"
          value={plan}
          onChange={(event) => setPlan(event.target.value)}
          aria-label={`Plan for ${user.name}`}
        >
          {PLAN_KEYS.map((key) => (
            <option key={key} value={key}>
              {catalog[key].label} · {formatPlanPrice(catalog[key].priceMinor)}
            </option>
          ))}
        </select>
        <button className="admin-mini-button" type="submit">Save</button>
      </form>
      <small className="plan-expiry-preview">
        Saving starts a new {definition.label.toLowerCase()} term ending <b>{endsOn}</b>
      </small>
    </div>
  );
}

function PlanPriceForm({ prices }: { prices: PlanPriceMap }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pending, startSaving] = useTransition();

  function save(formData: FormData) {
    setMessage("");
    setError("");
    startSaving(async () => {
      try {
        await savePlanPrices(formData);
        setMessage("Plan prices saved. Crafters see them on the plans page.");
        router.refresh();
      } catch (reason) {
        setError(userFacingError(reason, "The plan prices could not be saved."));
      }
    });
  }

  return (
    <section className="admin-create-card">
      <h2>Plan prices</h2>
      <p className="renewal-reminder-copy">These amounts are what crafters see on the plans page, and what a new payment proof records.</p>
      <form action={save} className="admin-form">
        {PLAN_KEYS.map((key) => (
          <label className="field" key={key}>{PLANS[key].label} price (PHP)
            <input name={key} defaultValue={(prices[key] / 100).toFixed(2)} inputMode="decimal" required />
          </label>
        ))}
        <button className="button button-primary" type="submit" disabled={pending}>{pending ? "Saving…" : "Save prices"}</button>
      </form>
      {message && <p className="action-message" role="status">{message}</p>}
      {error && <p className="form-error" role="alert">{error}</p>}
    </section>
  );
}

export function AdminUsers({ users, emailReady, prices }: { users: UserRow[]; emailReady: boolean; prices: PlanPriceMap }) {
  const catalog = plansWithPrices(prices);
  const [password, setPassword] = useState("");
  const [passwordFor, setPasswordFor] = useState<{ name: string; email: string } | null>(null);
  const [error, setError] = useState("");
  const [newPlan, setNewPlan] = useState("quarterly");
  const [busy, startTransition] = useTransition();
  const newPlanDefinition = getPlan(newPlan);
  const newPlanEndsOn = formatPlanDate(planExpiry(newPlan));
  const [reminderBusy, startReminders] = useTransition();
  const [reminderResult, setReminderResult] = useState<RenewalReminderResult | null>(null);
  const [reminderError, setReminderError] = useState("");

  function runReminders() {
    setReminderError("");
    startReminders(async () => {
      try {
        setReminderResult(await sendRenewalRemindersNow());
      } catch (reason) {
        setReminderError(userFacingError(reason, "The renewal emails could not be sent."));
      }
    });
  }

  function submit(formData: FormData) {
    setError("");
    setPassword("");
    startTransition(async () => {
      try {
        const result = await createCrafter(formData);
        setPassword(result.temporaryPassword);
        setPasswordFor({ name: result.crafterName, email: result.crafterEmail });
      } catch (reason) {
        setError(userFacingError(reason, "The account could not be created."));
      }
    });
  }

  return <>
    <PlanPriceForm prices={prices} />
    <section className="admin-create-card renewal-reminders"><h2>Automatic renewal emails</h2><p className="renewal-reminder-copy">{emailReady ? "Only a crafter whose plan has already ended gets this message: the system writes it and sends it from your own mailbox, with the plans, prices and a link to upload a payment proof. An active plan is never emailed, each ended plan is emailed once, and the email stops as soon as the plan is renewed or a payment proof is waiting for review." : "Automatic renewal emails are off until a mailbox is connected. Add SMTP_USER (your Gmail address), SMTP_PASSWORD (a Gmail app password) and SMTP_SERVICE=gmail to .env, then restart the app."}</p><div className="renewal-reminder-actions"><button type="button" className="button button-secondary" onClick={runReminders} disabled={reminderBusy || !emailReady}><MailCheck size={15} /> {reminderBusy ? "Checking accounts…" : "Send renewal emails now"}</button></div>{reminderResult && <p className="renewal-reminder-result" role="status">{reminderResult.sent > 0 ? `Sent ${reminderResult.sent} renewal email${reminderResult.sent === 1 ? "" : "s"}${reminderResult.recipients.length ? ` to ${reminderResult.recipients.join(", ")}` : ""}.` : "No ended plan needed a reminder right now."}{reminderResult.failed > 0 ? ` ${reminderResult.failed} could not be delivered — check the server log.` : ""}</p>}{reminderError && <p className="form-error" role="alert">{reminderError}</p>}</section>
    <section className="admin-create-card"><h2>Create a crafter login</h2><form action={submit} className="admin-form"><label className="field">Crafter name<input name="name" required maxLength={100} placeholder="Name" /></label><label className="field">Email address<input name="email" type="email" required placeholder="crafter@example.com" /></label><label className="field">Plan<select name="plan" value={newPlan} onChange={(event) => setNewPlan(event.target.value)}>{PLAN_KEYS.map((key) => <option key={key} value={key}>{catalog[key].label} · {formatPlanPrice(catalog[key].priceMinor)} {catalog[key].cadence}</option>)}</select><small className="plan-expiry-preview">Access ends <b>{newPlanEndsOn}</b> · {newPlanDefinition.months} month{newPlanDefinition.months === 1 ? "" : "s"} from today</small></label><button className="button button-primary" disabled={busy}><UserPlus size={15} /> {busy ? "Creating…" : "Create login"}</button></form>{error && <p className="form-error" role="alert">{error}</p>}{password && passwordFor && <div className="temporary-password"><b>Temporary password for {passwordFor.name} ({passwordFor.email})</b><code>{password}</code><button className="button button-secondary" onClick={() => navigator.clipboard.writeText(password)}><Copy size={14} /> Copy once and share securely</button><small>Share this password securely with {passwordFor.name}. They will be asked to change it at first sign-in.</small></div>}</section>
    <section className="admin-users-card"><h2>Shop accounts <span>({users.length})</span></h2>{users.length ? <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Crafter</th><th>Email</th><th>Plan</th><th>Expires</th><th>Status</th><th>Access</th></tr></thead><tbody>{users.map((user) => <tr key={user.id}><td><b>{user.name}</b></td><td>{user.email}</td><td><PlanPicker user={user} prices={prices} /></td><td>{user.expiresAt ? new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(user.expiresAt)) : "—"}</td><td><span className={`status-pill status-${accessStatus(user).toLowerCase()}`}>{accessStatus(user)}</span></td><td><div className="admin-row-actions"><form action={updateCrafterAccess}><input type="hidden" name="userId" value={user.id} /><input type="hidden" name="action" value="renew" /><button className="admin-mini-button" type="submit">Renew</button></form><form action={updateCrafterAccess}><input type="hidden" name="userId" value={user.id} /><input type="hidden" name="action" value={user.disabledAt ? "enable" : "disable"} /><button className="admin-mini-button" type="submit">{user.disabledAt ? "Enable" : "Disable"}</button></form></div></td></tr>)}</tbody></table></div> : <p className="admin-empty">No crafter accounts yet. Create the first login above.</p>}</section>
  </>;
}
