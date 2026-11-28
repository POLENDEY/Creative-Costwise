"use client";

import { userFacingError } from "@/lib/user-facing-error";

import { useMemo, useState } from "react";
import { savePromotion } from "@/actions/catalog";
import { discountAmount } from "@/lib/orders";
import { formatMoney, parseMoneyToMinor, type Currency } from "@/lib/money";

type PromotionRow = { id: string; code: string; originalMinor: number; discountMinor: number; saleMinor: number; note: string; upcomingNote: string };

export function PromotionDesk({ promotions, currency }: { promotions: PromotionRow[]; currency: Currency }) {
  const [original, setOriginal] = useState("");
  const [kind, setKind] = useState<"percent" | "fixed">("percent");
  const [value, setValue] = useState("10");
  const [code, setCode] = useState("");
  const [note, setNote] = useState("");
  const [upcomingNote, setUpcomingNote] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const preview = useMemo(() => {
    const originalMinor = parseMoneyToMinor(original);
    if (originalMinor === null) return null;
    try {
      return kind === "percent"
        ? discountAmount(originalMinor, "percent", Number(value))
        : discountAmount(originalMinor, "fixed", parseMoneyToMinor(value) ?? -1);
    } catch {
      return null;
    }
  }, [kind, original, value]);

  return <div className="stack-sections">
    <section className="panel">
      <div className="panel-heading"><div><span className="eyebrow">CALCULATOR</span><h2>Price after a discount</h2></div></div>
      <form className="form-grid" onSubmit={async (event) => {
        event.preventDefault();
        const originalMinor = parseMoneyToMinor(original);
        if (originalMinor === null) {
          setError("Enter the original price.");
          return;
        }
        setPending(true);
        setError("");
        try {
          await savePromotion({
            code,
            originalMinor,
            kind,
            percent: kind === "percent" ? Number(value) : undefined,
            fixedMinor: kind === "fixed" ? parseMoneyToMinor(value) ?? undefined : undefined,
            note,
            upcomingNote,
          });
          setCode("");
          setNote("");
          setUpcomingNote("");
        } catch (cause) {
          setError(userFacingError(cause, "Could not save this promotion."));
        } finally {
          setPending(false);
        }
      }}>
        <label className="field">Original price ({currency})<input value={original} onChange={(event) => setOriginal(event.target.value)} inputMode="decimal" required /></label>
        <label className="field">Discount type
          <select value={kind} onChange={(event) => setKind(event.target.value as "percent" | "fixed")}>
            <option value="percent">Percent</option>
            <option value="fixed">Fixed amount</option>
          </select>
        </label>
        <label className="field">{kind === "percent" ? "Percent off" : `Amount off (${currency})`}<input value={value} onChange={(event) => setValue(event.target.value)} inputMode="decimal" required /></label>
        <label className="field">Code<input value={code} onChange={(event) => setCode(event.target.value)} maxLength={40} placeholder="Optional" /></label>
        <label className="field field-span-2">Note<textarea value={note} onChange={(event) => setNote(event.target.value)} maxLength={300} rows={2} /></label>
        <label className="field field-span-2">Upcoming promotion<textarea value={upcomingNote} onChange={(event) => setUpcomingNote(event.target.value)} maxLength={300} rows={2} /></label>
        {preview && <p className="field-span-2"><b>Sale price {formatMoney(preview.saleMinor, currency)}</b> <span className="muted">Discount {formatMoney(preview.discountMinor, currency)}</span></p>}
        {error && <p className="form-error field-span-2" role="alert">{error}</p>}
        <div className="form-actions"><span>A percent discount stays between 0 and 100. A fixed discount cannot pass the original price.</span><button className="button button-primary" type="submit" disabled={pending}>{pending ? "Saving…" : "Save promotion"}</button></div>
      </form>
    </section>
    <section className="panel">
      <div className="panel-heading"><div><span className="eyebrow">SAVED</span><h2>Promotions</h2><p>Every sale price you keep, with the code that unlocks it.</p></div></div>
      {promotions.length ? <ul className="promo-grid">{promotions.map((promotion) => {
        const percent = promotion.originalMinor > 0 ? Math.round((promotion.discountMinor / promotion.originalMinor) * 100) : 0;
        return <li className="promo-card" key={promotion.id}>
          <div className="promo-card-head">
            <span className="promo-code">{promotion.code || "No code"}</span>
            <span className="promo-off">−{percent}%</span>
          </div>
          <div className="promo-prices">
            <s>{formatMoney(promotion.originalMinor, currency)}</s>
            <b>{formatMoney(promotion.saleMinor, currency)}</b>
          </div>
          <small className="promo-saves">Customer saves {formatMoney(promotion.discountMinor, currency)}</small>
          {promotion.note && <p className="promo-note">{promotion.note}</p>}
          {promotion.upcomingNote && <p className="promo-note promo-note-upcoming">Upcoming · {promotion.upcomingNote}</p>}
        </li>;
      })}</ul> : <p className="empty-copy">A saved promotion keeps the sale price you calculated.</p>}
    </section>
  </div>;
}
