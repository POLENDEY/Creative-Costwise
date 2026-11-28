"use client";

import { userFacingError } from "@/lib/user-facing-error";

import { useState } from "react";
import { recordPrinterSupplyPurchase } from "@/actions/print-hub";
import { PAYMENT_METHODS } from "@/lib/inventory";
import type { Currency } from "@/lib/money";

const paymentLabels: Record<(typeof PAYMENT_METHODS)[number], string> = {
  cash: "Cash",
  gcash: "GCash",
  bank: "Bank transfer",
  card: "Card",
  other: "Other",
};

export function SupplyPurchaseForm({ currency }: { currency: Currency }) {
  const [requestKey, setRequestKey] = useState(() => crypto.randomUUID());
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  return <form className="form-grid" action={async (formData) => {
    setError("");
    setPending(true);
    formData.set("requestKey", requestKey);
    try {
      await recordPrinterSupplyPurchase(formData);
      setRequestKey(crypto.randomUUID());
    } catch (cause) {
      setError(userFacingError(cause, "Could not record that purchase."));
    } finally {
      setPending(false);
    }
  }}>
    <label className="field field-span-2">Supply name<input name="name" placeholder="e.g. Photo paper" required maxLength={100} /></label>
    <label className="field">Amount spent ({currency})<input name="amount" type="number" min="0" step="0.01" required /></label>
    <label className="field">Paid with<select name="paymentMethod" defaultValue="cash">{PAYMENT_METHODS.map((method) => <option value={method} key={method}>{paymentLabels[method]}</option>)}</select></label>
    <label className="field field-span-2">Supplier link<input name="supplierUrl" type="url" placeholder="https://" /></label>
    {error && <p className="form-error field-span-2" role="alert">{error}</p>}
    <div className="form-actions"><span>Saving the same request again does not add a second expense.</span><button className="button button-primary" type="submit" disabled={pending}>{pending ? "Saving…" : "Record purchase"}</button></div>
  </form>;
}
