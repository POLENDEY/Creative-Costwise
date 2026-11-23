"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { moveOrderStage } from "@/actions/orders";
import { ORDER_STAGES, type OrderStage } from "@/lib/orders";
import { formatMoney, type Currency } from "@/lib/money";

export type BoardOrder = {
  id: string;
  customerName: string;
  stage: OrderStage;
  totalMinor: number;
  dueOn: string;
};

export function OrderBoard({ orders, currency }: { orders: BoardOrder[]; currency: Currency }) {
  const router = useRouter();
  const [dragging, setDragging] = useState("");
  const [overStage, setOverStage] = useState("");
  const [error, setError] = useState("");

  async function move(orderId: string, stage: string) {
    setError("");
    try {
      await moveOrderStage(orderId, stage);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not move that order.");
    }
  }

  return <div>
    {error && <p className="form-error" role="alert">{error}</p>}
    <div className="order-board">
      {ORDER_STAGES.map((stage) => {
        const stageOrders = orders.filter((order) => order.stage === stage.id);
        return <section
          key={stage.id}
          className={`order-column ${overStage === stage.id ? "order-column-over" : ""}`}
          onDragOver={(event) => { event.preventDefault(); setOverStage(stage.id); }}
          onDragLeave={() => setOverStage((current) => current === stage.id ? "" : current)}
          onDrop={() => { setOverStage(""); if (dragging) void move(dragging, stage.id); }}
        >
          <header><b>{stage.label}</b><span className="order-count">{stageOrders.length}</span></header>
          <div className="order-column-body">
            {stageOrders.map((order) => <article key={order.id} className="order-card" draggable onDragStart={() => setDragging(order.id)} onDragEnd={() => { setDragging(""); setOverStage(""); }}>
              <Link href={`/orders/${order.id}`}><b>{order.customerName}</b></Link>
              <span>{formatMoney(order.totalMinor, currency)}</span>
              {order.dueOn && <small>Due {order.dueOn}</small>}
              <select value={order.stage} aria-label={`Stage for ${order.customerName}`} onChange={(event) => void move(order.id, event.target.value)}>
                {ORDER_STAGES.map((option) => <option value={option.id} key={option.id}>{option.label}</option>)}
              </select>
            </article>)}
          </div>
        </section>;
      })}
    </div>
  </div>;
}
