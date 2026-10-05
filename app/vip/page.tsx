"use client";

import { useEffect, useState } from "react";
import { AddPanel } from "@/components/AddPanel";
import { AdminShell } from "@/components/AdminShell";
import { useToast } from "@/components/Feedback";
import { getStore, nid, patchStore, type VipPlan } from "@/lib/store";

export default function Page() {
  const { toast, node } = useToast();
  const [rows, setRows] = useState<VipPlan[]>([]);
  const [name, setName] = useState("");
  const [range, setRange] = useState("");
  const [income, setIncome] = useState("");
  const [days, setDays] = useState("7");
  const [rebate, setRebate] = useState("0.01%");
  const [hashpower, setHashpower] = useState("");
  useEffect(() => setRows(getStore().vips), []);

  function toggle(id: string) {
    patchStore((s) => {
      const p = s.vips.find((v) => v.id === id);
      if (p) p.enabled = !p.enabled;
    }, { action: "vip_toggle", target: id });
    setRows(getStore().vips);
    toast("VIP plan updated");
  }

  function save(id: string, field: keyof VipPlan, value: string | number) {
    patchStore((s) => {
      const p = s.vips.find((v) => v.id === id);
      if (p) (p as Record<string, unknown>)[field] = value;
    });
    setRows(getStore().vips);
  }

  return (
    <AdminShell title="VIP / Mining products">
      {node}
      <AddPanel title="Add VIP plan" hint="New mining product. Disable or delete unused plans." onSubmit={() => {
        if (!name.trim() || !range.trim() || !income.trim()) {
          toast("Name, range and income required");
          return;
        }
        patchStore((s) => {
          s.vips.push({
            id: nid("vip"),
            name: name.trim(),
            range: range.trim(),
            income: income.trim(),
            days: Number(days) || 1,
            rebate: rebate.trim(),
            hashpower: hashpower.trim() || "—",
            enabled: true,
          });
        }, { action: "vip_add", target: name.trim() });
        setName("");
        setRange("");
        setIncome("");
        setHashpower("");
        setRows(getStore().vips);
        toast("VIP plan added");
      }}>
        <input value={name} onChange={(e) => setName(e.target.value)} className="admin-input" placeholder="Name e.g. VIP 9" />
        <input value={range} onChange={(e) => setRange(e.target.value)} className="admin-input" placeholder="Range e.g. $40,000+" />
        <input value={income} onChange={(e) => setIncome(e.target.value)} className="admin-input" placeholder="Income e.g. $200.00" />
        <input value={days} onChange={(e) => setDays(e.target.value)} className="admin-input" placeholder="Days" />
        <input value={rebate} onChange={(e) => setRebate(e.target.value)} className="admin-input" placeholder="Rebate" />
        <input value={hashpower} onChange={(e) => setHashpower(e.target.value)} className="admin-input" placeholder="Hashpower" />
      </AddPanel>
      <p className="mb-4 text-[13px] text-white/50">
        These rows match public /vip and mining hashpower. Toggle off to hide a plan after DB connect.
      </p>
      <div className="grid gap-3 md:grid-cols-2">
        {rows.map((plan) => (
          <article key={plan.id} className="admin-card space-y-2 p-4">
            <div className="flex items-center gap-2">
              <input
                defaultValue={plan.name}
                className="admin-input h-10 max-w-[140px]"
                onBlur={(e) => save(plan.id, "name", e.target.value)}
              />
              <button type="button" className="ghost-btn" onClick={() => toggle(plan.id)}>
                {plan.enabled ? "Enabled" : "Disabled"}
              </button>
              <button
                type="button"
                className="ghost-btn"
                onClick={() => {
                  patchStore((s) => {
                    s.vips = s.vips.filter((v) => v.id !== plan.id);
                  }, { action: "vip_delete", target: plan.id });
                  setRows(getStore().vips);
                  toast("Plan removed");
                }}
              >
                Delete
              </button>
            </div>
            <label className="text-[11px] text-white/45">Recharge range</label>
            <input defaultValue={plan.range} className="admin-input h-10" onBlur={(e) => save(plan.id, "range", e.target.value)} />
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] text-white/45">Daily income</label>
                <input defaultValue={plan.income} className="admin-input h-10" onBlur={(e) => save(plan.id, "income", e.target.value)} />
              </div>
              <div>
                <label className="text-[11px] text-white/45">Days</label>
                <input defaultValue={plan.days} className="admin-input h-10" onBlur={(e) => save(plan.id, "days", Number(e.target.value))} />
              </div>
              <div>
                <label className="text-[11px] text-white/45">Rebate</label>
                <input defaultValue={plan.rebate} className="admin-input h-10" onBlur={(e) => save(plan.id, "rebate", e.target.value)} />
              </div>
              <div>
                <label className="text-[11px] text-white/45">Hashpower</label>
                <input defaultValue={plan.hashpower} className="admin-input h-10" onBlur={(e) => save(plan.id, "hashpower", e.target.value)} />
              </div>
            </div>
          </article>
        ))}
      </div>
    </AdminShell>
  );
}
