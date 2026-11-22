"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bell, Check, Clock3 } from "lucide-react";
import { getMyNotifications, markNotificationRead } from "@/actions/notifications";

export type AppNotification = {
  id: string;
  title: string;
  message: string;
  href: string;
  createdAt: string;
};

export function NotificationBell({ initialNotifications }: { initialNotifications: AppNotification[] }) {
  const router = useRouter();
  const [notifications, setNotifications] = useState(initialNotifications);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [pendingId, setPendingId] = useState("");
  const [, startTransition] = useTransition();

  useEffect(() => {
    let active = true;
    async function refreshNotifications() {
      try {
        const latest = await getMyNotifications();
        if (active) setNotifications(latest);
      } catch {
        if (active) setError("Notifications could not be refreshed.");
      }
    }
    const interval = window.setInterval(refreshNotifications, 30000);
    window.addEventListener("focus", refreshNotifications);
    return () => {
      active = false;
      window.clearInterval(interval);
      window.removeEventListener("focus", refreshNotifications);
    };
  }, []);

  function openNotification(notification: AppNotification) {
    setError("");
    setPendingId(notification.id);
    startTransition(async () => {
      try {
        await markNotificationRead(notification.id);
        setNotifications((items) => items.filter((item) => item.id !== notification.id));
        setOpen(false);
        router.push(notification.href);
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : "The notification could not be opened.");
      } finally {
        setPendingId("");
      }
    });
  }

  return <div className="notification-bell-wrap">
    <button type="button" className="icon-button notification-bell" aria-label={`Notifications${notifications.length ? `, ${notifications.length} unread` : ""}`} aria-expanded={open} onClick={() => setOpen((value) => !value)}>
      <Bell size={18} />
      {notifications.length > 0 && <span className="notification-count">{notifications.length > 99 ? "99+" : notifications.length}</span>}
    </button>
    {open && <section className="notification-popover" aria-label="Notifications">
      <header><span><b>Notifications</b><small>{notifications.length ? `${notifications.length} unread` : "You’re all caught up"}</small></span><button type="button" className="icon-button" aria-label="Close notifications" onClick={() => setOpen(false)}>×</button></header>
      {error && <p className="notification-error" role="alert">{error}</p>}
      {notifications.length ? <div className="notification-list">{notifications.map((notification) => <button key={notification.id} type="button" className="notification-item" onClick={() => openNotification(notification)} disabled={pendingId === notification.id}><span className="notification-unread-dot" /><span className="notification-item-copy"><b>{notification.title}</b><span>{notification.message}</span><small><Clock3 size={11} />{new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(notification.createdAt))}</small></span><Check className="notification-open-icon" size={14} /></button>)}</div> : <p className="notification-empty">New purchase requests and admin responses will show up here.</p>}
    </section>}
  </div>;
}
