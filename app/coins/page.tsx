"use client";

import { useEffect, useState } from "react";
import { AddPanel } from "@/components/AddPanel";
import { AdminShell } from "@/components/AdminShell";
import { useToast } from "@/components/Feedback";
import { fetchOpsStore, getStore, nid, patchStore, type CoinRow } from "@/lib/store";

export default function Page() {
  const { toast, node } = useToast();
  const [rows, setRows] = useState<CoinRow[]>([]);
  const [name, setName] = useState("");
  const [network, setNetwork] = useState("");
  const [min, setMin] = useState("10");
  const [address, setAddress] = useState("");

  function refresh() {
    setRows(getStore().coins);
  }

  useEffect(() => {
    void fetchOpsStore().then((store) => setRows(store.coins));
  }, []);

  function commit(update: (store: ReturnType<typeof getStore>) => void, audit: { action: string; target: string }) {
    const store = patchStore(update, audit);
    setRows(store.coins);
  }

  return (
    <AdminShell title="Currencies">
      {node}
      <p className="mb-4 max-w-2xl text-[13px] leading-5 text-white/50">
        Add country money such as PKR, USD, EUR, plus USDT. Enabled currencies show on member Fund and Withdraw.
      </p>
      <AddPanel
        title="Add currency"
        hint="Example: PKR, USD, AED. Saved to Zuvo and listed on the member wallet."
        submit="Add currency"
        onSubmit={() => {
          if (!name.trim() || !address.trim()) {
            toast("Name and deposit address are required");
            return;
          }
          const id =
            name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || nid("coin");
          if (getStore().coins.some((c) => c.id === id || c.name.toUpperCase() === name.trim().toUpperCase())) {
            toast("That currency already exists");
            return;
          }
          commit(
            (s) => {
              s.coins.push({
                id,
                name: name.trim().toUpperCase(),
                network: network.trim() || "Wallet",
                min: min.trim() || "10",
                address: address.trim(),
                enabled: true,
              });
            },
            { action: "coin_add", target: name.trim().toUpperCase() }
          );
          setName("");
          setNetwork("");
          setMin("10");
          setAddress("");
          toast("Currency added");
        }}
      >
        <input value={name} onChange={(e) => setName(e.target.value)} className="admin-input" placeholder="Currency e.g. PKR" />
        <input value={network} onChange={(e) => setNetwork(e.target.value)} className="admin-input" placeholder="Country e.g. Pakistan" />
        <input value={min} onChange={(e) => setMin(e.target.value)} className="admin-input" placeholder="Min fund" />
        <input value={address} onChange={(e) => setAddress(e.target.value)} className="admin-input md:col-span-2 font-mono text-[12px]" placeholder="Deposit address" />
      </AddPanel>
      <div className="grid gap-3 md:grid-cols-2">
        {rows.map((row) => (
          <article key={row.id} className="admin-card space-y-3 p-5">
            <div className="flex items-center justify-between gap-2">
              <input
                defaultValue={row.name}
                className="admin-input h-10 max-w-[140px] font-semibold"
                onBlur={(e) => {
                  const next = e.target.value.trim().toUpperCase();
                  if (!next) return;
                  commit((s) => {
                    const c = s.coins.find((x) => x.id === row.id);
                    if (c) c.name = next;
                  }, { action: "coin_edit", target: row.id });
                }}
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  className="ghost-btn"
                  onClick={() =>
                    commit((s) => {
                      const c = s.coins.find((x) => x.id === row.id);
                      if (c) c.enabled = !c.enabled;
                    }, { action: "coin_toggle", target: row.id })
                  }
                >
                  {row.enabled ? "On wallet" : "Hidden"}
                </button>
                <button
                  type="button"
                  className="ghost-btn"
                  onClick={() => {
                    if (rows.length < 2) {
                      toast("Keep at least one currency");
                      return;
                    }
                    commit((s) => {
                      s.coins = s.coins.filter((x) => x.id !== row.id);
                    }, { action: "coin_delete", target: row.id });
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
            <label className="block text-[12px] text-white/50">
              Network
              <input
                defaultValue={row.network}
                className="admin-input mt-1"
                onBlur={(e) =>
                  commit((s) => {
                    const c = s.coins.find((x) => x.id === row.id);
                    if (c) c.network = e.target.value.trim() || "Wallet";
                  }, { action: "coin_network", target: row.id })
                }
              />
            </label>
            <label className="block text-[12px] text-white/50">
              Minimum fund
              <input
                defaultValue={row.min}
                className="admin-input mt-1"
                onBlur={(e) =>
                  commit((s) => {
                    const c = s.coins.find((x) => x.id === row.id);
                    if (c) c.min = e.target.value.trim() || "1";
                  }, { action: "coin_min", target: row.id })
                }
              />
            </label>
            <label className="block text-[12px] text-white/50">
              Deposit address
              <input
                defaultValue={row.address}
                className="admin-input mt-1 font-mono text-[12px]"
                onBlur={(e) =>
                  commit((s) => {
                    const c = s.coins.find((x) => x.id === row.id);
                    if (c) c.address = e.target.value.trim();
                  }, { action: "coin_address", target: row.id })
                }
              />
            </label>
          </article>
        ))}
      </div>
    </AdminShell>
  );
}
