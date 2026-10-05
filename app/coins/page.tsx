"use client";

import { useEffect, useState } from "react";
import { AddPanel } from "@/components/AddPanel";
import { AdminShell } from "@/components/AdminShell";
import { useToast } from "@/components/Feedback";
import { getStore, nid, patchStore, type CoinRow } from "@/lib/store";

export default function Page() {
  const { toast, node } = useToast();
  const [rows, setRows] = useState<CoinRow[]>([]);
  const [name, setName] = useState("");
  const [network, setNetwork] = useState("");
  const [min, setMin] = useState("10");
  const [address, setAddress] = useState("");
  useEffect(() => setRows(getStore().coins), []);

  function save(id: string, field: keyof CoinRow, value: string | boolean) {
    patchStore((s) => {
      const c = s.coins.find((x) => x.id === id);
      if (c) (c as Record<string, unknown>)[field] = value;
    }, { action: "coin_edit", target: id });
    setRows(getStore().coins);
    toast("Coin saved");
  }

  return (
    <AdminShell title="Company deposit coins">
      {node}
      <AddPanel title="Add coin / network" hint="New recharge option with deposit address and minimum." onSubmit={() => {
        if (!name.trim() || !address.trim()) {
          toast("Name and address required");
          return;
        }
        patchStore((s) => {
          s.coins.push({
            id: nid("c"),
            name: name.trim(),
            network: network.trim() || name.trim(),
            min: min.trim() || "10",
            address: address.trim(),
            enabled: true,
          });
        }, { action: "coin_add", target: name.trim() });
        setName("");
        setNetwork("");
        setAddress("");
        setRows(getStore().coins);
        toast("Coin added");
      }}>
        <input value={name} onChange={(e) => setName(e.target.value)} className="admin-input" placeholder="Name e.g. SOL-USDT" />
        <input value={network} onChange={(e) => setNetwork(e.target.value)} className="admin-input" placeholder="Network e.g. SOL" />
        <input value={min} onChange={(e) => setMin(e.target.value)} className="admin-input" placeholder="Min amount" />
        <input value={address} onChange={(e) => setAddress(e.target.value)} className="admin-input" placeholder="Deposit address" />
      </AddPanel>
      <p className="mb-4 text-[13px] text-white/50">Replaces DEMO addresses in the member recharge screen after API wiring.</p>
      <div className="space-y-3">
        {rows.map((coin) => (
          <article key={coin.id} className="admin-card grid gap-2 p-4 md:grid-cols-5">
            <p className="font-semibold md:col-span-5">{coin.name}</p>
            <label className="text-[11px] text-white/45">
              Min
              <input defaultValue={coin.min} className="admin-input mt-1" onBlur={(e) => save(coin.id, "min", e.target.value)} />
            </label>
            <label className="text-[11px] text-white/45 md:col-span-3">
              Deposit address
              <input defaultValue={coin.address} className="admin-input mt-1 font-mono text-[12px]" onBlur={(e) => save(coin.id, "address", e.target.value)} />
            </label>
            <label className="flex items-end gap-2">
              <button type="button" className="ghost-btn w-full" onClick={() => save(coin.id, "enabled", !coin.enabled)}>
                {coin.enabled ? "Enabled" : "Disabled"}
              </button>
              <button
                type="button"
                className="ghost-btn"
                onClick={() => {
                  patchStore((s) => {
                    s.coins = s.coins.filter((c) => c.id !== coin.id);
                  }, { action: "coin_delete", target: coin.id });
                  setRows(getStore().coins);
                  toast("Coin removed");
                }}
              >
                Delete
              </button>
            </label>
          </article>
        ))}
      </div>
    </AdminShell>
  );
}
