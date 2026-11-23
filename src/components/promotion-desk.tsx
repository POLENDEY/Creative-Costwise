"use client";

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
          setError(cause instanceof Error ? cause.message : "Could not save this promotion.");
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
      <div className="panel-heading"><div><span className="eyebrow">SAVED</span><h2>Promotions</h2></div></div>
      {promotions.length ? <ul className="movement-list">{promotions.map((promotion) => <li key={promotion.id}><b>{promotion.code || "No code"}</b><span>{formatMoney(promotion.originalMinor, currency)} → {formatMoney(promotion.saleMinor, currency)}</span><small>Discount {formatMoney(promotion.discountMinor, currency)}{promotion.note ? ` · ${promotion.note}` : ""}{promotion.upcomingNote ? ` · Upcoming: ${promotion.upcomingNote}` : ""}</small></li>)}</ul> : <p className="empty-copy">A saved promotion keeps the sale price you calculated.</p>}
    </section>
  </div>;
}
