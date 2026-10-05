"use client";

import { useEffect, useState } from "react";
import { AdminShell } from "@/components/AdminShell";
import { useToast } from "@/components/Feedback";
import { getStore, patchStore, type CoinRow } from "@/lib/store";

export default function Page() {
  const { toast, node } = useToast();
  const [row, setRow] = useState<CoinRow | null>(null);

  useEffect(() => {
    const coins = getStore().coins;
    const usdt = coins.find((c) => c.id === "usdt") ?? coins[0] ?? null;
    setRow(usdt);
  }, []);

  function save(field: keyof CoinRow, value: string | boolean) {
    if (!row) return;
    patchStore((s) => {
      if (!s.coins.length) {
        s.coins.push({
          id: "usdt",
          name: "USDT",
          network: "Wallet",
          min: "10",
          address: "OLX-USDT-WALLET-DEMO",
          enabled: true,
        });
      }
      const c = s.coins.find((x) => x.id === row.id) ?? s.coins[0];
      if (c) (c as Record<string, unknown>)[field] = value;
    }, { action: "usdt_edit", target: String(field) });
    const coins = getStore().coins;
    setRow(coins.find((c) => c.id === row.id) ?? coins[0]);
    toast("USDT wallet saved");
  }

  if (!row) {
    return (
      <AdminShell title="USDT wallet">
        {node}
        <p className="text-[13px] text-white/50">No USDT wallet yet.</p>
      </AdminShell>
    );
  }

  return (
    <AdminShell title="USDT wallet">
      {node}
      <p className="mb-4 max-w-2xl text-[13px] leading-5 text-white/50">
        Members fund and withdraw in USDT only. There is no coin list. When the database is connected, this address is the live deposit wallet.
      </p>
      <div className="admin-card max-w-2xl space-y-4 p-5">
        <label className="block text-[12px] text-white/50">
          Display name
          <input defaultValue={row.name} className="admin-input mt-1" onBlur={(e) => save("name", e.target.value.trim() || "USDT")} />
        </label>
        <label className="block text-[12px] text-white/50">
          Minimum fund (USDT)
          <input defaultValue={row.min} className="admin-input mt-1" onBlur={(e) => save("min", e.target.value.trim() || "10")} />
        </label>
        <label className="block text-[12px] text-white/50">
          Deposit wallet
          <input defaultValue={row.address} className="admin-input mt-1 font-mono text-[12px]" onBlur={(e) => save("address", e.target.value.trim())} />
        </label>
        <button type="button" className="ghost-btn" onClick={() => save("enabled", !row.enabled)}>
          {row.enabled ? "Funding on" : "Funding paused"}
        </button>
      </div>
    </AdminShell>
  );
}
