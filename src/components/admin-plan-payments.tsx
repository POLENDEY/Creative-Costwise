"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { QrCode, Save, Trash2 } from "lucide-react";
import { deletePlanPayment, deletePlanPaymentQr, reviewPlanPayment, savePlanPaymentSettings } from "@/actions/plan-payments";
import { paymentMethodLabel, PLAN_PAYMENT_METHODS } from "@/lib/plan-payment-options";
import { formatPlanPrice, getPlan } from "@/lib/plans";

export type AdminPlanPaymentRow = {
  id: string;
  plan: string;
  amountMinor: number;
  method: string;
  reference: string;
  note: string;
  status: string;
  adminNote: string;
  submittedAt: string;
  reviewedAt: string | null;
  crafterName: string;
  crafterEmail: string;
};

export type AdminPaymentSettings = {
  accountName: string;
  gcashNumber: string;
  mayaNumber: string;
  bankDetails: string;
  instructions: string;
  qrPath: string | null;
};

const dateFormatter = new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" });

export function AdminPlanPayments({
  payments,
  settings,
}: {
  payments: AdminPlanPaymentRow[];
  settings: AdminPaymentSettings;
}) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, startSaving] = useTransition();
  const [reviewing, startReviewing] = useTransition();
  const [deletingId, setDeletingId] = useState("");

  function saveSettings(formData: FormData) {
    setError("");
    setMessage("");
    startSaving(async () => {
      try {
        await savePlanPaymentSettings(formData);
        setMessage("Payment details saved. Crafters now see them on the plans page.");
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : "The payment details could not be saved.");
      }
    });
  }

  function review(formData: FormData) {
    setError("");
    setMessage("");
    startReviewing(async () => {
      try {
        await reviewPlanPayment(formData);
        setMessage(formData.get("decision") === "approve" ? "Payment approved and the plan renewed." : "Payment proof rejected.");
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : "The payment proof could not be updated.");
      }
    });
  }

  function removePayment(payment: AdminPlanPaymentRow) {
    const label = `${payment.crafterName}'s ${getPlan(payment.plan).label} proof`;
    if (!window.confirm(`Delete ${label}? This removes the record and the screenshot from the database. The crafter's plan dates stay as they are.`)) return;
    setError("");
    setMessage("");
    setDeletingId(payment.id);
    startReviewing(async () => {
      try {
        await deletePlanPayment(payment.id);
        setMessage("Payment proof deleted.");
        router.refresh();
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : "The payment proof could not be deleted.");
      } finally {
        setDeletingId("");
      }
    });
  }

  function removeQr() {
    if (!window.confirm("Delete the payment QR code? Crafters will no longer see it on the plans page.")) return;
    setError("");
    setMessage("");
    startSaving(async () => {
      try {
        await deletePlanPaymentQr();
        setMessage("Payment QR code deleted.");
        router.refresh();
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : "The QR code could not be deleted.");
      }
    });
  }

  return (
    <>
      <section className="admin-create-card">
        <h2>How crafters pay you</h2>
        <p className="renewal-reminder-copy">
          These details appear on every crafter&apos;s plans page. Upload the payment QR code from your GCash, Maya, or
          bank app so crafters can scan it, then check the screenshot they send back.
        </p>
        <form action={saveSettings} className="admin-form">
          <div className="form-grid">
            <label className="field">Account name<input name="accountName" defaultValue={settings.accountName} maxLength={100} placeholder="Name on the account" /></label>
            <label className="field">GCash number<input name="gcashNumber" defaultValue={settings.gcashNumber} maxLength={40} placeholder="09xx xxx xxxx" /></label>
            <label className="field">Maya number<input name="mayaNumber" defaultValue={settings.mayaNumber} maxLength={40} placeholder="09xx xxx xxxx" /></label>
            <label className="field">Bank details<input name="bankDetails" defaultValue={settings.bankDetails} maxLength={300} placeholder="UB / BDO / BPI · account number" /></label>
            <label className="field field-span-2">Instructions for crafters<textarea name="instructions" defaultValue={settings.instructions} rows={2} maxLength={400} placeholder="For example: scan the QR, then upload the receipt from your GCash app." /></label>
            <label className="field field-span-2">Payment QR code (optional)<input type="file" name="qr" accept="image/jpeg,image/png,image/webp" /></label>
          </div>
          <div className="plan-pay-settings-row">
            {settings.qrPath ? (
              <span className="plan-pay-qr-actions">
                <Image className="plan-pay-qr" src={settings.qrPath} alt="Current payment QR code" width={168} height={168} />
                <button className="admin-mini-button admin-mini-danger" type="button" onClick={removeQr} disabled={saving}><Trash2 size={12} /> Delete QR</button>
              </span>
            ) : (
              <span className="plan-pay-qr-empty"><QrCode size={22} /> No QR uploaded yet</span>
            )}
            <button className="button button-primary" type="submit" disabled={saving}>
              <Save size={15} /> {saving ? "Saving…" : "Save payment details"}
            </button>
          </div>
        </form>
        {message && <p className="renewal-reminder-result" role="status">{message}</p>}
        {error && <p className="form-error" role="alert">{error}</p>}
      </section>

      <section className="admin-users-card">
        <h2>Renewal payments <span>({payments.length})</span></h2>
        {payments.length ? (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Crafter</th>
                  <th>Plan</th>
                  <th>Paid with</th>
                  <th>Proof</th>
                  <th>Sent</th>
                  <th>Decision</th>
                  <th>Delete</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => (
                  <tr key={payment.id}>
                    <td><b>{payment.crafterName}</b><small className="admin-payment-sub">{payment.crafterEmail}</small></td>
                    <td>{getPlan(payment.plan).label}<small className="admin-payment-sub">{formatPlanPrice(payment.amountMinor)}</small></td>
                    <td>{paymentMethodLabel(payment.method)}{payment.reference && <small className="admin-payment-sub">Ref {payment.reference}</small>}</td>
                    <td>
                      <a className="admin-payment-proof" href={`/api/plan-payment-proof/${payment.id}`} target="_blank" rel="noreferrer">View screenshot</a>
                      {payment.note && <small className="admin-payment-sub">{payment.note}</small>}
                    </td>
                    <td>
                      {dateFormatter.format(new Date(payment.submittedAt))}
                      <span className={`status-pill status-${payment.status}`}>{payment.status}</span>
                    </td>
                    <td>
                      {payment.status === "pending" ? (
                        <form action={review} className="admin-payment-review">
                          <input type="hidden" name="paymentId" value={payment.id} />
                          <input name="adminNote" maxLength={300} placeholder="Note (optional)" aria-label="Note for this payment" />
                          <button className="admin-mini-button" type="submit" name="decision" value="approve" disabled={reviewing}>Approve &amp; renew</button>
                          <button className="admin-mini-button admin-mini-danger" type="submit" name="decision" value="reject" disabled={reviewing}>Reject</button>
                        </form>
                      ) : (
                        <small className="admin-payment-sub">
                          {payment.reviewedAt ? dateFormatter.format(new Date(payment.reviewedAt)) : "—"}
                          {payment.adminNote ? ` · ${payment.adminNote}` : ""}
                        </small>
                      )}
                    </td>
                    <td>
                      <button className="admin-mini-button admin-mini-danger" type="button" onClick={() => removePayment(payment)} disabled={reviewing && deletingId === payment.id}>
                        <Trash2 size={12} /> {deletingId === payment.id ? "Deleting…" : "Delete"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="admin-empty">No payment proofs yet. Crafters send them from their plans page after paying with GCash, Maya, or a bank transfer.</p>
        )}
      </section>

      <section className="admin-create-card">
        <h2>Accepted payment methods</h2>
        <p className="renewal-reminder-copy">
          Crafters can mark a payment as {PLAN_PAYMENT_METHODS.map((method) => method.label).join(", ")}. Every
          submission emails you and appears in the admin bell. Approving it starts a fresh term from today, or from the
          current end date when the plan is still active.
        </p>
      </section>
    </>
  );
}
