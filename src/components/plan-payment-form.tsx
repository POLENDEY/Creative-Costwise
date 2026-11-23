"use client";

import { useRef, useState, useTransition } from "react";
import { Upload } from "lucide-react";
import { submitPlanPayment } from "@/actions/plan-payments";
import { PLAN_PAYMENT_METHODS } from "@/lib/plan-payment-options";
import { formatPlanDate } from "@/lib/plan-features";
import { formatPlanPrice, getPlan, planExpiry } from "@/lib/plans";

type PlanOption = { key: string; label: string; price: string; cadence: string };

export function PlanPaymentForm({
  plans,
  defaultPlan,
}: {
  plans: PlanOption[];
  defaultPlan: string;
}) {
  const [plan, setPlan] = useState(defaultPlan);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const definition = getPlan(plan);
  const endsOn = formatPlanDate(planExpiry(plan));

  function submit(formData: FormData) {
    setError("");
    setMessage("");
    startTransition(async () => {
      try {
        const result = await submitPlanPayment(formData);
        formRef.current?.reset();
        setPlan(defaultPlan);
        setMessage(`Payment proof for the ${result.plan} plan sent. ${result.note}`);
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : "The payment proof could not be sent.");
      }
    });
  }

  return (
    <form ref={formRef} action={submit} className="plan-pay-form">
      <div className="form-grid">
        <label className="field">
          Plan
          <select name="plan" value={plan} onChange={(event) => setPlan(event.target.value)}>
            {plans.map((option) => (
              <option key={option.key} value={option.key}>
                {option.label} · {option.price} {option.cadence}
              </option>
            ))}
          </select>
          <small className="plan-expiry-preview">
            A {definition.label.toLowerCase()} payment runs {definition.months} month
            {definition.months === 1 ? "" : "s"} and would end <b>{endsOn}</b>
            {definition.priceMinor ? ` · ${formatPlanPrice(definition.priceMinor)} in total` : ""}
          </small>
        </label>
        <label className="field">
          Payment method
          <select name="method" defaultValue="gcash">
            {PLAN_PAYMENT_METHODS.map((method) => (
              <option key={method.key} value={method.key}>{method.label}</option>
            ))}
          </select>
        </label>
        <label className="field">
          Reference number (optional)
          <input name="reference" maxLength={80} placeholder="GCash/Maya reference or bank transaction number" />
        </label>
        <label className="field">
          Note to your admin (optional)
          <input name="note" maxLength={300} placeholder="For example: paid from my number ending 1234" />
        </label>
        <label className="field field-span-2">
          Screenshot of the payment
          <input type="file" name="proof" accept="image/jpeg,image/png,image/webp" required />
        </label>
      </div>
      <div className="form-actions">
        <span>Screenshot only — JPEG, PNG, or WebP up to 10 MB. Only you and the admin can open it.</span>
        <button className="button button-primary" type="submit" disabled={pending}>
          <Upload size={15} /> {pending ? "Sending…" : "Send payment proof"}
        </button>
      </div>
      {message && <p className="renewal-reminder-result" role="status">{message}</p>}
      {error && <p className="form-error" role="alert">{error}</p>}
    </form>
  );
}
