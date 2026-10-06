"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AdminShell } from "@/components/AdminShell";
import { fetchOpsStore, getStore } from "@/lib/store";

export default function Page() {
  const [s, setS] = useState(() => ({ ...getStore(), users: [] as ReturnType<typeof getStore>["users"] }));
  useEffect(() => {
    void fetchOpsStore().then(setS);
  }, []);

  const todayIn = s.recharges.filter((r) => r.status === "paid").reduce((n, r) => n + r.amount, 0);
  const pendingOut = s.withdraws.filter((w) => w.status === "pending");
  const large = pendingOut.filter((w) => w.amount >= 50);
  const livePackages = s.vips.filter((p) => p.enabled);

  const cards = [
    { label: "Members", value: String(s.users.length) },
    { label: "Package members", value: String(s.users.filter((u) => u.vip !== "—").length) },
    { label: "Live car packages", value: String(livePackages.length) },
    { label: "Invest total", value: `$${s.users.reduce((n, u) => n + u.invest, 0).toFixed(2)}` },
    { label: "Brokerage total", value: `$${s.users.reduce((n, u) => n + u.brokerage, 0).toFixed(2)}` },
    { label: "Pending recharge", value: String(s.recharges.filter((r) => r.status === "pending").length) },
    { label: "Pending withdraw", value: String(pendingOut.length) },
    { label: "Paid deposits", value: `$${todayIn.toFixed(2)}` },
  ];

  return (
    <AdminShell title="Dashboard">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map((card) => (
          <article key={card.label} className="admin-card stat-card">
            <p className="text-[12px] font-medium text-[#6b6f7c]">{card.label}</p>
            <p className="mt-2 text-[22px] font-semibold tracking-tight text-[#f4f5f8]">{card.value}</p>
          </article>
        ))}
      </div>
      <section className="admin-card mt-4 p-5">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-[13px] font-semibold text-[#9aa0ae]">Car packages</h2>
          <Link href="/vip" className="text-[12px] font-medium text-[#a5b4fc]">
            Manage packages →
          </Link>
        </div>
        <div className="grid gap-2 md:grid-cols-2">
          {livePackages.map((plan) => (
            <div key={plan.id} className="flex items-center justify-between rounded-lg border border-[#1c1d24] px-3 py-2.5">
              <div>
                <p className="text-[13px] font-medium text-[#eceef4]">{plan.name}</p>
                <p className="text-[12px] text-[#6b6f7c]">
                  {plan.kind === "used" ? "Used" : "New"} · {plan.range} · {plan.days} days
                </p>
              </div>
              <p className="text-[13px] text-[#6ee7b7]">{plan.income}</p>
            </div>
          ))}
        </div>
      </section>
      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <section className="admin-card p-5">
          <h2 className="mb-3 text-[13px] font-semibold text-[#9aa0ae]">Alerts</h2>
          {large.length ? (
            large.map((w) => (
              <div key={w.id} className="mb-2 rounded-lg border border-amber-500/20 bg-amber-500/8 px-3 py-2.5 text-[13px] text-amber-300">
                Large withdraw {w.amount} USDT · {w.account}
              </div>
            ))
          ) : (
            <p className="text-[13px] leading-6 text-[#9aa0ae]">No large pending withdrawals. Queue looks healthy.</p>
          )}
          {s.settings.maintenance ? (
            <p className="mt-2 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2.5 text-[13px] text-red-300">
              Maintenance: {s.settings.maintenance}
            </p>
          ) : null}
        </section>
        <section className="admin-card p-5">
          <h2 className="mb-3 text-[13px] font-semibold text-[#9aa0ae]">Recent activity</h2>
          {s.audit.slice(0, 5).map((row) => (
            <div key={row.id} className="flex items-start justify-between gap-3 border-b border-[#1c1d24] py-2.5 last:border-0">
              <div>
                <p className="text-[13px] font-medium text-[#eceef4]">{row.action.replaceAll("_", " ")}</p>
                <p className="text-[12px] text-[#6b6f7c]">{row.target}{row.amount ? ` · ${row.amount}` : ""}</p>
              </div>
              <p className="shrink-0 text-[11px] text-[#6b6f7c]">{row.at}</p>
            </div>
          ))}
        </section>
      </div>
    </AdminShell>
  );
}
