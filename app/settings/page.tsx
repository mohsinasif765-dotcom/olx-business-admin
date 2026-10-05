"use client";

import { FormEvent, useEffect, useState } from "react";
import { AdminShell } from "@/components/AdminShell";
import { useToast } from "@/components/Feedback";
import { PasswordField } from "@/components/PasswordField";
import { changeAdminPassword } from "@/lib/auth";
import { getStore, patchStore, type Settings } from "@/lib/store";

export default function Page() {
  const { toast, node } = useToast();
  const [s, setS] = useState<Settings | null>(null);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pwdError, setPwdError] = useState("");
  useEffect(() => setS(getStore().settings), []);
  if (!s) return <AdminShell title="Settings">Loading…</AdminShell>;

  function onChangePassword(event: FormEvent) {
    event.preventDefault();
    setPwdError("");
    if (next !== confirm) {
      setPwdError("New password and confirmation do not match.");
      return;
    }
    const result = changeAdminPassword(current, next);
    if (!result.ok) {
      setPwdError(result.error);
      return;
    }
    patchStore(
      () => {},
      { action: "password_change", target: "admin" }
    );
    setCurrent("");
    setNext("");
    setConfirm("");
    toast("Password updated. Use it on next login.");
  }

  function save() {
    if (!s) return;
    patchStore((st) => {
      st.settings = s;
    }, { action: "settings_save", target: "site" });
    toast("Settings saved");
  }

  return (
    <AdminShell title="Settings">
      {node}
      <form className="admin-card mb-4 max-w-2xl space-y-4 p-5" onSubmit={onChangePassword}>
        <div>
          <h2 className="text-[16px] font-semibold">Security</h2>
          <p className="mt-1 text-[13px] text-white/45">Update the console password. You will need the current password to confirm.</p>
        </div>
        <label className="block text-[12px] text-white/50">
          Current password
          <div className="mt-1">
            <PasswordField value={current} onChange={setCurrent} autoComplete="current-password" />
          </div>
        </label>
        <label className="block text-[12px] text-white/50">
          New password
          <div className="mt-1">
            <PasswordField value={next} onChange={setNext} autoComplete="new-password" placeholder="At least 8 characters" />
          </div>
        </label>
        <label className="block text-[12px] text-white/50">
          Confirm new password
          <div className="mt-1">
            <PasswordField value={confirm} onChange={setConfirm} autoComplete="new-password" />
          </div>
        </label>
        {pwdError ? <p className="text-[13px] text-[#ff9aa8]">{pwdError}</p> : null}
        <button type="submit" className="admin-btn px-8">
          Update password
        </button>
      </form>
      <div className="admin-card max-w-2xl space-y-4 p-5">
        <label className="block text-[12px] text-white/50">
          Site name
          <input value={s.siteName} onChange={(e) => setS({ ...s, siteName: e.target.value })} className="admin-input mt-1" />
        </label>
        <label className="block text-[12px] text-white/50">
          Telegram help URL
          <input value={s.telegram} onChange={(e) => setS({ ...s, telegram: e.target.value })} className="admin-input mt-1" />
        </label>
        <label className="block text-[12px] text-white/50">
          Default language
          <select value={s.defaultLang} onChange={(e) => setS({ ...s, defaultLang: e.target.value })} className="admin-input mt-1">
            <option value="en">English</option>
            <option value="ur">Urdu</option>
            <option value="zh">中文</option>
            <option value="ar">العربية</option>
          </select>
        </label>
        {(
          [
            ["registerOn", "Register"],
            ["loginOn", "Login"],
            ["rechargeOn", "Recharge"],
            ["withdrawOn", "Withdraw"],
            ["transferOn", "Transfer"],
            ["miningOn", "Mining"],
          ] as const
        ).map(([key, label]) => (
          <div key={key} className="flag">
            <span>{label}</span>
            <button type="button" className="ghost-btn" onClick={() => setS({ ...s, [key]: !s[key] })}>
              {s[key] ? "On" : "Off"}
            </button>
          </div>
        ))}
        <div className="grid grid-cols-2 gap-3">
          <label className="text-[12px] text-white/50">
            Min withdraw
            <input type="number" value={s.minWithdraw} onChange={(e) => setS({ ...s, minWithdraw: Number(e.target.value) })} className="admin-input mt-1" />
          </label>
          <label className="text-[12px] text-white/50">
            Daily cap
            <input type="number" value={s.dailyCap} onChange={(e) => setS({ ...s, dailyCap: Number(e.target.value) })} className="admin-input mt-1" />
          </label>
          <label className="text-[12px] text-white/50">
            BEP20 fee
            <input type="number" value={s.bep20Fee} onChange={(e) => setS({ ...s, bep20Fee: Number(e.target.value) })} className="admin-input mt-1" />
          </label>
          <label className="text-[12px] text-white/50">
            TRC20 fee
            <input type="number" value={s.trc20Fee} onChange={(e) => setS({ ...s, trc20Fee: Number(e.target.value) })} className="admin-input mt-1" />
          </label>
        </div>
        <label className="block text-[12px] text-white/50">
          Maintenance message (empty = live)
          <input value={s.maintenance} onChange={(e) => setS({ ...s, maintenance: e.target.value })} className="admin-input mt-1" />
        </label>
        <button type="button" className="admin-btn px-8" onClick={save}>
          Save settings
        </button>
        <p className="text-[12px] text-white/40">
          No database in this panel yet. `lib/store.ts` is the swap point for Prisma/Supabase later.
        </p>
      </div>
    </AdminShell>
  );
}
