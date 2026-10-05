"use client";

import { useState } from "react";
import { AdminShell } from "@/components/AdminShell";
import { ConfirmBar, useToast } from "@/components/Feedback";
import { publishCarCatalog } from "@/lib/publish-plans";
import { downloadCsv, downloadJson, getStore, patchStore, toCsv } from "@/lib/store";

export default function Page() {
  const { toast, node } = useToast();
  const [job, setJob] = useState<string | null>(null);

  const jobs = [
    { id: "publish", label: "Publish car packages to Cars", result: "Catalog sent to the member Cars page." },
    { id: "comm", label: "Recalculate team commissions", result: "Commission ledger rebuilt for 3 levels (demo)." },
    { id: "expire", label: "Expire finished car packages (dry-run)", result: "0 packages expired. 2 still active." },
    { id: "yield", label: "Credit package returns (batch)", result: "Returns credited to 2 members (demo)." },
  ];

  return (
    <AdminShell title="Commands">
      {node}
      {job ? (
        <ConfirmBar
          text={`Run: ${jobs.find((j) => j.id === job)?.label}? This writes an audit row.`}
          onYes={() => {
            const found = jobs.find((j) => j.id === job);
            if (job === "publish") {
              void publishCarCatalog(getStore().vips).then((result) => {
                patchStore(() => {}, { action: "command_publish", target: "car-packages" });
                setJob(null);
                toast(result.message);
              });
              return;
            }
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
      <p className="mt-4 text-[12px] text-white/35">Wipe database is not exposed. Super-admin + typed CONFIRM will be added with the real DB.</p>
    </AdminShell>
  );
}
