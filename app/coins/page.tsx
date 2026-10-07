"use client";

import { useEffect, useState } from "react";
import { AddPanel } from "@/components/AddPanel";
import { AdminShell } from "@/components/AdminShell";
import { useToast } from "@/components/Feedback";
import { nid, type CoinRow } from "@/lib/store";

export default function Page() {
  const { toast, node } = useToast();
  const [rows, setRows] = useState<CoinRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState("");
  const [network, setNetwork] = useState("");
  const [min, setMin] = useState("10");
  const [address, setAddress] = useState("");

  async function load() {
    const res = await fetch("/api/pay-rails", { cache: "no-store" });
    const data = (await res.json()) as { coins?: CoinRow[]; error?: string };
    if (!res.ok) {
      toast(data.error || "Could not load pay_rails");
      return;
    }
    setRows(Array.isArray(data.coins) ? data.coins : []);
  }

  useEffect(() => {
    void load();
  }, []);

  async function saveCoin(coin: CoinRow, message?: string) {
    setBusy(true);
    try {
      const res = await fetch("/api/pay-rails", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(coin),
      });
      const data = (await res.json()) as { coin?: CoinRow; error?: string };
      if (!res.ok || !data.coin) {
        toast(data.error || "Save to database failed");
        return;
      }
      setRows((prev) => {
        const rest = prev.filter((r) => r.id !== data.coin!.id);
        return [...rest, data.coin!].sort((a, b) => a.id.localeCompare(b.id));
      });
      if (message) toast(message);
    } finally {
      setBusy(false);
    }
  }

  async function patch(id: string, patch: Partial<CoinRow>, message?: string) {
    const current = rows.find((r) => r.id === id);
    if (!current) return;
    await saveCoin({ ...current, ...patch }, message);
  }

  return (
    <AdminShell title="Receiving accounts">
      {node}
      <p className="mb-4 max-w-3xl text-[13px] leading-5 text-white/50">
        Every field on these cards writes to Zuvo table <strong className="text-white/70">pay_rails</strong> (bank name,
        title, account, IBAN, SWIFT, branch, instructions). Member Fund wallet reads this table live.
      </p>
      <AddPanel
        title="Add currency"
        hint="Saved as one row in pay_rails. Example: PKR with your bank IBAN, or USDT with your wallet."
        submit="Save to database"
        onSubmit={() => {
          if (busy) return;
          if (!name.trim()) {
            toast("Currency name is required");
            return;
          }
          const id =
            name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || nid("coin");
          if (rows.some((c) => c.id === id || c.name.toUpperCase() === name.trim().toUpperCase())) {
            toast("That currency already exists");
            return;
          }
          const crypto = id === "usdt";
          void saveCoin(
            {
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
            },
            "Saved to pay_rails"
          );
          setName("");
          setNetwork("");
          setMin("10");
          setAddress("");
        }}
      >
        <input value={name} onChange={(e) => setName(e.target.value)} className="admin-input" placeholder="Currency e.g. PKR" />
        <input value={network} onChange={(e) => setNetwork(e.target.value)} className="admin-input" placeholder="Country / network e.g. Pakistan" />
        <input value={min} onChange={(e) => setMin(e.target.value)} className="admin-input" placeholder="Min fund" />
        <input
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          className="admin-input md:col-span-2 font-mono text-[12px]"
          placeholder="Wallet or account number"
        />
      </AddPanel>
      <div className="grid gap-3 lg:grid-cols-2">
        {rows.map((row) => {
          const crypto = row.payKind === "crypto" || row.id === "usdt";
          return (
            <article key={row.id} className="admin-card space-y-3 p-5">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.14em] text-white/40">
                    {crypto ? "Crypto wallet" : "Bank account"} · <span className="text-white/30">pay_rails</span>
                  </p>
                  <input
                    defaultValue={row.name}
                    className="admin-input mt-1 h-10 max-w-[140px] font-semibold"
                    disabled={busy}
                    onBlur={(e) => {
                      const next = e.target.value.trim().toUpperCase();
                      if (next && next !== row.name) void patch(row.id, { name: next }, "Name saved");
                    }}
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="ghost-btn"
                    disabled={busy}
                    onClick={() => void patch(row.id, { enabled: !row.enabled }, row.enabled ? "Hidden from wallet" : "On wallet")}
                  >
                    {row.enabled ? "On wallet" : "Hidden"}
                  </button>
                  <button
                    type="button"
                    className="ghost-btn"
                    disabled={busy}
                    onClick={() => {
                      if (rows.length < 2) {
                        toast("Keep at least one currency");
                        return;
                      }
                      void (async () => {
                        setBusy(true);
                        try {
                          const res = await fetch(`/api/pay-rails?id=${encodeURIComponent(row.id)}`, { method: "DELETE" });
                          const data = (await res.json()) as { error?: string };
                          if (!res.ok) {
                            toast(data.error || "Delete failed");
                            return;
                          }
                          await load();
                          toast("Removed from pay_rails");
                        } finally {
                          setBusy(false);
                        }
                      })();
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
                    disabled={busy}
                    onBlur={(e) => {
                      const v = e.target.value.trim() || "Bank";
                      if (v !== row.network) void patch(row.id, { network: v }, "Saved");
                    }}
                  />
                </label>
                <label className="block text-[12px] text-white/50">
                  Minimum fund
                  <input
                    defaultValue={row.min}
                    className="admin-input mt-1"
                    disabled={busy}
                    onBlur={(e) => {
                      const v = e.target.value.trim() || "1";
                      if (v !== row.min) void patch(row.id, { min: v }, "Saved");
                    }}
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
                    disabled={busy}
                    onBlur={(e) => {
                      const v = e.target.value.trim();
                      if (v !== row.address) void patch(row.id, { address: v }, "Wallet saved to DB");
                    }}
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
                      disabled={busy}
                      onBlur={(e) => {
                        const v = e.target.value.trim();
                        if (v !== (row.bankName || "")) void patch(row.id, { bankName: v }, "Bank name saved");
                      }}
                    />
                  </label>
                  <label className="block text-[12px] text-white/50">
                    Account title
                    <input
                      defaultValue={row.accountName}
                      className="admin-input mt-1"
                      placeholder="Company / account holder"
                      disabled={busy}
                      onBlur={(e) => {
                        const v = e.target.value.trim();
                        if (v !== (row.accountName || "")) void patch(row.id, { accountName: v }, "Account title saved");
                      }}
                    />
                  </label>
                  <label className="block text-[12px] text-white/50">
                    Account number
                    <input
                      defaultValue={row.accountNumber || row.address}
                      className="admin-input mt-1 font-mono text-[12px]"
                      placeholder="Bank account number"
                      disabled={busy}
                      onBlur={(e) => {
                        const v = e.target.value.trim();
                        if (v !== (row.accountNumber || row.address || "")) {
                          void patch(row.id, { accountNumber: v, address: v }, "Account number saved");
                        }
                      }}
                    />
                  </label>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="block text-[12px] text-white/50">
                      IBAN
                      <input
                        defaultValue={row.iban}
                        className="admin-input mt-1 font-mono text-[12px]"
                        disabled={busy}
                        onBlur={(e) => {
                          const v = e.target.value.trim();
                          if (v !== (row.iban || "")) void patch(row.id, { iban: v }, "IBAN saved");
                        }}
                      />
                    </label>
                    <label className="block text-[12px] text-white/50">
                      SWIFT / BIC
                      <input
                        defaultValue={row.swift}
                        className="admin-input mt-1 font-mono text-[12px]"
                        disabled={busy}
                        onBlur={(e) => {
                          const v = e.target.value.trim();
                          if (v !== (row.swift || "")) void patch(row.id, { swift: v }, "SWIFT saved");
                        }}
                      />
                    </label>
                  </div>
                  <label className="block text-[12px] text-white/50">
                    Branch
                    <input
                      defaultValue={row.branch}
                      className="admin-input mt-1"
                      disabled={busy}
                      onBlur={(e) => {
                        const v = e.target.value.trim();
                        if (v !== (row.branch || "")) void patch(row.id, { branch: v }, "Branch saved");
                      }}
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
                  disabled={busy}
                  onBlur={(e) => {
                    const v = e.target.value.trim();
                    if (v !== (row.instructions || "")) void patch(row.id, { instructions: v }, "Instructions saved");
                  }}
                />
              </label>
            </article>
          );
        })}
      </div>
    </AdminShell>
  );
}
