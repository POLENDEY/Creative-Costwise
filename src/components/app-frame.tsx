"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useState } from "react";
import { markWelcomed } from "@/app/actions";
import {
  ArrowUpRight,
  Calculator,
  ChevronDown,
  CircleHelp,
  LayoutDashboard,
  Menu,
  Package,
  Printer,
  Settings,
  Sparkles,
  Tag,
  X,
} from "lucide-react";

const primaryLinks = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/materials", label: "Materials", icon: Package },
  { href: "/print-hub", label: "Print hub", icon: Printer },
  { href: "/costing", label: "Product costing", icon: Calculator },
  { href: "/prices", label: "Price sets", icon: Tag },
];

export function AppFrame({
  name,
  businessName,
  welcomeNeeded,
  children,
}: {
  name: string;
  businessName: string;
  welcomeNeeded: boolean;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [welcomeOpen, setWelcomeOpen] = useState(welcomeNeeded);

  return (
    <div className="app-frame">
      <aside className={`sidebar ${menuOpen ? "sidebar-open" : ""}`}>
        <div className="sidebar-brand">
          <Link href="/dashboard" className="brand-lockup">
            <Image src="/brand-logo.png" alt="" width={50} height={50} priority />
            <span className="brand-name">Creative<br /><b>Costwise</b></span>
          </Link>
          <button className="icon-button sidebar-close" aria-label="Close menu" onClick={() => setMenuOpen(false)}><X size={19} /></button>
        </div>
        <div className="workspace-label">YOUR WORKSPACE</div>
        <nav className="main-nav" aria-label="Main navigation">
          {primaryLinks.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(`${href}/`));
            return (
              <Link key={href} href={href} onClick={() => setMenuOpen(false)} className={`nav-link ${active ? "nav-link-active" : ""}`}>
                <Icon size={18} strokeWidth={active ? 2.2 : 1.8} /><span>{label}</span>
                {active && <span className="nav-active-mark" />}
              </Link>
            );
          })}
        </nav>
        <div className="sidebar-spacer" />
        <div className="sidebar-note">
          <div className="note-icon"><Sparkles size={16} /></div>
          <p>Small steps add up to something wonderful.</p>
          <span>Your business, at your pace.</span>
        </div>
        <Link href="/guide" className={`nav-link guide-link ${pathname === "/guide" ? "nav-link-active" : ""}`} onClick={() => setMenuOpen(false)}>
          <CircleHelp size={18} /><span>Guide &amp; FAQs</span>
        </Link>
        <div className="sidebar-footer">
          <div className="avatar">{name.trim().split(/\s+/).map((part) => part[0]).slice(0, 2).join("").toUpperCase()}</div>
          <div className="profile-copy"><b>{name}</b><span>{businessName || "Your creative shop"}</span></div>
          <button className="icon-button profile-menu-button" onClick={() => setProfileOpen((value) => !value)} aria-label="Open account menu"><ChevronDown size={17} /></button>
          {profileOpen && (
            <div className="profile-popover">
              <Link href="/settings" onClick={() => setProfileOpen(false)}><Settings size={16} /> Settings</Link>
              <button onClick={() => signOut({ callbackUrl: "/login" })}><ArrowUpRight size={16} /> Sign out</button>
            </div>
          )}
        </div>
      </aside>
      {menuOpen && <button className="sidebar-scrim" onClick={() => setMenuOpen(false)} aria-label="Close navigation" />}
      <main className="app-main">
        <header className="topbar">
          <button className="icon-button mobile-menu-button" onClick={() => setMenuOpen(true)} aria-label="Open navigation"><Menu size={21} /></button>
          <div className="topbar-context"><span className="context-dot" /> Your creative business, in good hands.</div>
          <Link href="/settings" className="topbar-settings"><Settings size={17} /><span>Settings</span></Link>
        </header>
        <div className="page-content">{children}</div>
      </main>
      {welcomeOpen && <div className="modal-backdrop" role="presentation"><section className="welcome-modal" role="dialog" aria-modal="true" aria-labelledby="welcome-title"><span className="welcome-modal-icon"><Sparkles size={23} /></span><span className="eyebrow">YOUR CREATIVE WORKSPACE</span><h2 id="welcome-title">Welcome in, {name.split(" ")[0]}.</h2><p>Your materials, making costs, and product prices now have a place to grow together. Start wherever feels right—everything is here when you need it.</p><button className="button button-primary" onClick={async () => { await markWelcomed(); setWelcomeOpen(false); }}>Let’s get started <ArrowUpRight size={16} /></button></section></div>}
    </div>
  );
}
