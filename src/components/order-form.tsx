"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { saveOrder } from "@/actions/orders";
import { discountAmount, DELIVERY_METHODS, orderTotals, PAYMENT_STATUSES } from "@/lib/orders";
import { formatMoney, parseMoneyToMinor, type Currency } from "@/lib/money";

type CustomerOption = { id: string; name: string; phone: string; email: string; address: string };
type ProductOption = { id: string; name: string; category: string; retailPriceMinor: number; bulkPriceMinor: number };
type BundleOption = { id: string; name: string; priceMinor: number };
type DigitalOption = { id: string; name: string; priceMinor: number };
type LineKind = "product" | "bundle" | "digital";
type LineDraft = {
  kind: LineKind;
  priceSetId: string;
  sourceId: string;
  priceOption: "retail" | "bulk";
  quantity: string;
  storedKind?: LineKind;
  storedPriceSetId?: string;
  storedSourceId?: string;
  storedOption?: "retail" | "bulk";
  storedUnitPriceMinor?: number;
};

export type OrderFormValues = {
  id?: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  customerAddress: string;
  paymentStatus: string;
  deliveryMethod: string;
  dueOn: string;
  followUpOn: string;
  note: string;
  discountKind: "percent" | "fixed";
  discountValue: string;
  shipping: string;
  lines: { kind?: LineKind; priceSetId: string; sourceId?: string; priceOption: "retail" | "bulk"; quantity: number; unitPriceMinor?: number }[];
};

export function OrderForm({
  customers,
  products,
  bundles = [],
  digitals = [],
  currency,
  initial,
  submitLabel,
}: {
  customers: CustomerOption[];
  products: ProductOption[];
  bundles?: BundleOption[];
  digitals?: DigitalOption[];
  currency: Currency;
  initial?: OrderFormValues;
  submitLabel: string;
}) {
  const router = useRouter();
  const [customerId, setCustomerId] = useState(initial?.customerId ?? "");
  const [customerName, setCustomerName] = useState(initial?.customerName ?? "");
  const [customerPhone, setCustomerPhone] = useState(initial?.customerPhone ?? "");
  const [customerEmail, setCustomerEmail] = useState(initial?.customerEmail ?? "");
  const [customerAddress, setCustomerAddress] = useState(initial?.customerAddress ?? "");
  const [paymentStatus, setPaymentStatus] = useState(initial?.paymentStatus ?? "unpaid");
  const [deliveryMethod, setDeliveryMethod] = useState(initial?.deliveryMethod ?? "pickup");
  const [dueOn, setDueOn] = useState(initial?.dueOn ?? "");
  const [followUpOn, setFollowUpOn] = useState(initial?.followUpOn ?? "");
  const [note, setNote] = useState(initial?.note ?? "");
  const [discountKind] = useState<"percent" | "fixed">(initial?.discountKind ?? "percent");
  const [discountValue, setDiscountValue] = useState(initial?.discountValue ?? "0");
  const [shipping, setShipping] = useState(initial?.shipping ?? "0");
  const [lines, setLines] = useState<LineDraft[]>(
    initial?.lines.map((line) => ({
      kind: line.kind ?? "product",
      priceSetId: line.priceSetId,
      sourceId: line.sourceId ?? "",
      priceOption: line.priceOption,
      quantity: String(line.quantity),
      storedKind: line.kind ?? "product",
      storedPriceSetId: line.priceSetId,
      storedSourceId: line.sourceId ?? "",
      storedOption: line.priceOption,
      storedUnitPriceMinor: line.unitPriceMinor,
    })) ?? [
      { kind: "product" as const, priceSetId: products[0]?.id ?? "", sourceId: "", priceOption: "retail" as const, quantity: "1" },
    ],
  );
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  const preview = useMemo(() => {
    try {
      const priced = lines.map((line) => {
        const unchanged = line.storedUnitPriceMinor !== undefined
          && line.kind === line.storedKind
          && line.priceSetId === line.storedPriceSetId
          && line.sourceId === line.storedSourceId
          && line.priceOption === line.storedOption;
        const product = products.find((item) => item.id === line.priceSetId);
        const unit = unchanged
          ? line.storedUnitPriceMinor!
          : line.kind === "bundle"
            ? bundles.find((item) => item.id === line.sourceId)?.priceMinor ?? 0
            : line.kind === "digital"
              ? digitals.find((item) => item.id === line.sourceId)?.priceMinor ?? 0
              : line.priceOption === "bulk" ? product?.bulkPriceMinor ?? 0 : product?.retailPriceMinor ?? 0;
        return { unitPriceMinor: unit, quantity: Number(line.quantity) };
      });
      const subtotal = orderTotals({ lines: priced, discountMinor: 0, shippingMinor: 0 }).subtotalMinor;
      const discountMinor = discountKind === "percent"
        ? discountAmount(subtotal, "percent", Number(discountValue || "0")).discountMinor
        : parseMoneyToMinor(discountValue) ?? 0;
      return orderTotals({ lines: priced, discountMinor, shippingMinor: parseMoneyToMinor(shipping) ?? 0 });
    } catch {
      return null;
    }
  }, [bundles, digitals, discountKind, discountValue, lines, products, shipping]);

  function chooseCustomer(id: string) {
    setCustomerId(id);
    const customer = customers.find((item) => item.id === id);
    if (!customer) return;
    setCustomerName(customer.name);
    setCustomerPhone(customer.phone);
    setCustomerEmail(customer.email);
    setCustomerAddress(customer.address);
  }

  return <form className="form-grid" onSubmit={async (event) => {
    event.preventDefault();
    setError("");
    setPending(true);
    try {
      const saved = await saveOrder({
        id: initial?.id,
        customerId: customerId || undefined,
        customerName,
        customerPhone,
        customerEmail,
        customerAddress,
        paymentStatus,
        deliveryMethod,
        dueOn,
        followUpOn,
        note,
        discountKind,
        discountValue,
        shipping,
        lines: lines.map((line) => ({
          kind: line.kind,
          priceSetId: line.priceSetId,
          sourceId: line.sourceId,
          priceOption: line.priceOption,
          quantity: Number(line.quantity),
        })),
      });
      router.push(`/orders/${saved.id}`);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save this order.");
    } finally {
      setPending(false);
    }
  }}>
    <label className="field field-span-2">Saved customer
      <select value={customerId} onChange={(event) => chooseCustomer(event.target.value)}>
        <option value="">Type the details below</option>
        {customers.map((customer) => <option value={customer.id} key={customer.id}>{customer.name}</option>)}
      </select>
    </label>
    <label className="field">Name<input value={customerName} onChange={(event) => setCustomerName(event.target.value)} required maxLength={120} /></label>
    <label className="field">Phone<input value={customerPhone} onChange={(event) => setCustomerPhone(event.target.value)} maxLength={40} /></label>
    <label className="field">Email<input value={customerEmail} onChange={(event) => setCustomerEmail(event.target.value)} type="email" maxLength={120} /></label>
    <label className="field">Address<input value={customerAddress} onChange={(event) => setCustomerAddress(event.target.value)} maxLength={300} /></label>
    {lines.map((line, index) => <div className="form-grid-section" key={`${line.kind}-${line.priceSetId}-${line.sourceId}-${index}`}>
      <label className="field">Line
        <select value={line.kind} onChange={(event) => {
          const kind = event.target.value as LineKind;
          setLines((current) => current.map((item, itemIndex) => itemIndex === index ? {
            ...item,
            kind,
            priceSetId: kind === "product" ? products[0]?.id ?? "" : "",
            sourceId: kind === "bundle" ? bundles[0]?.id ?? "" : kind === "digital" ? digitals[0]?.id ?? "" : "",
            priceOption: "retail",
          } : item));
        }}>
          <option value="product">Product</option>
          <option value="bundle">Bundle</option>
          <option value="digital">Digital</option>
        </select>
      </label>
      {line.kind === "product" && <label className="field">Product
        <select value={line.priceSetId} onChange={(event) => setLines((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, priceSetId: event.target.value } : item))}>
          {products.map((product) => <option value={product.id} key={product.id}>{product.category} · {product.name}</option>)}
        </select>
      </label>}
      {line.kind === "bundle" && <label className="field">Bundle
        <select value={line.sourceId} onChange={(event) => setLines((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, sourceId: event.target.value } : item))}>
          {bundles.map((bundle) => <option value={bundle.id} key={bundle.id}>{bundle.name}</option>)}
        </select>
      </label>}
      {line.kind === "digital" && <label className="field">Digital product
        <select value={line.sourceId} onChange={(event) => setLines((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, sourceId: event.target.value } : item))}>
          {digitals.map((digital) => <option value={digital.id} key={digital.id}>{digital.name}</option>)}
        </select>
      </label>}
      {line.kind === "product" && <label className="field">Price
        <select value={line.priceOption} onChange={(event) => setLines((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, priceOption: event.target.value as "retail" | "bulk" } : item))}>
          <option value="retail">Retail</option>
          <option value="bulk">Bulk</option>
        </select>
      </label>}
      <label className="field">Quantity<input value={line.quantity} onChange={(event) => setLines((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, quantity: event.target.value } : item))} inputMode="decimal" required /></label>
    </div>)}
    <div className="form-actions">
      <button type="button" className="button button-secondary" onClick={() => setLines((current) => [...current, { kind: "product", priceSetId: products[0]?.id ?? "", sourceId: "", priceOption: "retail", quantity: "1" }])}>Add line</button>
    </div>
    <label className="field">{discountKind === "percent" ? "Discount percent" : `Discount (${currency})`}<input value={discountValue} onChange={(event) => setDiscountValue(event.target.value)} inputMode="decimal" /></label>
    <label className="field">Shipping ({currency})<input value={shipping} onChange={(event) => setShipping(event.target.value)} inputMode="decimal" /></label>
    <label className="field">Payment<select value={paymentStatus} onChange={(event) => setPaymentStatus(event.target.value)}>{PAYMENT_STATUSES.map((status) => <option value={status.id} key={status.id}>{status.label}</option>)}</select></label>
    <label className="field">Delivery<select value={deliveryMethod} onChange={(event) => setDeliveryMethod(event.target.value)}>{DELIVERY_METHODS.map((method) => <option value={method.id} key={method.id}>{method.label}</option>)}</select></label>
    <label className="field">Due date<input value={dueOn} onChange={(event) => setDueOn(event.target.value)} placeholder="YYYY-MM-DD" inputMode="numeric" aria-label="Due date" /></label>
    <label className="field">Follow-up date<input value={followUpOn} onChange={(event) => setFollowUpOn(event.target.value)} placeholder="YYYY-MM-DD" inputMode="numeric" aria-label="Follow-up date" /></label>
    <label className="field field-span-2">Note<textarea value={note} onChange={(event) => setNote(event.target.value)} maxLength={500} rows={3} /></label>
    <p className="field-span-2 empty-copy">A deposit before production is a recommendation. The board will not block the move. {initial ? "Saving keeps the prices already stored on this order unless you change the product." : "Today’s price list is copied onto the order. Later price changes stay on the price list."}</p>
    {preview && <p className="field-span-2"><b>Total {formatMoney(preview.totalMinor, currency)}</b> <span className="muted">Products {formatMoney(preview.subtotalMinor, currency)} · Discount {formatMoney(preview.discountMinor, currency)} · Shipping {formatMoney(preview.shippingMinor, currency)}</span></p>}
    {error && <p className="form-error field-span-2" role="alert">{error}</p>}
    <div className="form-actions"><span>{products.length || bundles.length || digitals.length ? "Prices are stored with the order." : "Save a price, bundle, or digital product before creating an order."}</span><button className="button button-primary" type="submit" disabled={pending || (products.length === 0 && bundles.length === 0 && digitals.length === 0)}>{pending ? "Saving…" : submitLabel}</button></div>
  </form>;
}
