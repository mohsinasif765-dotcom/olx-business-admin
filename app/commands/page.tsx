"use client";

import { useState } from "react";
import { AdminShell } from "@/components/AdminShell";
import { ConfirmBar, useToast } from "@/components/Feedback";
import { downloadCsv, downloadJson, getStore, patchStore, toCsv } from "@/lib/store";

export default function Page() {
  const { toast, node } = useToast();
  const [job, setJob] = useState<string | null>(null);

  const jobs = [
    { id: "comm", label: "Recalculate team commissions", result: "Commission ledger rebuilt for 3 levels (demo)." },
    { id: "expire", label: "Expire finished VIP / mining (dry-run)", result: "0 contracts expired. 2 still active." },
    { id: "yield", label: "Credit daily mining yield (batch)", result: "Yield credited to 2 VIP members (demo)." },
  ];

  return (
    <AdminShell title="Commands">
      {node}
      {job ? (
        <ConfirmBar
          text={`Run: ${jobs.find((j) => j.id === job)?.label}? This writes an audit row.`}
          onYes={() => {
            const found = jobs.find((j) => j.id === job);
            patchStore(() => {}, { action: `command_${job}`, target: "batch" });
            setJob(null);
            toast(found?.result || "Done");
          }}
          onNo={() => setJob(null)}
        />
      ) : null}
      <div className="grid gap-3 md:grid-cols-2">
        {jobs.map((j) => (
          <button key={j.id} type="button" className="admin-card p-5 text-left" onClick={() => setJob(j.id)}>
            <p className="font-semibold">{j.label}</p>
            <p className="mt-1 text-[12px] text-white/45">Confirm required · logged in audit</p>
          </button>
        ))}
        <button
          type="button"
          className="admin-card p-5 text-left"
          onClick={() => {
            const s = getStore();
            downloadCsv("users.csv", toCsv(s.users.map((u) => ({ account: u.account, vip: u.vip, invest: u.invest, brokerage: u.brokerage, status: u.status }))));
            toast("users.csv downloaded");
          }}
        >
          <p className="font-semibold">Export users CSV</p>
        </button>
        <button
          type="button"
          className="admin-card p-5 text-left"
          onClick={() => {
            const s = getStore();
            downloadCsv("deposits.csv", toCsv(s.recharges.map((r) => ({ account: r.account, amount: r.amount, status: r.status }))));
            toast("deposits.csv downloaded");
          }}
        >
          <p className="font-semibold">Export deposits CSV</p>
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
          <p className="mt-1 text-[12px] text-white/45">Users, VIP, coins, CMS, notices, FAQ, activities</p>
        </button>
      </div>
      <p className="mt-4 text-[12px] text-white/35">Wipe database is not exposed. Super-admin + typed CONFIRM will be added with the real DB.</p>
    </AdminShell>
  );
}
