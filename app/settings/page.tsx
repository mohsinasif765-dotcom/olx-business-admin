"use client";

import { FormEvent, useEffect, useState } from "react";
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

export default function Page() {
  const { toast, node } = useToast();
  const [s, setS] = useState<Settings | null>(null);
  const [busy, setBusy] = useState(false);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pwdError, setPwdError] = useState("");
  const [brandLogo, setBrandLogo] = useState("/logo.png");
  const [splashLogo, setSplashLogo] = useState("/logo.png");
  const [logoBusy, setLogoBusy] = useState(false);

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

  return (
    <AdminShell title="Settings">
      {node}

      <div className="mb-5 max-w-3xl">
        <p className="text-[13px] leading-6 text-[var(--muted)]">
          Site controls write only to Zuvo <strong className="text-white/70">site_settings</strong>. Member app reads
          these live for login, deposit, withdraw, Cars, Shop, and team rates.
        </p>
      </div>

      <form className="admin-card mb-4 max-w-3xl space-y-4 p-5" onSubmit={onChangePassword}>
        <div>
          <p className="settings-kicker">Security</p>
          <h2 className="text-[16px] font-semibold tracking-tight">Console password</h2>
          <p className="mt-1 text-[13px] text-[var(--muted)]">Change the admin login password for this console.</p>
        </div>
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

      <div className="admin-card max-w-3xl space-y-6 p-5">
        <section className="space-y-3">
          <div>
            <p className="settings-kicker">Brand</p>
            <h2 className="text-[16px] font-semibold tracking-tight">Site identity</h2>
          </div>
          <label className="block text-[12px] text-[var(--muted)]">
            Site name
            <input
              value={s.siteName}
              onChange={(e) => setS({ ...s, siteName: e.target.value })}
              className="admin-input mt-1"
              placeholder="OLX Business"
            />
          </label>
          <div className={`space-y-4 ${logoBusy ? "pointer-events-none opacity-70" : ""}`}>
            <PhotoField
              label="Brand logo (headers, nav, favicon)"
              hint="JPG, PNG or WEBP, up to 4 MB. Shows on Home, Cars, Shop, Me, and other headers."
              value={brandLogo}
              onError={toast}
              onChange={(url) => void uploadBrand("logo", url)}
            />
            <PhotoField
              label="Splash / login logo"
              hint="Larger mark on login, install app, and about. Leave unused to reuse the brand logo."
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
        </section>

        <section className="space-y-3 border-t border-[var(--line)] pt-5">
          <div>
            <p className="settings-kicker">Switches</p>
            <h2 className="text-[16px] font-semibold tracking-tight">Member features</h2>
          </div>
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
        </section>

        <section className="space-y-3 border-t border-[var(--line)] pt-5">
          <div>
            <p className="settings-kicker">Finance</p>
            <h2 className="text-[16px] font-semibold tracking-tight">Rates & limits</h2>
            <p className="mt-1 text-[12px] text-[var(--muted)]">LEV % paid on deposit approve and package invest.</p>
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
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
              Payout fee (USDT)
              <input
                type="number"
                value={s.payoutFee}
                onChange={(e) => setS({ ...s, payoutFee: Number(e.target.value) })}
                className="admin-input mt-1"
              />
            </label>
          </div>
        </section>

        <section className="space-y-3 border-t border-[var(--line)] pt-5">
          <div>
            <p className="settings-kicker">Status</p>
            <h2 className="text-[16px] font-semibold tracking-tight">Maintenance</h2>
          </div>
          <label className="block text-[12px] text-[var(--muted)]">
            Banner message (empty = live)
            <input
              value={s.maintenance}
              onChange={(e) => setS({ ...s, maintenance: e.target.value })}
              className="admin-input mt-1"
              placeholder="Optional notice on Cars / Shop"
            />
          </label>
        </section>

        <div className="flex flex-wrap items-center gap-3 border-t border-[var(--line)] pt-5">
          <button type="button" className="admin-btn px-8" disabled={busy} onClick={() => void save()}>
            {busy ? "Saving…" : "Save settings"}
          </button>
          <p className="text-[12px] text-[var(--muted)]">Writes only site_settings — not packages, users, or holdings.</p>
        </div>
      </div>
    </AdminShell>
  );
}
