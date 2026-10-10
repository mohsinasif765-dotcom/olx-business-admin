"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { AdminShell } from "@/components/AdminShell";
import { useToast } from "@/components/Feedback";
import { PasswordField } from "@/components/PasswordField";
import { PhotoField } from "@/components/PhotoField";
import { changeAdminPassword } from "@/lib/auth";
import { DEFAULT_SETTINGS, fetchOpsStore, getStore, replaceStore, type Settings } from "@/lib/store";

const FLAGS = [
  ["registerOn", "Register", "New members can create accounts"],
  ["loginOn", "Login", "Existing members can sign in"],
  ["rechargeOn", "Fund wallet", "Deposits / recharges on the member app"],
  ["withdrawOn", "Withdraw", "Member withdrawals"],
  ["transferOn", "Transfer", "Invest ↔ brokerage transfers"],
  ["packagesOn", "Cars & Shop packages", "Invest on Cars and Shop pages"],
] as const;

const TABS = [
  { id: "brand", label: "Brand", hint: "Name & logos" },
  { id: "features", label: "Features", hint: "App switches" },
  { id: "currency", label: "Currency", hint: "Wallet mode" },
  { id: "finance", label: "Finance", hint: "Rates & limits" },
  { id: "about", label: "About Us", hint: "Member page" },
  { id: "status", label: "Status", hint: "Maintenance" },
  { id: "security", label: "Security", hint: "Password" },
] as const;

type TabId = (typeof TABS)[number]["id"];

function UsdtPkrRateField({
  s,
  setS,
  toast,
}: {
  s: Settings;
  setS: (next: Settings) => void;
  toast: (msg: string) => void;
}) {
  const [fxBusy, setFxBusy] = useState(false);
  const [fxMeta, setFxMeta] = useState("");

  async function pullLive(persist: boolean) {
    setFxBusy(true);
    try {
      const qs = new URLSearchParams({ force: "1" });
      if (persist) qs.set("persist", "1");
      const res = await fetch(`/api/fx/usdt-pkr?${qs.toString()}`, { cache: "no-store" });
      const data = (await res.json()) as {
        ok?: boolean;
        rate?: number;
        source?: string;
        at?: string;
        error?: string;
      };
      if (!res.ok || !data.rate) {
        toast(data.error || "Could not load live market rate");
        return;
      }
      setS({
        ...s,
        usdtToPkrRate: Number(data.rate) || s.usdtToPkrRate,
        usdtRateAuto: true,
      });
      setFxMeta(`${data.source || "market"}${data.at ? ` · ${data.at}` : ""}`);
      toast(persist ? `Live rate saved: 1 USDT ≈ Rs ${data.rate}` : `Live rate: 1 USDT ≈ Rs ${data.rate}`);
    } catch {
      toast("Could not load live market rate");
    } finally {
      setFxBusy(false);
    }
  }

  useEffect(() => {
    if (s.usdtRateAuto === false) return;
    void pullLive(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- pull once when auto is on / currency shown
  }, []);

  return (
    <div className="space-y-2 rounded-xl border border-white/10 bg-white/[0.03] p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[12px] font-medium text-white/85">USDT → PKR rate</p>
        <label className="flex items-center gap-2 text-[11px] text-[var(--muted)]">
          <input
            type="checkbox"
            checked={s.usdtRateAuto !== false}
            onChange={(e) => setS({ ...s, usdtRateAuto: e.target.checked })}
            className="rounded border-white/20"
          />
          Auto from live market
        </label>
      </div>
      <div className="flex flex-wrap gap-2">
        <input
          type="number"
          min={1}
          step="0.01"
          value={s.usdtToPkrRate}
          onChange={(e) =>
            setS({
              ...s,
              usdtToPkrRate: Number(e.target.value) || 280,
              usdtRateAuto: false,
            })
          }
          className="admin-input min-w-0 flex-1"
          placeholder="280"
          disabled={s.usdtRateAuto !== false && fxBusy}
        />
        <button
          type="button"
          className="admin-btn shrink-0 px-3 text-[12px]"
          disabled={fxBusy}
          onClick={() => void pullLive(true)}
        >
          {fxBusy ? "…" : "Refresh live"}
        </button>
      </div>
      <p className="text-[11px] leading-4 text-[var(--muted)]">
        {s.usdtRateAuto !== false
          ? "Member app uses internet market rate (USDT→PKR). Saved value is fallback if feeds are down."
          : "Manual rate locked. Bank withdraw estimated PKR = (amount − fee) × this rate."}
        {fxMeta ? ` ${fxMeta}` : ""}
      </p>
    </div>
  );
}

export default function Page() {
  const { toast, node } = useToast();
  const [tab, setTab] = useState<TabId>("brand");
  const [s, setS] = useState<Settings | null>(null);
  const [busy, setBusy] = useState(false);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pwdError, setPwdError] = useState("");
  const [brandLogo, setBrandLogo] = useState("/logo.png");
  const [splashLogo, setSplashLogo] = useState("/logo.png");
  const [logoBusy, setLogoBusy] = useState(false);
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  async function loadBrand() {
    try {
      const res = await fetch("/api/brand-assets", { cache: "no-store" });
      const data = (await res.json()) as { logo?: string; splash?: string };
      if (data.logo) setBrandLogo(data.logo);
      if (data.splash) setSplashLogo(data.splash);
    } catch {
      /* keep defaults */
    }
  }

  async function uploadBrand(kind: "logo" | "splash", image: string) {
    setLogoBusy(true);
    try {
      const res = await fetch("/api/brand-assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, image }),
      });
      const data = (await res.json()) as { error?: string; logo?: string; splash?: string };
      if (!res.ok) {
        toast(data.error || "Logo upload failed");
        return;
      }
      if (data.logo) setBrandLogo(data.logo);
      if (data.splash) setSplashLogo(data.splash);
      toast(kind === "splash" ? "Splash logo saved — live on member login" : "Brand logo saved — live on member app");
    } catch {
      toast("Logo upload failed");
    } finally {
      setLogoBusy(false);
    }
  }

  useEffect(() => {
    void (async () => {
      void loadBrand();
      try {
        const res = await fetch("/api/settings", { cache: "no-store" });
        const data = (await res.json()) as { settings?: Settings };
        if (res.ok && data.settings) {
          setS({ ...DEFAULT_SETTINGS, ...data.settings });
          const store = getStore();
          replaceStore({ ...store, settings: { ...DEFAULT_SETTINGS, ...data.settings } });
          return;
        }
      } catch {
        /* fall through */
      }
      const store = await fetchOpsStore();
      setS(store.settings);
    })();
  }, []);

  useEffect(() => {
    tabRefs.current[tab]?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [tab]);

  if (!s) {
    return (
      <AdminShell title="Settings">
        <p className="text-[13px] text-[var(--muted)]">Loading settings…</p>
      </AdminShell>
    );
  }

  async function onChangePassword(event: FormEvent) {
    event.preventDefault();
    setPwdError("");
    if (next !== confirm) {
      setPwdError("New password and confirmation do not match.");
      return;
    }
    const result = await changeAdminPassword(current, next);
    if (!result.ok) {
      setPwdError(result.error);
      return;
    }
    setCurrent("");
    setNext("");
    setConfirm("");
    toast("Password updated. Use it on next login.");
  }

  async function save() {
    if (!s || busy) return;
    setBusy(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(s),
      });
      const data = (await res.json()) as { settings?: Settings; error?: string };
      if (!res.ok || !data.settings) {
        toast(data.error || "Could not save settings to database");
        return;
      }
      setS(data.settings);
      const store = getStore();
      replaceStore({ ...store, settings: data.settings });
      toast("Settings saved to database");
    } catch {
      toast("Network error — settings not saved");
    } finally {
      setBusy(false);
    }
  }

  const active = TABS.find((row) => row.id === tab) || TABS[0];
  const showSave = tab !== "security";

  return (
    <AdminShell title="Settings">
      {node}

      <div className="settings-layout">
        <aside className="settings-nav">
          <p className="settings-nav-title">Settings</p>
          <p className="settings-nav-sub">Each area saves to site_settings</p>
          <div className="settings-nav-mobile">
            <select
              id="settings-section"
              className="settings-nav-select"
              aria-label="Settings section"
              value={tab}
              onChange={(e) => setTab(e.target.value as TabId)}
            >
              {TABS.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label} — {item.hint}
                </option>
              ))}
            </select>
          </div>
          <nav className="settings-nav-list settings-nav-desktop" aria-label="Settings sections">
            {TABS.map((item) => (
              <button
                key={item.id}
                type="button"
                ref={(el) => {
                  tabRefs.current[item.id] = el;
                }}
                className={`settings-nav-item ${tab === item.id ? "is-on" : ""}`}
                onClick={() => setTab(item.id)}
              >
                <span className="settings-nav-label">{item.label}</span>
                <span className="settings-nav-hint">{item.hint}</span>
              </button>
            ))}
          </nav>
        </aside>

        <div className="settings-panel">
          <header className="settings-panel-head">
            <div>
              <p className="settings-kicker">{active.label}</p>
              <h2 className="text-[18px] font-semibold tracking-tight">{active.hint}</h2>
            </div>
            {showSave ? (
              <button type="button" className="admin-btn px-6" disabled={busy} onClick={() => void save()}>
                {busy ? "Saving…" : "Save"}
              </button>
            ) : null}
          </header>

          {tab === "brand" ? (
            <div className="admin-card space-y-4 p-4 sm:p-5">
              <p className="text-[13px] text-[var(--muted)]">
                Site name and logos shown across the member app headers, login, and About page.
              </p>
              <label className="block text-[12px] text-[var(--muted)]">
                Site name
                <input
                  value={s.siteName}
                  onChange={(e) => setS({ ...s, siteName: e.target.value })}
                  className="admin-input mt-1"
                  placeholder="OLX Business"
                />
              </label>
              <div className={`grid gap-4 grid-cols-1 ${logoBusy ? "pointer-events-none opacity-70" : ""}`}>
                <PhotoField
                  label="Brand logo"
                  hint="Headers, nav, favicon. JPG / PNG / WEBP up to 4 MB."
                  value={brandLogo}
                  onError={toast}
                  onChange={(url) => void uploadBrand("logo", url)}
                />
                <PhotoField
                  label="Splash / login logo"
                  hint="Login, install app, About. Leave empty to reuse brand logo."
                  value={splashLogo}
                  onError={toast}
                  onChange={(url) => void uploadBrand("splash", url)}
                />
              </div>
              <label className="block text-[12px] text-[var(--muted)]">
                Telegram help URL
                <input
                  value={s.telegram}
                  onChange={(e) => setS({ ...s, telegram: e.target.value })}
                  className="admin-input mt-1"
                  placeholder="https://t.me/…"
                />
              </label>
              <label className="block text-[12px] text-[var(--muted)]">
                WhatsApp link (Home card)
                <input
                  value={s.whatsapp}
                  onChange={(e) => setS({ ...s, whatsapp: e.target.value })}
                  className="admin-input mt-1"
                  placeholder="https://wa.me/923001234567"
                />
                <span className="mt-1 block text-[11px] leading-4">
                  Replaces Cumulative Users on member Home. Use full wa.me URL or +92… number.
                </span>
              </label>
              <label className="block text-[12px] text-[var(--muted)]">
                Default language (new visitors)
                <select
                  value={s.defaultLang}
                  onChange={(e) => setS({ ...s, defaultLang: e.target.value })}
                  className="admin-input mt-1"
                >
                  <option value="en">English</option>
                  <option value="ur">Urdu</option>
                  <option value="zh">中文</option>
                  <option value="ar">العربية</option>
                </select>
              </label>
            </div>
          ) : null}

          {tab === "features" ? (
            <div className="admin-card space-y-3 p-4 sm:p-5">
              <p className="text-[13px] text-[var(--muted)]">Turn member features on or off without touching code.</p>
              <div className="space-y-2">
                {FLAGS.map(([key, label, hint]) => (
                  <div key={key} className="flag">
                    <div className="min-w-0">
                      <p className="text-[13px] font-medium text-white/90">{label}</p>
                      <p className="text-[11px] text-[var(--muted)]">{hint}</p>
                    </div>
                    <button
                      type="button"
                      className={`toggle-btn ${s[key] ? "is-on" : ""}`}
                      onClick={() => setS({ ...s, [key]: !s[key] })}
                    >
                      {s[key] ? "On" : "Off"}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {tab === "currency" ? (
            <div className="admin-card space-y-4 p-4 sm:p-5">
              <p className="text-[13px] text-[var(--muted)]">
                Press <strong className="text-white/80">Save</strong> after choosing a mode. Member Home labels,
                Fund methods, Withdraw tabs, and package currency all follow this setting (from Coins rails).
              </p>
              <div className="grid gap-2">
                {(
                  [
                    {
                      id: "pkr" as const,
                      title: "PKR only",
                      hint: "Pakistan bank / JazzCash rails. Home shows Rs. USDT hidden from members.",
                    },
                    {
                      id: "usdt" as const,
                      title: "USDT only",
                      hint: "Crypto wallet rails only. Home shows USDT. PKR bank rails hidden from members.",
                    },
                    {
                      id: "dual" as const,
                      title: "PKR + USDT",
                      hint: "Home shows USDT and Rs together. Members can fund and withdraw with either rail.",
                    },
                  ] as const
                ).map((opt) => {
                  const on = s.walletMode === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setS({ ...s, walletMode: opt.id })}
                      className={`rounded-xl border px-4 py-3 text-left transition ${
                        on
                          ? "border-[#3b82f6] bg-[#3b82f6]/15"
                          : "border-[var(--line)] bg-white/[0.02] hover:border-white/20"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-[13px] font-semibold text-white/95">{opt.title}</p>
                        <span
                          className={`h-4 w-4 shrink-0 rounded-full border-2 ${
                            on ? "border-[#60a5fa] bg-[#3b82f6]" : "border-white/25"
                          }`}
                        />
                      </div>
                      <p className="mt-1 text-[11px] leading-4 text-[var(--muted)]">{opt.hint}</p>
                    </button>
                  );
                })}
              </div>
              <p className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-[11px] leading-4 text-[var(--muted)]">
                Preview: member home balances as{" "}
                <strong className="text-white/80">
                  {s.walletMode === "usdt"
                    ? "USDT"
                    : s.walletMode === "dual"
                      ? "USDT + Rs"
                      : "Rs"}
                </strong>
                .
              </p>
              {s.walletMode === "usdt" || s.walletMode === "dual" ? (
                <UsdtPkrRateField s={s} setS={setS} toast={toast} />
              ) : null}
            </div>
          ) : null}

          {tab === "finance" ? (
            <div className="admin-card space-y-4 p-4 sm:p-5">
              <p className="text-[13px] text-[var(--muted)]">LEV % on deposit approve and package invest, plus withdraw limits.</p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
                <label className="text-[12px] text-[var(--muted)]">
                  LEV 1 %
                  <input
                    type="number"
                    value={s.commissionL1}
                    onChange={(e) => setS({ ...s, commissionL1: Number(e.target.value) })}
                    className="admin-input mt-1"
                  />
                </label>
                <label className="text-[12px] text-[var(--muted)]">
                  LEV 2 %
                  <input
                    type="number"
                    value={s.commissionL2}
                    onChange={(e) => setS({ ...s, commissionL2: Number(e.target.value) })}
                    className="admin-input mt-1"
                  />
                </label>
                <label className="text-[12px] text-[var(--muted)]">
                  LEV 3 %
                  <input
                    type="number"
                    value={s.commissionL3}
                    onChange={(e) => setS({ ...s, commissionL3: Number(e.target.value) })}
                    className="admin-input mt-1"
                  />
                </label>
                <label className="text-[12px] text-[var(--muted)]">
                  Min withdraw
                  <input
                    type="number"
                    value={s.minWithdraw}
                    onChange={(e) => setS({ ...s, minWithdraw: Number(e.target.value) })}
                    className="admin-input mt-1"
                  />
                </label>
                <label className="text-[12px] text-[var(--muted)]">
                  Daily cap
                  <input
                    type="number"
                    value={s.dailyCap}
                    onChange={(e) => setS({ ...s, dailyCap: Number(e.target.value) })}
                    className="admin-input mt-1"
                  />
                </label>
                <label className="text-[12px] text-[var(--muted)]">
                  Payout fee ({s.walletMode === "usdt" ? "USDT" : s.walletMode === "dual" ? "unit" : "PKR"})
                  <input
                    type="number"
                    value={s.payoutFee}
                    onChange={(e) => setS({ ...s, payoutFee: Number(e.target.value) })}
                    className="admin-input mt-1"
                  />
                </label>
              </div>
            </div>
          ) : null}

          {tab === "about" ? (
            <div className="space-y-4">
              <div className="admin-card space-y-4 p-4 sm:p-5">
                <p className="text-[13px] text-[var(--muted)]">
                  Copy for member <strong className="text-white/70">/about</strong>. Needs{" "}
                  <code className="text-white/55">about-settings.sql</code> if columns are missing.
                </p>
                <label className="block text-[12px] text-[var(--muted)]">
                  Tagline
                  <input
                    value={s.aboutTagline}
                    onChange={(e) => setS({ ...s, aboutTagline: e.target.value })}
                    className="admin-input mt-1"
                    placeholder="Short line under the brand name"
                  />
                </label>
                <label className="block text-[12px] text-[var(--muted)]">
                  Version badge
                  <input
                    value={s.aboutVersion}
                    onChange={(e) => setS({ ...s, aboutVersion: e.target.value })}
                    className="admin-input mt-1"
                    placeholder="Version 1.0"
                  />
                </label>
                <label className="block text-[12px] text-[var(--muted)]">
                  Platform story
                  <textarea
                    value={s.aboutBody}
                    onChange={(e) => setS({ ...s, aboutBody: e.target.value })}
                    className="admin-input mt-1 min-h-[110px]"
                    placeholder="Main About Us paragraph"
                  />
                </label>
              </div>

              <div className="admin-card space-y-3 p-4 sm:p-5">
                <p className="settings-kicker">How it works</p>
                <h3 className="text-[15px] font-semibold">Three steps</h3>
                <label className="block text-[12px] text-[var(--muted)]">
                  Step 1
                  <input
                    value={s.aboutStep1}
                    onChange={(e) => setS({ ...s, aboutStep1: e.target.value })}
                    className="admin-input mt-1"
                  />
                </label>
                <label className="block text-[12px] text-[var(--muted)]">
                  Step 2
                  <input
                    value={s.aboutStep2}
                    onChange={(e) => setS({ ...s, aboutStep2: e.target.value })}
                    className="admin-input mt-1"
                  />
                </label>
                <label className="block text-[12px] text-[var(--muted)]">
                  Step 3
                  <input
                    value={s.aboutStep3}
                    onChange={(e) => setS({ ...s, aboutStep3: e.target.value })}
                    className="admin-input mt-1"
                  />
                </label>
              </div>

              <div className="admin-card space-y-3 p-4 sm:p-5">
                <p className="settings-kicker">Company</p>
                <h3 className="text-[15px] font-semibold">Registration card</h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block text-[12px] text-[var(--muted)] sm:col-span-2">
                    Legal company name
                    <input
                      value={s.companyName}
                      onChange={(e) => setS({ ...s, companyName: e.target.value })}
                      className="admin-input mt-1"
                    />
                  </label>
                  <label className="block text-[12px] text-[var(--muted)] sm:col-span-2">
                    Registered address
                    <textarea
                      value={s.companyAddress}
                      onChange={(e) => setS({ ...s, companyAddress: e.target.value })}
                      className="admin-input mt-1 min-h-[72px]"
                    />
                  </label>
                  <label className="block text-[12px] text-[var(--muted)]">
                    Company No.
                    <input
                      value={s.companyNo}
                      onChange={(e) => setS({ ...s, companyNo: e.target.value })}
                      className="admin-input mt-1"
                    />
                  </label>
                  <label className="block text-[12px] text-[var(--muted)]">
                    Registered date
                    <input
                      value={s.companyRegDate}
                      onChange={(e) => setS({ ...s, companyRegDate: e.target.value })}
                      className="admin-input mt-1"
                    />
                  </label>
                  <label className="block text-[12px] text-[var(--muted)]">
                    Issued date
                    <input
                      value={s.companyIssued}
                      onChange={(e) => setS({ ...s, companyIssued: e.target.value })}
                      className="admin-input mt-1"
                    />
                  </label>
                </div>
              </div>
            </div>
          ) : null}

          {tab === "status" ? (
            <div className="admin-card space-y-4 p-4 sm:p-5">
              <p className="text-[13px] text-[var(--muted)]">Optional banner on Cars / Shop when you need a pause notice.</p>
              <label className="block text-[12px] text-[var(--muted)]">
                Banner message (empty = live)
                <input
                  value={s.maintenance}
                  onChange={(e) => setS({ ...s, maintenance: e.target.value })}
                  className="admin-input mt-1"
                  placeholder="Optional notice on Cars / Shop"
                />
              </label>
            </div>
          ) : null}

          {tab === "security" ? (
            <form className="admin-card space-y-4 p-4 sm:p-5" onSubmit={onChangePassword}>
              <p className="text-[13px] text-[var(--muted)]">Change the admin console login password.</p>
              <label className="block text-[12px] text-[var(--muted)]">
                Current password
                <div className="mt-1">
                  <PasswordField value={current} onChange={setCurrent} autoComplete="current-password" />
                </div>
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-[12px] text-[var(--muted)]">
                  New password
                  <div className="mt-1">
                    <PasswordField value={next} onChange={setNext} autoComplete="new-password" placeholder="At least 8 characters" />
                  </div>
                </label>
                <label className="block text-[12px] text-[var(--muted)]">
                  Confirm new password
                  <div className="mt-1">
                    <PasswordField value={confirm} onChange={setConfirm} autoComplete="new-password" />
                  </div>
                </label>
              </div>
              {pwdError ? <p className="text-[13px] text-[#f87171]">{pwdError}</p> : null}
              <button type="submit" className="admin-btn px-8">
                Update password
              </button>
            </form>
          ) : null}

          {showSave ? (
            <div className="settings-save-bar">
              <p className="text-[12px] text-[var(--muted)]">Changes apply to the member app after Save.</p>
              <button type="button" className="admin-btn px-8" disabled={busy} onClick={() => void save()}>
                {busy ? "Saving…" : "Save settings"}
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </AdminShell>
  );
}
