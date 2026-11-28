"use client";

import { userFacingError } from "@/lib/user-facing-error";

import { useMemo, useState } from "react";
import { saveBundle } from "@/actions/catalog";
import { calculateBundle } from "@/lib/bundle";
import { formatMoney, parseMoneyToMinor, type Currency } from "@/lib/money";

type ProductOption = { id: string; name: string; retailPriceMinor: number; productionCostMinor: number };
type BundleRecord = { id: string; name: string; priceMinor: number; items: { priceSetId: string; quantity: number }[] };

export function BundleStudio({ products, bundles, currency }: { products: ProductOption[]; bundles: BundleRecord[]; currency: Currency }) {
  return <div className="stack-sections">
    {bundles.length > 0 && <section className="panel">
      <div className="panel-heading"><div><span className="eyebrow">SAVED BUNDLES</span><h2>Offers you can sell</h2><p>Each bundle keeps its price, its products, and the saving it gives a customer.</p></div></div>
      <ul className="saved-offers">{bundles.map((bundle) => {
        const totals = describeBundle(bundle, products);
        const count = bundle.items.reduce((carry, item) => carry + item.quantity, 0);
        return <li className="saved-offer" key={bundle.id}>
          <div className="saved-offer-main">
            <b>{bundle.name}</b>
            <small>{count} product{count === 1 ? "" : "s"} · regular {formatMoney(totals?.regularMinor ?? 0, currency)}</small>
            {totals?.belowCost && <span className="saved-offer-warn">Below production cost</span>}
          </div>
          <div className="saved-offer-price">
            <b>{formatMoney(bundle.priceMinor, currency)}</b>
            <small>Saves {formatMoney(totals?.savingsMinor ?? 0, currency)}</small>
          </div>
          <details className="saved-offer-edit"><summary className="button button-secondary">Edit</summary><BundleForm products={products} currency={currency} bundle={bundle} /></details>
        </li>;
      })}</ul>
    </section>}
    <section className="panel">
      <div className="panel-heading"><div><span className="eyebrow">NEW BUNDLE</span><h2>Combine products</h2></div></div>
      {products.length ? <BundleForm products={products} currency={currency} /> : <p className="empty-copy">Save a price set before building a bundle.</p>}
    </section>
  </div>;
}

function describeBundle(bundle: BundleRecord, products: ProductOption[]) {
  try {
    return calculateBundle({
      bundlePriceMinor: bundle.priceMinor,
      items: bundle.items.map((item) => {
        const product = products.find((option) => option.id === item.priceSetId);
        return {
          regularPriceMinor: product?.retailPriceMinor ?? 0,
          productionCostMinor: product?.productionCostMinor ?? 0,
          quantity: item.quantity,
        };
      }),
    });
  } catch {
    return null;
  }
}

function BundleForm({ products, currency, bundle }: { products: ProductOption[]; currency: Currency; bundle?: BundleRecord }) {
  const [name, setName] = useState(bundle?.name ?? "");
  const [price, setPrice] = useState(bundle ? (bundle.priceMinor / 100).toFixed(2) : "");
  const [items, setItems] = useState(bundle?.items.map((item) => ({ priceSetId: item.priceSetId, quantity: String(item.quantity) })) ?? [{ priceSetId: products[0]?.id ?? "", quantity: "1" }]);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const preview = useMemo(() => {
    const priceMinor = parseMoneyToMinor(price);
    if (priceMinor === null) return null;
    try {
      return calculateBundle({
        bundlePriceMinor: priceMinor,
        items: items.map((item) => {
          const product = products.find((option) => option.id === item.priceSetId);
          return {
            regularPriceMinor: product?.retailPriceMinor ?? 0,
            productionCostMinor: product?.productionCostMinor ?? 0,
            quantity: Number(item.quantity),
          };
        }),
      });
    } catch {
      return null;
    }
  }, [items, price, products]);

  return <form className="form-grid" onSubmit={async (event) => {
    event.preventDefault();
    const priceMinor = parseMoneyToMinor(price);
    if (priceMinor === null) {
      setError("Enter the bundle price.");
      return;
    }
    setPending(true);
    setError("");
    try {
      await saveBundle({
        id: bundle?.id,
        name,
        priceMinor,
        items: items.map((item) => ({ priceSetId: item.priceSetId, quantity: Number(item.quantity) })),
      });
    } catch (cause) {
      setError(userFacingError(cause, "Could not save this bundle."));
    } finally {
      setPending(false);
    }
  }}>
    <label className="field field-span-2">Bundle name<input value={name} onChange={(event) => setName(event.target.value)} required maxLength={100} /></label>
    {items.map((item, index) => <div className="form-grid-section" key={`${item.priceSetId}-${index}`}>
      <label className="field">Product
        <select value={item.priceSetId} onChange={(event) => setItems((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, priceSetId: event.target.value } : row))}>
          {products.map((product) => <option value={product.id} key={product.id}>{product.name} · {formatMoney(product.retailPriceMinor, currency)}</option>)}
        </select>
      </label>
      <label className="field">Quantity<input value={item.quantity} onChange={(event) => setItems((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, quantity: event.target.value } : row))} inputMode="decimal" required /></label>
    </div>)}
    <div className="form-actions"><button type="button" className="button button-secondary" onClick={() => setItems((current) => [...current, { priceSetId: products[0]?.id ?? "", quantity: "1" }])}>Add product</button></div>
    <label className="field">Bundle price ({currency})<input value={price} onChange={(event) => setPrice(event.target.value)} inputMode="decimal" required /></label>
    {preview && <p className="field-span-2"><b>Profit {formatMoney(preview.profitMinor, currency)}</b> <span className="muted">Regular {formatMoney(preview.regularMinor, currency)} · Cost {formatMoney(preview.costMinor, currency)} · Customer saves {formatMoney(preview.savingsMinor, currency)}</span>{preview.belowCost && <small className="form-error"> This price is below the production cost.</small>}</p>}
    {error && <p className="form-error field-span-2" role="alert">{error}</p>}
    <div className="form-actions"><span>The regular price uses each product’s retail price.</span><button className="button button-primary" type="submit" disabled={pending}>{pending ? "Saving…" : "Save bundle"}</button></div>
  </form>;
}
