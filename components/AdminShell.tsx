"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";
import { NavIcon } from "@/components/NavIcon";
import { getAdminUsername, isAdminLoggedIn, logoutAdmin } from "@/lib/auth";
import { fetchOpsStore } from "@/lib/store";

const GROUPS = [
  {
    label: "Overview",
    items: [{ href: "/dashboard", label: "Dashboard", icon: "home" }],
  },
  {
    label: "Finance",
    items: [
      { href: "/users", label: "Users", icon: "users" },
      { href: "/recharges", label: "Recharges", icon: "in" },
      { href: "/withdrawals", label: "Withdrawals", icon: "out" },
      { href: "/transfers", label: "Transfers", icon: "swap" },
    ],
  },
  {
    label: "Product",
    items: [
      { href: "/vip", label: "Car packages", icon: "star" },
      { href: "/holdings", label: "Garage holdings", icon: "star" },
      { href: "/team", label: "Team rates", icon: "team" },
      { href: "/coins", label: "Banks / wallets", icon: "coin" },
      { href: "/catalog", label: "Catalog", icon: "catalog" },
      { href: "/cms", label: "Pages", icon: "doc" },
    ],
  },
  {
    label: "System",
    items: [
      { href: "/commands", label: "Commands", icon: "bolt" },
      { href: "/audit", label: "Audit log", icon: "log" },
      { href: "/settings", label: "Settings", icon: "gear" },
    ],
  },
] as const;

export function AdminShell({ title, children }: { title: string; children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [adminName, setAdminName] = useState("admin");

  useEffect(() => {
    if (!isAdminLoggedIn()) {
      router.replace("/");
      return;
    }
    setAdminName(getAdminUsername());
    setReady(true);
    void fetchOpsStore();
  }, [router]);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  if (!ready) {
    return (
      <div className="grid min-h-screen place-items-center text-white/45">
        <p className="text-[13px] tracking-wide">Loading console…</p>
      </div>
    );
  }

  const nav = (
    <>
      <div className="brand-mark">
        <img src="/logo.png" alt="" className="h-10 w-10 rounded-xl bg-white object-contain p-0.5" />
        <div>
          <p className="text-[14px] font-semibold leading-tight">OLX Business</p>
          <p className="text-[11px] font-medium text-white/40">Operations</p>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto pr-0.5">
        {GROUPS.map((group) => (
          <div key={group.label}>
            <p className="nav-label">{group.label}</p>
            {group.items.map((item) => {
              const on = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link key={item.href} href={item.href} className={`admin-nav ${on ? "is-on" : ""}`}>
                  <NavIcon name={item.icon} />
                  {item.label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
      <div className="side-foot">
        <button
          type="button"
          className="admin-nav is-out"
          onClick={() => {
            logoutAdmin();
            router.push("/");
          }}
        >
          <NavIcon name="logout" />
          Sign out
        </button>
      </div>
    </>
  );

  return (
    <div className="admin-app">
      {menuOpen ? <button type="button" className="admin-scrim" aria-label="Close menu" onClick={() => setMenuOpen(false)} /> : null}
      <aside className={`admin-side ${menuOpen ? "is-open" : ""}`}>{nav}</aside>
      <div className="min-w-0">
        <header className="admin-top">
          <div className="flex min-w-0 items-center gap-2">
            <button type="button" className="menu-btn" aria-label="Open menu" onClick={() => setMenuOpen(true)}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <h1 className="truncate text-[18px] font-semibold tracking-tight text-[#f4f5f8]">{title}</h1>
          </div>
          <div className="flex min-w-0 items-center">
            <span className="env-pill">
              <span className="live-dot" />
              Local
            </span>
            <span className="user-chip text-[12px] text-[#c4c8d4]">
              <span className="grid h-7 w-7 place-items-center rounded-full bg-[#1e1f2a] text-[11px] font-semibold uppercase text-[#c7c9ff]">
                {adminName.slice(0, 1)}
              </span>
              <span className="max-w-[88px] truncate">{adminName}</span>
            </span>
          </div>
        </header>
        <main className="admin-main">{children}</main>
      </div>
    </div>
  );
}
