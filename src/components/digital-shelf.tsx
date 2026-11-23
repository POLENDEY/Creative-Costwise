"use client";

import { useState } from "react";
import { saveDigitalProduct } from "@/actions/catalog";
import { formatMoney, parseMoneyToMinor, type Currency } from "@/lib/money";

type DigitalRow = { id: string; name: string; priceMinor: number; url: string };

export function DigitalShelf({ products, currency }: { products: DigitalRow[]; currency: Currency }) {
  const [copied, setCopied] = useState("");
  const [error, setError] = useState("");

  async function copy(url: string, id: string) {
    await navigator.clipboard.writeText(url);
    setCopied(id);
  }

  return <div className="stack-sections">
    <section className="panel">
      <div className="panel-heading"><div><span className="eyebrow">LINKS</span><h2>Digital products</h2></div></div>
      {error && <p className="form-error" role="alert">{error}</p>}
      {products.length ? <ul className="movement-list">{products.map((product) => <li key={product.id}>
        <div><b>{product.name}</b><small>{formatMoney(product.priceMinor, currency)}</small></div>
        <a href={product.url} target="_blank" rel="noreferrer">Open link</a>
        <button type="button" className="button button-secondary" onClick={() => void copy(product.url, product.id)}>{copied === product.id ? "Copied" : "Copy link"}</button>
        <details><summary>Edit</summary><DigitalForm currency={currency} product={product} onError={setError} /></details>
      </li>)}</ul> : <p className="empty-copy">Add a name, a price, and the Canva or Drive link. The file stays where you host it.</p>}
    </section>
    <section className="panel">
      <div className="panel-heading"><div><span className="eyebrow">NEW</span><h2>Add a digital product</h2></div></div>
      <DigitalForm currency={currency} onError={setError} />
    </section>
  </div>;
}

function DigitalForm({ currency, product, onError }: { currency: Currency; product?: DigitalRow; onError: (message: string) => void }) {
  const [name, setName] = useState(product?.name ?? "");
  const [price, setPrice] = useState(product ? (product.priceMinor / 100).toFixed(2) : "");
  const [url, setUrl] = useState(product?.url ?? "");
  const [pending, setPending] = useState(false);

  return <form className="form-grid" onSubmit={async (event) => {
    event.preventDefault();
    const priceMinor = parseMoneyToMinor(price);
    if (priceMinor === null) {
      onError("Enter the price.");
      return;
    }
    setPending(true);
    onError("");
    try {
      await saveDigitalProduct({ id: product?.id, name, priceMinor, url });
    } catch (cause) {
      onError(cause instanceof Error ? cause.message : "Could not save this digital product.");
    } finally {
      setPending(false);
    }
  }}>
    <label className="field">Name<input value={name} onChange={(event) => setName(event.target.value)} required maxLength={120} /></label>
    <label className="field">Price ({currency})<input value={price} onChange={(event) => setPrice(event.target.value)} inputMode="decimal" required /></label>
    <label className="field field-span-2">Link<input value={url} onChange={(event) => setUrl(event.target.value)} type="url" required placeholder="https://" /></label>
    <div className="form-actions"><span>Orders copy this price when the line is saved.</span><button className="button button-primary" type="submit" disabled={pending}>{pending ? "Saving…" : "Save digital product"}</button></div>
  </form>;
}
