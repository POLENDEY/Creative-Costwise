"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Boxes, Library, LogOut, ShoppingBag, UsersRound, Wallet } from "lucide-react";
import { NotificationBell, type AppNotification } from "@/components/notification-bell";
import { signOutHere } from "@/components/sign-out-button";

const links = [
  { href: "/admin/users", label: "Crafter accounts", icon: UsersRound },
  { href: "/admin/payments", label: "Renewal payments", icon: Wallet },
  { href: "/admin/orders", label: "Purchase requests", icon: ShoppingBag },
  { href: "/admin/inventory", label: "Inventory", icon: Boxes },
  { href: "/admin/resources", label: "Resources", icon: Library },
];

export function AdminFrame({ name, notifications, children }: { name: string; notifications: AppNotification[]; children: React.ReactNode }) {
  const pathname = usePathname();
  return <div className="admin-shell">
    <header className="admin-topbar"><Link className="admin-brand" href="/admin/users"><span className="admin-brand-mark">C</span><span>Creative <b>Costwise</b><small>ADMIN WORKSPACE</small></span></Link><div className="admin-topbar-user"><span>{name}</span><NotificationBell initialNotifications={notifications} /><button className="button button-secondary" onClick={() => void signOutHere()}><LogOut size={15} /> Sign out</button></div></header>
    <div className="admin-body"><nav className="admin-tabs" aria-label="Admin modules">{links.map(({ href, label, icon: Icon }) => <Link className={`admin-tab ${pathname === href ? "admin-tab-active" : ""}`} href={href} key={href}><Icon size={16} />{label}</Link>)}</nav><div className="admin-main">{children}</div></div>
  </div>;
}
