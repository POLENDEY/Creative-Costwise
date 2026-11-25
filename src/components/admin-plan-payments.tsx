"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { AlertTriangle, Check, ImageIcon, QrCode, Save, Trash2, Upload, X } from "lucide-react";
import { deletePlanPayment, deletePlanPaymentQr, reviewPlanPayment, savePlanPaymentSettings } from "@/actions/plan-payments";
import { paymentMethodLabel, PLAN_PAYMENT_METHODS } from "@/lib/plan-payment-options";
import { formatPlanPrice, getPlan } from "@/lib/plans";
import { ImageLightbox } from "@/components/image-lightbox";

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
  hasProof: boolean;
};

export type AdminPaymentSettings = {
  accountName: string;
  gcashNumber: string;
  mayaNumber: string;
  bankDetails: string;
  instructions: string;
  qrUrl: string | null;
  qrMissing: boolean;
};

const dateFormatter = new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" });
const shortDateFormatter = new Intl.DateTimeFormat("en", { dateStyle: "medium" });

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
  const pendingCount = payments.filter((payment) => payment.status === "pending").length;

  function saveSettings(formData: FormData) {
    setError("");
    setMessage("");
    startSaving(async () => {
      try {
        await savePlanPaymentSettings(formData);
        setMessage("Payment details saved. Crafters now see them on the plans page.");
        router.refresh();
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
        const result = await reviewPlanPayment(formData);
        setMessage(`${formData.get("decision") === "approve" ? "Payment approved and the plan renewed." : "Payment proof rejected."} ${result.note}`);
        router.refresh();
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : "The payment proof could not be updated.");
      }
    });
  }

  function removePayment(payment: AdminPlanPaymentRow) {
    const label = `${payment.crafterName}'s ${getPlan(payment.plan).label} proof`;
    if (!window.confirm(`Delete ${label}? This removes the record and the screenshot. The crafter's plan dates stay as they are.`)) return;
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
    <div className="pay-admin">
      <section className="pay-setup">
        <header className="pay-setup-head">
          <span className="eyebrow">THE DETAILS CRAFTERS SEE</span>
          <h2>How crafters pay you</h2>
          <p>
            Everything here appears on every crafter&apos;s plans page, next to the plan they want. Upload the QR code
            from your GCash, Maya, or bank app, and they scan it and send back a screenshot of the receipt.
          </p>
        </header>

        <form action={saveSettings} className="pay-setup-form">
          <div className="pay-setup-fields">
            <label className="field pay-field">
              Account name
              <input name="accountName" defaultValue={settings.accountName} maxLength={100} placeholder="Name on the account" />
            </label>
            <label className="field pay-field">
              GCash number
              <input name="gcashNumber" defaultValue={settings.gcashNumber} maxLength={40} placeholder="09xx xxx xxxx" />
            </label>
            <label className="field pay-field">
              Maya number
              <input name="mayaNumber" defaultValue={settings.mayaNumber} maxLength={40} placeholder="09xx xxx xxxx" />
            </label>
            <label className="field pay-field">
              Bank details
              <input name="bankDetails" defaultValue={settings.bankDetails} maxLength={300} placeholder="UB / BDO / BPI · account number" />
            </label>
            <label className="field pay-field pay-field-wide">
              Instructions for crafters
              <textarea
                name="instructions"
                defaultValue={settings.instructions}
                rows={3}
                maxLength={400}
                placeholder="For example: scan the QR, send the exact plan amount, then upload the receipt from your GCash app."
              />
            </label>
          </div>

          <aside className="pay-qr">
            <span className="pay-qr-label">Payment QR code</span>
            {settings.qrUrl ? (
              <ImageLightbox
                src={settings.qrUrl}
                alt="Your payment QR code"
                title="Payment QR code"
                subtitle="What crafters scan on their plans page"
                triggerClassName="pay-qr-preview"
                details={[
                  { label: "Account name", value: settings.accountName || "Not set" },
                  { label: "GCash", value: settings.gcashNumber || "Not set" },
                  { label: "Maya", value: settings.mayaNumber || "Not set" },
                  { label: "Bank", value: settings.bankDetails || "Not set" },
                ]}
              >
                <Image src={settings.qrUrl} alt="" width={240} height={240} unoptimized />
              </ImageLightbox>
            ) : (
              <div className={`pay-qr-preview pay-qr-preview-empty ${settings.qrMissing ? "is-missing" : ""}`}>
                {settings.qrMissing ? <AlertTriangle size={20} /> : <QrCode size={22} />}
                <span>{settings.qrMissing ? "The saved QR file went missing. Upload it again." : "No QR code yet"}</span>
              </div>
            )}
            <label className="pay-qr-pick">
              <Upload size={13} />
              {settings.qrUrl ? "Replace image" : "Choose an image"}
              <input type="file" name="qr" accept="image/jpeg,image/png,image/webp" />
            </label>
            {settings.qrUrl && (
              <button className="pay-qr-remove" type="button" onClick={removeQr} disabled={saving}>
                <Trash2 size={12} /> Delete QR
              </button>
            )}
            <p className="pay-qr-hint">PNG, JPEG, or WebP up to 4 MB. A square image from your payment app works best.</p>
          </aside>

          <div className="pay-setup-actions">
            <span className="pay-setup-hint">Crafters pay you directly. Nothing is charged automatically.</span>
            <button className="button button-primary" type="submit" disabled={saving}>
              <Save size={15} /> {saving ? "Saving…" : "Save payment details"}
            </button>
          </div>
        </form>

        {message && <p className="pay-notice pay-notice-ok" role="status"><Check size={14} /> {message}</p>}
        {error && <p className="pay-notice pay-notice-error" role="alert">{error}</p>}
      </section>

      <section className="pay-queue">
        <header className="pay-queue-head">
          <div>
            <span className="eyebrow">RENEWALS TO CHECK</span>
            <h2>Payment proofs</h2>
          </div>
          <div className="pay-queue-stats">
            <span className={`pay-stat ${pendingCount ? "is-due" : ""}`}><b>{pendingCount}</b> waiting</span>
            <span className="pay-stat"><b>{payments.length}</b> total</span>
          </div>
        </header>

        {payments.length ? (
          <ul className="pay-list">
            {payments.map((payment) => {
              const plan = getPlan(payment.plan);
              return (
                <li className={`pay-card status-${payment.status}`} key={payment.id}>
                  <div className="pay-card-proof">
                    {payment.hasProof ? (
                      <ImageLightbox
                        src={`/api/plan-payment-proof/${payment.id}`}
                        alt={`${payment.crafterName}'s ${plan.label} payment screenshot`}
                        title={`${payment.crafterName} · ${plan.label} payment proof`}
                        subtitle="The screenshot sent with this renewal payment"
                        details={[
                          { label: "Crafter", value: `${payment.crafterName} (${payment.crafterEmail})` },
                          { label: "Plan", value: `${plan.label} · ${formatPlanPrice(payment.amountMinor)}` },
                          { label: "Paid with", value: paymentMethodLabel(payment.method) },
                          { label: "Reference", value: payment.reference || "Not given" },
                          { label: "Sent", value: dateFormatter.format(new Date(payment.submittedAt)) },
                          { label: "Status", value: payment.status },
                        ]}
                      >
                        <Image src={`/api/plan-payment-proof/${payment.id}`} alt="" width={88} height={88} unoptimized />
                      </ImageLightbox>
                    ) : (
                      <span className="pay-card-proof-missing" title="No screenshot file was saved for this row"><ImageIcon size={18} /> No file</span>
                    )}
                  </div>

                  <div className="pay-card-body">
                    <div className="pay-card-who">
                      <b>{payment.crafterName}</b>
                      <small>{payment.crafterEmail}</small>
                    </div>
                    <dl className="pay-card-facts">
                      <div><dt>Plan</dt><dd>{plan.label} · {formatPlanPrice(payment.amountMinor)}</dd></div>
                      <div><dt>Paid with</dt><dd>{paymentMethodLabel(payment.method)}</dd></div>
                      <div><dt>Reference</dt><dd>{payment.reference || "Not given"}</dd></div>
                      <div><dt>Sent</dt><dd>{dateFormatter.format(new Date(payment.submittedAt))}</dd></div>
                    </dl>
                    {payment.note && <p className="pay-card-note">“{payment.note}”</p>}
                    {payment.status !== "pending" && (
                      <p className="pay-card-note pay-card-outcome">
                        {payment.status === "approved" ? "Renewed" : "Rejected"}
                        {payment.reviewedAt ? ` on ${shortDateFormatter.format(new Date(payment.reviewedAt))}` : ""}
                        {payment.adminNote ? ` · ${payment.adminNote}` : ""}
                      </p>
                    )}
                  </div>

                  <div className="pay-card-side">
                    <span className={`status-pill status-${payment.status}`}>
                      {payment.status === "pending" ? "Waiting" : payment.status === "approved" ? "Approved" : "Rejected"}
                    </span>
                    {payment.status === "pending" ? (
                      <form action={review} className="pay-review">
                        <input type="hidden" name="paymentId" value={payment.id} />
                        <input name="adminNote" maxLength={300} placeholder="Note (optional)" aria-label="Note for this payment" />
                        <div className="pay-review-actions">
                          <button className="pay-btn pay-btn-approve" type="submit" name="decision" value="approve" disabled={reviewing}>
                            <Check size={13} /> Approve &amp; renew
                          </button>
                          <button className="pay-btn pay-btn-reject" type="submit" name="decision" value="reject" disabled={reviewing}>
                            <X size={13} /> Reject
                          </button>
                        </div>
                      </form>
                    ) : (
                      <button className="pay-btn pay-btn-quiet" type="button" onClick={() => removePayment(payment)} disabled={reviewing && deletingId === payment.id}>
                        <Trash2 size={12} /> {deletingId === payment.id ? "Deleting…" : "Delete"}
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="pay-empty">No payment proofs yet. A crafter sends one from the plans page after paying with GCash, Maya, or a bank transfer.</p>
        )}
      </section>

      <section className="pay-methods">
        <span className="eyebrow">ACCEPTED METHODS</span>
        <ul>
          {PLAN_PAYMENT_METHODS.map((method) => <li key={method.key}>{method.label}</li>)}
        </ul>
        <p>Approving a proof starts a fresh term from today, or from the current end date when the plan is still active.</p>
      </section>
    </div>
  );
}
