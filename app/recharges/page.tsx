"use client";

import { useEffect, useState } from "react";
import { AddPanel } from "@/components/AddPanel";
import { AdminShell } from "@/components/AdminShell";
import { ConfirmBar, useToast } from "@/components/Feedback";
import { slipHref } from "@/lib/slip-href";
import type { OrderRow } from "@/lib/store";

export default function Page() {
  const { toast, node } = useToast();
  const [rows, setRows] = useState<OrderRow[]>([]);
  const [pending, setPending] = useState<OrderRow | null>(null);
  const [action, setAction] = useState<"paid" | "rejected" | null>(null);
  const [note, setNote] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [account, setAccount] = useState("");
  const [amount, setAmount] = useState("");
  const [network, setNetwork] = useState("PKR");
  const [manualNote, setManualNote] = useState("");

  async function load() {
    const res = await fetch("/api/recharges", { cache: "no-store" });
    const data = (await res.json()) as { recharges?: OrderRow[]; error?: string };
    if (!res.ok) {
      toast(data.error || "Could not load recharges");
      return;
    }
    setRows(Array.isArray(data.recharges) ? data.recharges : []);
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <AdminShell title="Recharges">
      {node}
      <p className="mb-4 max-w-3xl text-[13px] leading-6 text-white/50">
        Member slips land in the table. <strong className="text-white/70">Add recharge</strong> is only if someone paid
        outside the app — you log it, then still Approve to credit the wallet.
      </p>
      <AddPanel
        title="Add recharge"
        hint="Manual ticket when the member paid but did not submit in the app. Wallet stays empty until you Approve."
        submit="Add pending ticket"
        onSubmit={() => {
          if (busy) return;
          if (!account.trim() || !Number(amount)) {
            toast("Member account and amount are required");
            return;
          }
          setBusy(true);
          void fetch("/api/recharges", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              account: account.trim(),
              amount: Number(amount),
              network: network.trim() || "PKR",
              note: manualNote.trim(),
            }),
          })
            .then(async (res) => {
              const data = (await res.json()) as { error?: string };
              if (!res.ok) {
                toast(data.error || "Could not save ticket");
                return;
              }
              setAccount("");
              setAmount("");
              setManualNote("");
              await load();
              toast("Pending ticket saved — Approve when you confirm the payment");
            })
            .finally(() => setBusy(false));
        }}
      >
        <input value={account} onChange={(e) => setAccount(e.target.value)} className="admin-input" placeholder="Member account / phone" />
        <input value={amount} onChange={(e) => setAmount(e.target.value)} className="admin-input" placeholder="Amount" />
        <input value={network} onChange={(e) => setNetwork(e.target.value)} className="admin-input" placeholder="Currency e.g. PKR" />
        <input value={manualNote} onChange={(e) => setManualNote(e.target.value)} className="admin-input" placeholder="Note (optional)" />
      </AddPanel>
      {pending && action ? (
        <ConfirmBar
          text={`${action === "paid" ? "Approve and credit invest" : "Reject"} ${pending.amount} for ${pending.account}?`}
          onYes={() => {
            const act = action === "paid" ? "approve_recharge" : "reject_recharge";
            setBusy(true);
            void fetch("/api/finance", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ action: act, id: pending.id, note }),
            })
              .then(async (res) => {
                const data = (await res.json()) as { error?: string };
                if (!res.ok) {
                  toast(data.error || "Update failed");
                  return;
                }
                await load();
                toast(action === "paid" ? "Approved — invest credited" : "Rejected");
              })
              .finally(() => {
                setBusy(false);
                setPending(null);
                setAction(null);
                setNote("");
              });
          }}
          onNo={() => {
            setPending(null);
            setAction(null);
          }}
        />
      ) : null}
      <div className="admin-card overflow-x-auto p-4">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Account</th>
              <th>Amount</th>
              <th>Network</th>
              <th>Slip / bill</th>
              <th>Status</th>
              <th>Time</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-white/40">
                  No deposit tickets yet. When a member uploads a slip on Fund wallet, it shows here.
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const href = slipHref(row.slipUrl || "");
                return (
                  <tr key={row.id}>
                    <td>{row.account}</td>
                    <td>{row.amount}</td>
                    <td>{row.network}</td>
                    <td>
                      {href ? (
                        <button
                          type="button"
                          className="inline-flex items-center gap-2 text-[#9ec6ff]"
                          onClick={() => setPreview(href)}
                        >
                          <img
                            src={href}
                            alt=""
                            className="h-12 w-12 rounded-md border border-white/10 object-cover"
                          />
                          Check slip
                        </button>
                      ) : (
                        <span className="text-white/35">No slip</span>
                      )}
                    </td>
                    <td>
                      <span
                        className={`pill ${
                          row.status === "paid" ? "pill-ok" : row.status === "pending" ? "pill-wait" : "pill-bad"
                        }`}
                      >
                        {row.status}
                      </span>
                    </td>
                    <td className="text-white/55">{row.at}</td>
                    <td className="space-x-2">
                      {row.status === "pending" ? (
                        <>
                          <button
                            type="button"
                            className="ghost-btn"
                            disabled={busy}
                            onClick={() => {
                              setPending(row);
                              setAction("paid");
                            }}
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            className="ghost-btn"
                            disabled={busy}
                            onClick={() => {
                              setPending(row);
                              setAction("rejected");
                            }}
                          >
                            Reject
                          </button>
                        </>
                      ) : null}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      {pending ? (
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="admin-input mt-3 max-w-lg"
          placeholder="Note (optional)"
        />
      ) : null}

      {preview ? (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/75 p-4"
          onClick={() => setPreview(null)}
          role="presentation"
        >
          <div
            className="max-h-[90vh] max-w-lg overflow-auto rounded-2xl border border-white/10 bg-[#12141c] p-3"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-label="Deposit slip"
          >
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-[13px] font-medium text-white/80">Deposit slip</p>
              <button type="button" className="ghost-btn" onClick={() => setPreview(null)}>
                Close
              </button>
            </div>
            <img src={preview} alt="Deposit slip" className="max-h-[75vh] w-full rounded-xl object-contain" />
            <a href={preview} target="_blank" rel="noreferrer" className="mt-3 inline-block text-[12px] text-[#9ec6ff]">
              Open full size
            </a>
          </div>
        </div>
      ) : null}
    </AdminShell>
  );
}
