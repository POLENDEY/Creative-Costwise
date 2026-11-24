"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useEffect, useState } from "react";
import { markWelcomed } from "@/app/actions";
import { saveColorScheme } from "@/actions/shop";
import { NotificationBell, type AppNotification } from "@/components/notification-bell";
import {
  formatPlanDate,
  PLAN_FEATURES,
  planLabel,
  planLockMessage,
  planLockTitle,
  type PlanAccessReason,
} from "@/lib/plan-features";
import {
  ArrowUpRight,
  BadgePercent,
  Calculator,
  ChevronDown,
  CircleHelp,
  ClipboardList,
  CreditCard,
  Gift,
  Link2,
  LayoutDashboard,
  Lock,
  Receipt,
  Wallet,
  Menu,
  Moon,
  Package,
  Printer,
  Settings,
  Sparkles,
  Sun,
  Tag,
  Users,
  X,
} from "lucide-react";

const primaryLinks = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/materials", label: "Materials", icon: Package },
  { href: "/print-hub", label: "Print hub", icon: Printer },
  { href: "/costing", label: "Product costing", icon: Calculator },
  { href: "/prices", label: "Price sets", icon: Tag },
  { href: "/bundles", label: "Bundles", icon: Gift },
  { href: "/promotions", label: "Promotions", icon: BadgePercent },
  { href: "/digital", label: "Digital", icon: Link2 },
  { href: "/customers", label: "Customers", icon: Users },
  { href: "/orders", label: "Orders", icon: ClipboardList },
  { href: "/documents", label: "Documents", icon: Receipt },
  { href: "/finance", label: "Finance", icon: Wallet },
  { href: "/guide", label: "Guide & FAQs", icon: CircleHelp },
  { href: "/pricing", label: "Plans & pricing", icon: CreditCard },
];

function welcomeStorageKey(userId: string) {
  return `cc-welcome-seen:${userId}`;
}

export function AppFrame({
  userId,
  name,
  businessName,
  welcomeNeeded,
  plan,
  expiresAt,
  accessReason,
  colorScheme,
  notifications,
  children,
}: {
  userId: string;
  name: string;
  businessName: string;
  welcomeNeeded: boolean;
  plan: string;
  expiresAt: string | null;
  accessReason: PlanAccessReason | null;
  colorScheme: "light" | "dark";
  notifications: AppNotification[];
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [welcomeOpen, setWelcomeOpen] = useState(false);
  const [lockedFeature, setLockedFeature] = useState<string | null>(null);
  const [currentScheme, setCurrentScheme] = useState(colorScheme);
  const [themePending, setThemePending] = useState(false);
  const [themeError, setThemeError] = useState("");
  const planEndsOn = formatPlanDate(expiresAt);

  useEffect(() => {
    if (!welcomeNeeded) return;
    const key = welcomeStorageKey(userId);
    try {
      if (window.localStorage.getItem(key) === "1") return;
    } catch {
      // Storage can be blocked. The database flag below is the other record.
    }
    setWelcomeOpen(true);
    const remember = window.setTimeout(() => {
      try {
        window.localStorage.setItem(key, "1");
      } catch {
        // Ignore storage failures. The database write is the other record.
      }
      void markWelcomed().catch(() => undefined);
    }, 0);
    return () => window.clearTimeout(remember);
  }, [userId, welcomeNeeded]);

  async function toggleScheme() {
    if (themePending) return;
    const nextScheme = currentScheme === "dark" ? "light" : "dark";
    setThemePending(true);
    setThemeError("");
    try {
      await saveColorScheme(nextScheme);
      document.querySelectorAll<HTMLElement>("[data-scheme]").forEach((element) => {
        element.dataset.scheme = nextScheme;
      });
      setCurrentScheme(nextScheme);
    } catch (reason) {
      setThemeError(reason instanceof Error ? reason.message : "The color scheme could not be saved.");
    } finally {
      setThemePending(false);
    }
  }

  return (
    <div className="app-frame">
      <aside className={`sidebar no-print ${menuOpen ? "sidebar-open" : ""}`}>
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
            const locked = accessReason !== null && Object.values(PLAN_FEATURES).some((feature) => feature.href === href);
            if (locked) {
              return (
                <button
                  key={href}
                  type="button"
                  className="nav-link nav-link-locked"
                  aria-haspopup="dialog"
                  title={`${label} needs an active plan`}
                  onClick={() => {
                    setMenuOpen(false);
                    setLockedFeature(label);
                  }}
                >
                  <Icon size={18} strokeWidth={1.8} /><span>{label}</span>
                  <Lock className="nav-lock" size={13} aria-hidden="true" />
                </button>
              );
            }
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
        <div className="sidebar-footer">
          <div className="avatar">{name.trim().split(/\s+/).map((part) => part[0]).slice(0, 2).join("").toUpperCase()}</div>
          <div className="profile-copy">
            <b>{name}</b>
            <span>{businessName || "Your creative shop"}</span>
            <small className={`plan-badge ${accessReason ? "plan-badge-due" : ""}`}>
              {planLabel(plan)} plan{expiresAt ? ` · until ${new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(expiresAt))}` : ""}
              {accessReason ? " · renewal needed" : ""}
            </small>
          </div>
          <button className="icon-button profile-menu-button" onClick={() => setProfileOpen((value) => !value)} aria-label="Open account menu"><ChevronDown size={17} /></button>
          {profileOpen && (
            <div className="profile-popover">
              <Link href="/settings" onClick={() => setProfileOpen(false)}><Settings size={16} /> Settings</Link>
              <button onClick={toggleScheme}>{currentScheme === "dark" ? <Sun size={16} /> : <Moon size={16} />} Switch to {currentScheme === "dark" ? "light" : "dark"} mode</button>
              <button onClick={() => signOut({ callbackUrl: "/login" })}><ArrowUpRight size={16} /> Sign out</button>
            </div>
          )}
        </div>
      </aside>
      {menuOpen && <button className="sidebar-scrim" onClick={() => setMenuOpen(false)} aria-label="Close navigation" />}
      <main className="app-main">
        <header className="topbar no-print">
          <button className="icon-button mobile-menu-button" onClick={() => setMenuOpen(true)} aria-label="Open navigation"><Menu size={21} /></button>
          <div className="topbar-context"><span className="context-dot" /> Your creative business, in good hands.</div>
          <NotificationBell initialNotifications={notifications} />
          <button type="button" className="icon-button scheme-toggle" onClick={toggleScheme} aria-label={`Switch to ${currentScheme === "dark" ? "light" : "dark"} mode`} title={`Switch to ${currentScheme === "dark" ? "light" : "dark"} mode`} disabled={themePending}>{currentScheme === "dark" ? <Sun size={18} /> : <Moon size={18} />}</button>
          <Link href="/settings" className="topbar-settings"><Settings size={17} /><span>Settings</span></Link>
        </header>
        {themeError && <p className="theme-error" role="alert">{themeError}</p>}
        <div className="page-content">{children}</div>
      </main>
      {lockedFeature && accessReason && <div className="modal-backdrop" role="presentation" onClick={(event) => { if (event.target === event.currentTarget) setLockedFeature(null); }}><section className="welcome-modal plan-lock-modal" role="dialog" aria-modal="true" aria-labelledby="plan-lock-title"><span className="welcome-modal-icon plan-lock-icon"><Lock size={21} aria-hidden="true" /></span><span className="eyebrow">PLAN RENEWAL NEEDED</span><h2 id="plan-lock-title">{planLockTitle(accessReason)}</h2><p>{planLockMessage({ reason: accessReason, feature: lockedFeature, plan, expiresAt })}</p><div className="plan-lock-actions"><Link className="button button-primary" href="/pricing" onClick={() => setLockedFeature(null)}>See plans &amp; pricing</Link><button type="button" className="button button-secondary" onClick={() => setLockedFeature(null)}>Got it</button><span className="plan-lock-meta">{planLabel(plan)} plan{accessReason === "expired" && planEndsOn ? ` · ended ${planEndsOn}` : ""}</span></div></section></div>}
      {welcomeOpen && <div className="modal-backdrop" role="presentation"><section className="welcome-modal" role="dialog" aria-modal="true" aria-labelledby="welcome-title"><span className="welcome-modal-icon"><Sparkles size={23} /></span><span className="eyebrow">YOUR CREATIVE WORKSPACE</span><h2 id="welcome-title">Welcome in, {name.split(" ")[0]}.</h2><p>Your materials, making costs, and product prices now have a place to grow together. Start wherever feels right—everything is here when you need it.</p><button className="button button-primary" onClick={() => { try { window.localStorage.setItem(welcomeStorageKey(userId), "1"); } catch { /* storage is optional */ } setWelcomeOpen(false); }}>Let’s get started <ArrowUpRight size={16} /></button></section></div>}
    </div>
  );
}
