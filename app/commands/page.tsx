"use client";

import { useState } from "react";
import { AdminShell } from "@/components/AdminShell";
import { ConfirmBar, useToast } from "@/components/Feedback";
import { downloadCsv, downloadJson, getStore, replaceStore, toCsv, type Store } from "@/lib/store";

const JOBS = [
  {
    id: "publish",
    label: "Publish car packages to Cars",
    hint: "Pushes enabled packages and photos to the member Cars page.",
  },
  {
    id: "comm",
    label: "Recalculate team commissions",
    hint: "Sets each member’s brokerage from LEV 1 % × downline invest.",
  },
  {
    id: "expire",
    label: "Expire finished car packages",
    hint: "Clears member packages that are disabled in Car packages.",
  },
  {
    id: "yield",
    label: "Credit package returns",
    hint: "Adds the plan’s expected return to invest for members on a live package.",
  },
] as const;

export default function Page() {
  const { toast, node } = useToast();
  const [job, setJob] = useState<(typeof JOBS)[number]["id"] | null>(null);
  const [busy, setBusy] = useState(false);

  async function run(id: (typeof JOBS)[number]["id"]) {
    setBusy(true);
    try {
      const res = await fetch("/api/commands", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = (await res.json()) as { message?: string; error?: string; users?: Store["users"] };
      if (!res.ok) {
        toast(data.error || "Command failed");
        return;
      }
      if (data.users) replaceStore({ ...getStore(), users: data.users });
      toast(data.message || "Done");
    } finally {
      setBusy(false);
      setJob(null);
    }
  }

  const selected = JOBS.find((item) => item.id === job) ?? null;

  return (
    <AdminShell title="Commands">
      {node}
      {selected ? (
        <ConfirmBar
          text={busy ? "Running…" : `Run “${selected.label}”? This updates live console data and writes an audit row.`}
          onYes={() => {
            if (!busy) void run(selected.id);
          }}
          onNo={() => {
            if (!busy) setJob(null);
          }}
        />
      ) : null}
      <p className="mb-4 max-w-2xl text-[13px] leading-5 text-white/50">
        These jobs run on Zuvo. Publish updates the member Cars catalog. Commission, expire, and returns change live member balances in the database.
      </p>
      <div className="grid gap-3 md:grid-cols-2">
        {JOBS.map((item) => (
          <button
            key={item.id}
            type="button"
            className="admin-card p-5 text-left"
            disabled={busy}
            onClick={() => setJob(item.id)}
          >
            <p className="font-semibold">{item.label}</p>
            <p className="mt-1 text-[12px] leading-5 text-white/45">{item.hint}</p>
          </button>
        ))}
        <button
          type="button"
          className="admin-card p-5 text-left"
          onClick={() => {
            const s = getStore();
            downloadCsv(
              "users.csv",
              toCsv(
                s.users.map((u) => ({
                  account: u.account,
                  package: u.vip,
                  invest: u.invest,
                  brokerage: u.brokerage,
                  status: u.status,
                }))
              )
            );
            toast("users.csv downloaded");
          }}
        >
          <p className="font-semibold">Export users CSV</p>
          <p className="mt-1 text-[12px] text-white/45">Account, package, invest, brokerage, status</p>
        </button>
        <button
          type="button"
          className="admin-card p-5 text-left"
          onClick={() => {
            const s = getStore();
            downloadCsv(
              "deposits.csv",
              toCsv(s.recharges.map((r) => ({ account: r.account, amount: r.amount, status: r.status })))
            );
            toast("deposits.csv downloaded");
          }}
        >
          <p className="font-semibold">Export deposits CSV</p>
          <p className="mt-1 text-[12px] text-white/45">USDT fund tickets</p>
        </button>
        <button
          type="button"
          className="admin-card p-5 text-left"
          onClick={() => {
            const s = getStore();
            downloadCsv(
              "car-packages.csv",
              toCsv(
                s.vips.map((p) => ({
                  id: p.id,
                  name: p.name,
                  kind: p.kind,
                  invest: p.range,
                  returns: p.income,
                  days: p.days,
                  image: p.image,
                  enabled: p.enabled ? "yes" : "no",
                }))
              )
            );
            toast("car-packages.csv downloaded");
          }}
        >
          <p className="font-semibold">Export car packages CSV</p>
          <p className="mt-1 text-[12px] text-white/45">Name, stock, invest, return, term, photo, live status</p>
        </button>
        <button
          type="button"
          className="admin-card p-5 text-left"
          onClick={() => {
            downloadJson("olx-admin-catalog.json", getStore());
            toast("Full catalog JSON downloaded");
          }}
        >
          <p className="font-semibold">Export full console JSON</p>
          <p className="mt-1 text-[12px] text-white/45">Users, car packages, payments, CMS, notices, FAQ, activities</p>
        </button>
      </div>
    </AdminShell>
  );
}
