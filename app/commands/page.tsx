"use client";

import { useState } from "react";
import { AdminShell } from "@/components/AdminShell";
import { ConfirmBar, useToast } from "@/components/Feedback";
import { publishCarCatalog } from "@/lib/publish-plans";
import {
  downloadCsv,
  downloadJson,
  getStore,
  patchStore,
  toCsv,
  type Store,
} from "@/lib/store";

function money(value: string) {
  const n = Number(String(value).replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function rebuildCommissions(store: Store) {
  const rate = Number(store.settings.commissionL1) || 0;
  let total = 0;
  for (const user of store.users) {
    const downlines = store.users.filter((row) => row.upline === user.invite && row.status === "active");
    const book = downlines.reduce((sum, row) => sum + row.invest, 0);
    const credit = Number(((book * rate) / 100).toFixed(2));
    user.brokerage = credit;
    total += credit;
  }
  return `LEV 1 rebuilt at ${rate}%. Brokerage now ${total.toFixed(2)} USDT across ${store.users.length} members.`;
}

function expirePackages(store: Store) {
  const live = new Set(store.vips.filter((plan) => plan.enabled).map((plan) => plan.name));
  let cleared = 0;
  for (const user of store.users) {
    if (user.vip !== "—" && !live.has(user.vip)) {
      user.vip = "—";
      cleared += 1;
    }
  }
  const active = store.users.filter((user) => user.vip !== "—").length;
  return cleared
    ? `${cleared} members taken off disabled packages. ${active} still on a live plan.`
    : `No expired packages. ${active} members remain on live car plans.`;
}

function creditReturns(store: Store) {
  let count = 0;
  let total = 0;
  for (const user of store.users) {
    if (user.status !== "active" || user.vip === "—") continue;
    const plan = store.vips.find((row) => row.enabled && row.name === user.vip);
    if (!plan) continue;
    const ret = money(plan.income);
    user.invest = Number((user.invest + ret).toFixed(2));
    count += 1;
    total += ret;
  }
  return count
    ? `Package returns credited to ${count} members · ${total.toFixed(2)} USDT.`
    : "No members are on a live car package.";
}

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
      if (id === "publish") {
        const result = await publishCarCatalog(getStore().vips);
        patchStore(() => {}, { action: "command_publish", target: "car-packages" });
        toast(result.message);
        return;
      }
      let message = "";
      patchStore(
        (s) => {
          if (id === "comm") message = rebuildCommissions(s);
          if (id === "expire") message = expirePackages(s);
          if (id === "yield") message = creditReturns(s);
        },
        { action: `command_${id}`, target: "batch" }
      );
      toast(message);
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
        These jobs run on the admin store now. Publish needs the member app on port 3000. Commission and returns change member balances in this console until the database is connected.
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
