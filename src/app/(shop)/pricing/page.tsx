import Image from "next/image";
import { Check, CreditCard, Lock, QrCode, Sparkles } from "lucide-react";
import { requireCrafter } from "@/lib/session";
import { formatPlanDate, PLAN_FEATURES } from "@/lib/plan-features";
import {
  formatPlanPrice,
  getPlan,
  PLAN_KEYS,
  planBillingLine,
  planExpiry,
  planFromPrices,
  planMonthlyMinor,
  planSavingsPercent,
} from "@/lib/plans";
import { getPlanCatalog } from "@/lib/plan-catalog";
import { PlanPaymentForm } from "@/components/plan-payment-form";
import { paymentMethodLabel } from "@/lib/plan-payment-options";
import { getPlanPaymentDetails, getPlanPaymentsForUser, hasPlanPaymentDetails } from "@/lib/plan-payments";
import { withDatabasePage } from "@/lib/with-database-page";

const freeFeatures = ["Overview", "Materials", "Print hub", "Customers", "Settings", "Guide & FAQs"];

const paymentStatusLabels: Record<string, string> = {
  pending: "Waiting for your admin to check it",
  approved: "Approved — plan renewed",
  rejected: "Not accepted",
};

async function PricingPage() {
  const user = await requireCrafter();
  const prices = await getPlanCatalog();
  const currentPlan = planFromPrices(user.plan, prices);
  const endsOn = formatPlanDate(user.expiresAt);
  const today = new Date();
  const [paymentDetails, payments] = await Promise.all([
    getPlanPaymentDetails(),
    getPlanPaymentsForUser(user.id),
  ]);

  return (
    <div className="pricing-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">PLANS &amp; PRICING</span>
          <h1>One toolkit, <em>one clear price.</em></h1>
          <p>Every plan opens the full costing toolkit for one shop. Pick the billing period that suits how you work, pay online, and your toolkit admin switches the plan once the payment is checked.</p>
        </div>
      </div>

      <section className="pricing-current">
        <span className="pricing-current-icon"><CreditCard size={17} /></span>
        <div>
          <b>You are on the {currentPlan.label} plan</b>
          <small>
            {planBillingLine(currentPlan.key, prices)}
            {endsOn ? ` · access ${user.access.limited ? "ended" : "runs to"} ${endsOn}` : ""}
          </small>
        </div>
      </section>

      <div className="pricing-grid">
        {PLAN_KEYS.map((key) => {
          const plan = planFromPrices(key, prices);
          const savings = planSavingsPercent(key, prices);
          const active = user.plan === key;
          return (
            <article className={`pricing-card ${active ? "pricing-card-active" : ""}`} key={key}>
              <header>
                <h2>{plan.label}</h2>
                {plan.badge && <span className="pricing-badge">{plan.badge}</span>}
              </header>
              <div className="pricing-price">
                <b>{formatPlanPrice(plan.priceMinor)}</b>
                <span>{plan.cadence}</span>
              </div>
              <p className="pricing-permonth">
                ≈ {formatPlanPrice(planMonthlyMinor(key, prices))} per month
                {savings > 0 ? ` · save ${savings}%` : " · no long commitment"}
              </p>
              <p className="pricing-summary">{plan.summary}</p>
              <p className="pricing-expiry">
                Start today and your access runs to <b>{formatPlanDate(planExpiry(key, today))}</b>
              </p>
              <ul className="pricing-features">
                {Object.values(PLAN_FEATURES).map((feature) => (
                  <li key={feature.label}><Check size={13} aria-hidden="true" /> {feature.label}</li>
                ))}
              </ul>
              <span className={`pricing-plan-state ${active ? "is-active" : ""}`}>
                {active ? "Your current plan" : `Pay for ${plan.label} below`}
              </span>
            </article>
          );
        })}
      </div>

      <section className="panel plan-pay" id="renew">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">PAY &amp; RENEW</span>
            <h2>Pay with GCash, Maya, or your bank</h2>
            <p>Scan the payment QR code or use the account details, send the exact amount for your plan, then upload a screenshot of the receipt. Your admin is notified right away.</p>
          </div>
        </div>

        <div className="plan-pay-grid">
          <div className="plan-pay-details">
            {paymentDetails.qrPath ? (
              <Image className="plan-pay-qr" src={paymentDetails.qrPath} alt="Scan this QR code to pay" width={168} height={168} />
            ) : (
              <span className="plan-pay-qr-empty"><QrCode size={20} /> QR code not added yet</span>
            )}
            {hasPlanPaymentDetails(paymentDetails) ? (
              <dl className="plan-pay-list">
                {paymentDetails.accountName && <div><dt>Account name</dt><dd>{paymentDetails.accountName}</dd></div>}
                {paymentDetails.gcashNumber && <div><dt>GCash</dt><dd>{paymentDetails.gcashNumber}</dd></div>}
                {paymentDetails.mayaNumber && <div><dt>Maya</dt><dd>{paymentDetails.mayaNumber}</dd></div>}
                {paymentDetails.bankDetails && <div><dt>Bank transfer</dt><dd>{paymentDetails.bankDetails}</dd></div>}
              </dl>
            ) : (
              <p className="plan-pay-note">Your admin has not added the payment details yet. Ask them for the GCash, Maya, or bank account to pay, then upload the screenshot here.</p>
            )}
            {paymentDetails.instructions && <p className="plan-pay-note">{paymentDetails.instructions}</p>}
          </div>

          <PlanPaymentForm
            defaultPlan={currentPlan.key}
            plans={PLAN_KEYS.map((key) => {
              const plan = planFromPrices(key, prices);
              return {
                key,
                label: plan.label,
                price: formatPlanPrice(plan.priceMinor),
                cadence: plan.cadence,
                priceMinor: plan.priceMinor,
              };
            })}
          />
        </div>

        {payments.length > 0 && (
          <ul className="plan-pay-history">
            {payments.map((payment) => (
              <li key={payment.id}>
                <b>{getPlan(payment.plan).label}</b>
                <span>{formatPlanPrice(payment.amountMinor)}</span>
                <small>{paymentMethodLabel(payment.method)} · sent {formatPlanDate(payment.submittedAt)}</small>
                <span className={`status-pill status-${payment.status}`}>
                  {paymentStatusLabels[payment.status] ?? payment.status}
                </span>
                {payment.adminNote && <small>Admin note: {payment.adminNote}</small>}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="panel pricing-free">
        <div>
          <span className="eyebrow">ALWAYS INCLUDED</span>
          <h2>Your workspace stays open</h2>
          <p>
            Materials, printers, customers and your settings are never locked, even when a plan ends. Only the
            costing and selling tools listed on each plan need an active plan.
          </p>
        </div>
        <ul className="pricing-free-list">
          {freeFeatures.map((feature) => <li key={feature}><Sparkles size={12} aria-hidden="true" /> {feature}</li>)}
        </ul>
      </section>

      <p className="pricing-footnote">
        <Lock size={13} aria-hidden="true" />
        Prices are in Philippine pesos and billed for the whole period shown. Nothing is charged automatically from
        this page, and your login, materials and saved prices stay exactly as they are when you switch or renew. Your
        current plan is {currentPlan.label}.
      </p>
    </div>
  );
}

export default withDatabasePage(PricingPage);
