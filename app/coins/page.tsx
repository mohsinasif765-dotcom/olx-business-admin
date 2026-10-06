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

  useEffect(() => {
    void fetchOpsStore().then((store) => setRows(store.coins));
  }, []);

  function commit(update: (store: ReturnType<typeof getStore>) => void, audit: { action: string; target: string }) {
    const store = patchStore(update, audit);
    setRows(store.coins);
  }

  function setField(id: string, key: keyof CoinRow, value: string | boolean) {
    commit((s) => {
      const c = s.coins.find((x) => x.id === id);
      if (!c) return;
      (c as Record<string, unknown>)[key] = value;
    }, { action: `coin_${String(key)}`, target: id });
  }

  return (
    <AdminShell title="Receiving accounts">
      {node}
      <p className="mb-4 max-w-3xl text-[13px] leading-5 text-white/50">
        Put the company bank or USDT wallet here. Investors pay these accounts. After they submit a deposit, approve it on Recharges to credit their invest wallet.
      </p>
      <AddPanel
        title="Add currency"
        hint="Example: PKR with your bank IBAN, or USDT with your wallet."
        submit="Add currency"
        onSubmit={() => {
          if (!name.trim()) {
            toast("Currency name is required");
            return;
          }
          const id =
            name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || nid("coin");
          if (getStore().coins.some((c) => c.id === id || c.name.toUpperCase() === name.trim().toUpperCase())) {
            toast("That currency already exists");
            return;
          }
          const crypto = id === "usdt";
          commit(
            (s) => {
              s.coins.push({
                id,
                name: name.trim().toUpperCase(),
                network: network.trim() || (crypto ? "Tether" : "Bank"),
                min: min.trim() || "10",
                address: address.trim(),
                enabled: true,
                payKind: crypto ? "crypto" : "bank",
                bankName: "",
                accountName: "",
                accountNumber: crypto ? "" : address.trim(),
                iban: "",
                swift: "",
                branch: "",
                instructions: "",
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
        <input value={network} onChange={(e) => setNetwork(e.target.value)} className="admin-input" placeholder="Country / network e.g. Pakistan" />
        <input value={min} onChange={(e) => setMin(e.target.value)} className="admin-input" placeholder="Min fund" />
        <input value={address} onChange={(e) => setAddress(e.target.value)} className="admin-input md:col-span-2 font-mono text-[12px]" placeholder="Wallet or account number" />
      </AddPanel>
      <div className="grid gap-3 lg:grid-cols-2">
        {rows.map((row) => {
          const crypto = (row.payKind || row.id) === "crypto" || row.id === "usdt";
          return (
            <article key={row.id} className="admin-card space-y-3 p-5">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.14em] text-white/40">{crypto ? "Crypto wallet" : "Bank account"}</p>
                  <input
                    defaultValue={row.name}
                    className="admin-input mt-1 h-10 max-w-[140px] font-semibold"
                    onBlur={(e) => {
                      const next = e.target.value.trim().toUpperCase();
                      if (next) setField(row.id, "name", next);
                    }}
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="ghost-btn"
                    onClick={() => setField(row.id, "enabled", !row.enabled)}
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
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-[12px] text-white/50">
                  {crypto ? "Network" : "Country"}
                  <input
                    defaultValue={row.network}
                    className="admin-input mt-1"
                    onBlur={(e) => setField(row.id, "network", e.target.value.trim() || "Bank")}
                  />
                </label>
                <label className="block text-[12px] text-white/50">
                  Minimum fund
                  <input
                    defaultValue={row.min}
                    className="admin-input mt-1"
                    onBlur={(e) => setField(row.id, "min", e.target.value.trim() || "1")}
                  />
                </label>
              </div>
              {crypto ? (
                <label className="block text-[12px] text-white/50">
                  USDT wallet (investor pays here)
                  <input
                    defaultValue={row.address}
                    className="admin-input mt-1 font-mono text-[12px]"
                    placeholder="TRC20 / ERC20 address"
                    onBlur={(e) => setField(row.id, "address", e.target.value.trim())}
                  />
                </label>
              ) : (
                <>
                  <label className="block text-[12px] text-white/50">
                    Bank name
                    <input
                      defaultValue={row.bankName}
                      className="admin-input mt-1"
                      placeholder="HBL, Meezan, Emirates NBD…"
                      onBlur={(e) => setField(row.id, "bankName", e.target.value.trim())}
                    />
                  </label>
                  <label className="block text-[12px] text-white/50">
                    Account title
                    <input
                      defaultValue={row.accountName}
                      className="admin-input mt-1"
                      placeholder="Company / account holder"
                      onBlur={(e) => setField(row.id, "accountName", e.target.value.trim())}
                    />
                  </label>
                  <label className="block text-[12px] text-white/50">
                    Account number
                    <input
                      defaultValue={row.accountNumber || row.address}
                      className="admin-input mt-1 font-mono text-[12px]"
                      placeholder="Bank account number"
                      onBlur={(e) => {
                        const v = e.target.value.trim();
                        setField(row.id, "accountNumber", v);
                        setField(row.id, "address", v);
                      }}
                    />
                  </label>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="block text-[12px] text-white/50">
                      IBAN
                      <input
                        defaultValue={row.iban}
                        className="admin-input mt-1 font-mono text-[12px]"
                        onBlur={(e) => setField(row.id, "iban", e.target.value.trim())}
                      />
                    </label>
                    <label className="block text-[12px] text-white/50">
                      SWIFT / BIC
                      <input
                        defaultValue={row.swift}
                        className="admin-input mt-1 font-mono text-[12px]"
                        onBlur={(e) => setField(row.id, "swift", e.target.value.trim())}
                      />
                    </label>
                  </div>
                  <label className="block text-[12px] text-white/50">
                    Branch
                    <input
                      defaultValue={row.branch}
                      className="admin-input mt-1"
                      onBlur={(e) => setField(row.id, "branch", e.target.value.trim())}
                    />
                  </label>
                </>
              )}
              <label className="block text-[12px] text-white/50">
                Instructions shown to investor
                <textarea
                  defaultValue={row.instructions}
                  className="admin-input mt-1 min-h-[72px] py-2"
                  placeholder="e.g. Use your email as transfer reference."
                  onBlur={(e) => setField(row.id, "instructions", e.target.value.trim())}
                />
              </label>
            </article>
          );
        })}
      </div>
    </AdminShell>
  );
}
