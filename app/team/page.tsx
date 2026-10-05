"use client";

import { useEffect, useState } from "react";
import { AdminShell } from "@/components/AdminShell";
import { useToast } from "@/components/Feedback";
import { getStore, patchStore, type Settings } from "@/lib/store";

export default function Page() {
  const { toast, node } = useToast();
  const [s, setS] = useState<Settings | null>(null);
  useEffect(() => setS(getStore().settings), []);
  if (!s) return <AdminShell title="Team rates">Loading…</AdminShell>;

  function save(next: Settings) {
    patchStore((st) => {
      st.settings = next;
    }, { action: "commission_rates", target: "settings" });
    setS(next);
    toast("Rates saved — public /team/level will use these after DB connect");
  }

  return (
    <AdminShell title="Team / invite / commission">
      {node}
      <div className="admin-card max-w-xl space-y-4 p-5">
        <p className="text-[13px] text-white/55">LEV 1–3 on the member Team page. Change without code.</p>
        {[
          ["commissionL1", "LEV 1 direct %"] as const,
          ["commissionL2", "LEV 2 %"] as const,
          ["commissionL3", "LEV 3 %"] as const,
        ].map(([key, label]) => (
          <label key={key} className="block">
            <span className="text-[12px] text-white/50">{label}</span>
            <input
              type="number"
              value={s[key]}
              className="admin-input mt-1"
              onChange={(e) => setS({ ...s, [key]: Number(e.target.value) })}
            />
          </label>
        ))}
        <button type="button" className="admin-btn px-8" onClick={() => save(s)}>
          Save rates
        </button>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <article className="admin-card p-4">
          <p className="text-white/50">LEV 1</p>
          <p className="text-[28px] font-semibold text-[#7ee0ff]">{s.commissionL1}%</p>
        </article>
        <article className="admin-card p-4">
          <p className="text-white/50">LEV 2</p>
          <p className="text-[28px] font-semibold text-[#7ee0ff]">{s.commissionL2}%</p>
        </article>
        <article className="admin-card p-4">
          <p className="text-white/50">LEV 3</p>
          <p className="text-[28px] font-semibold text-[#7ee0ff]">{s.commissionL3}%</p>
        </article>
      </div>
    </AdminShell>
  );
}
