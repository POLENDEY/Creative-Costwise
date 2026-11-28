"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, CircleAlert, Inbox, Send } from "lucide-react";
import { respondToPurchaseOrder } from "@/actions/purchase-orders";
import { ProductBreakdown } from "@/components/product-breakdown";
import { formatMoney, resolveCurrency } from "@/lib/money";
import { userFacingError } from "@/lib/user-facing-error";

type OrderLine = {
  id: string;
  productName: string;
  category: string;
  pricingOption: string;
  quantity: number;
  unitPriceMinor: number;
  unitProductionCostMinor: number;
  lineTotalMinor: number;
  lineProductionCostMinor: number;
  breakdownJson: string;
};
type PurchaseOrderRow = {
  id: string;
  status: string;
  currency: string;
  note: string;
  response: string;
  createdAt: string;
  respondedAt: string | null;
  crafter: { name: string; email: string };
  lines: OrderLine[];
};

const choices = [
  { value: "approved", label: "Approve & add to inventory" },
  { value: "changes_requested", label: "Request changes" },
  { value: "declined", label: "Decline request" },
] as const;

export function AdminOrders({ orders }: { orders: PurchaseOrderRow[] }) {
  const router = useRouter();
  const [filter, setFilter] = useState("all");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  const visibleOrders = filter === "all" ? orders : orders.filter((order) => order.status === filter);

  function respond(formData: FormData) {
    setError("");
    setMessage("");
    startTransition(async () => {
      try {
        const result = await respondToPurchaseOrder(formData);
        setMessage(result.emailSent ? "Your response was saved. The crafter has an in-app notification and an email." : `Your response was saved and the crafter has an in-app notification. ${result.message}`);
        router.refresh();
      } catch (reason) {
        setError(userFacingError(reason, "The response could not be saved."));
      }
    });
  }

  return <div className="admin-orders-workspace">
    <div className="admin-filter-tabs">{[["all", "All requests"], ["pending", "Needs review"], ["approved", "Approved"], ["changes_requested", "Changes requested"], ["declined", "Declined"]].map(([value, label]) => <button type="button" onClick={() => setFilter(value)} className={`admin-filter-tab ${filter === value ? "admin-filter-tab-active" : ""}`} key={value}>{label}<span>{value === "all" ? orders.length : orders.filter((order) => order.status === value).length}</span></button>)}</div>
    {error && <div className="action-message action-message-error" role="alert">{error}</div>}
    {message && <div className="action-message action-message-success" role="status">{message}</div>}
    {visibleOrders.length ? <div className="admin-order-list">{visibleOrders.map((order) => {
      const currency = resolveCurrency(order.currency);
      const total = order.lines.reduce((sum, line) => sum + line.lineTotalMinor, 0);
      const canRespond = order.status === "pending" || order.status === "changes_requested";
      return <article className="panel admin-order-card" key={order.id}>
        <div className="admin-order-header"><div><span className="eyebrow">REQUEST {order.id.slice(-8).toUpperCase()}</span><h2>{order.crafter.name}</h2><a href={`mailto:${order.crafter.email}`}>{order.crafter.email}</a><small>{new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(order.createdAt))}</small></div><div className="admin-order-meta"><span className={`po-status po-status-${order.status}`}>{order.status.replaceAll("_", " ")}</span><b>{formatMoney(total, currency)}</b><small>{order.lines.length} product{order.lines.length === 1 ? "" : "s"}</small></div></div>
        {order.note && <div className="admin-crafter-note"><b>Crafter’s note</b><p>{order.note}</p></div>}
        <div className="admin-order-products">{order.lines.map((line) => <section className="admin-order-product" key={line.id}><div className="admin-product-header"><div><b>{line.productName}</b><small>{line.category} · {line.pricingOption} price · quantity {line.quantity}</small></div><div><b>{formatMoney(line.lineTotalMinor, currency)}</b><small>{formatMoney(line.unitPriceMinor, currency)} selling / unit · {formatMoney(line.unitProductionCostMinor, currency)} production / unit</small></div></div><div className="admin-product-cost-total"><span>Total production cost for requested quantity</span><b>{formatMoney(line.lineProductionCostMinor, currency)}</b></div><ProductBreakdown breakdownJson={line.breakdownJson} currency={currency} /></section>)}</div>
        {order.response && <div className="po-admin-response admin-saved-response"><span className="eyebrow">PREVIOUS RESPONSE</span><p>{order.response}</p></div>}
        {canRespond && <form action={respond} className="admin-response-form"><input type="hidden" name="purchaseOrderId" value={order.id} /><label className="field">Your response<textarea name="response" rows={3} minLength={2} maxLength={1200} required placeholder="Add a reply or explain the next steps." defaultValue={order.response} /></label><div className="admin-response-actions"><label className="field">Decision<select name="status" defaultValue="approved">{choices.map((choice) => <option key={choice.value} value={choice.value}>{choice.label}</option>)}</select></label><button className="button button-primary" disabled={pending}><Send size={14} />{pending ? "Saving…" : "Send response"}</button></div><small>The crafter will see your reply here and receive an email when SMTP is configured.</small></form>}
        {order.status === "approved" && <div className="admin-approved-note"><Check size={14} /> Approved products are now recorded in admin inventory.</div>}
      </article>;
    })}</div> : <div className="panel empty-state"><div className="empty-illustration"><Inbox size={24} /></div><b>{orders.length ? "No requests in this category." : "Your request inbox is ready."}</b><p>{orders.length ? "Choose another filter to see other requests." : "Purchase forms sent by crafters will appear here with product and cost breakdowns."}</p></div>}
    <div className="admin-order-help"><CircleAlert size={14} /> Each request stores a read-only cost snapshot so future price edits do not change submitted forms.</div>
  </div>;
}
