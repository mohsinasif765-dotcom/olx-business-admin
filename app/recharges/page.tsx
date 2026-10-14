"use client";

import { useEffect, useMemo, useState } from "react";
import { AddPanel } from "@/components/AddPanel";
import { AdminShell } from "@/components/AdminShell";
import { ConfirmBar, useToast } from "@/components/Feedback";
import { fiatAmountToUsdt, formatDepositCreditNote, type DepositFxResult } from "@/lib/deposit-fx";
import { slipHref } from "@/lib/slip-href";
import type { CoinRow, OrderRow } from "@/lib/store";

type StatusGroup = "pending" | "paid" | "rejected";

function statusOf(row: OrderRow): StatusGroup {
  if (row.status === "paid") return "paid";
  if (row.status === "rejected") return "rejected";
  return "pending";
}

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
  const [usdtToPkrRate, setUsdtToPkrRate] = useState(280);
  const [rails, setRails] = useState<CoinRow[]>([]);

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
    void fetch("/api/settings", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { settings?: { usdtToPkrRate?: number }; usdtToPkrRate?: number } | null) => {
        const rate = Number(data?.settings?.usdtToPkrRate ?? data?.usdtToPkrRate) || 280;
        setUsdtToPkrRate(rate);
      })
      .catch(() => {});
    void fetch("/api/pay-rails", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { coins?: CoinRow[] } | null) => {
        setRails(Array.isArray(data?.coins) ? data.coins : []);
      })
      .catch(() => {});
  }, []);

  function creditPreview(row: OrderRow): DepositFxResult | null {
    try {
      return fiatAmountToUsdt(row.amount, row.network, usdtToPkrRate, rails);
    } catch {
      return null;
    }
  }

  const approvePreview = useMemo(() => {
    if (!pending || action !== "paid") return "";
    try {
      const fx = fiatAmountToUsdt(pending.amount, pending.network, usdtToPkrRate, rails);
      return formatDepositCreditNote(fx);
    } catch (err) {
      return err instanceof Error ? err.message : "Cannot convert to USDT";
    }
  }, [pending, action, usdtToPkrRate, rails]);

  const pendingRows = useMemo(() => rows.filter((r) => statusOf(r) === "pending"), [rows]);
  const paidRows = useMemo(() => rows.filter((r) => statusOf(r) === "paid"), [rows]);
  const rejectedRows = useMemo(() => rows.filter((r) => statusOf(r) === "rejected"), [rows]);

  function renderTable(
    title: string,
    hint: string,
    list: OrderRow[],
    empty: string,
    showActions: boolean,
  ) {
    return (
      <div className="admin-card overflow-x-auto p-4">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-[15px] font-semibold text-white/90">{title}</h2>
            <p className="mt-0.5 text-[12px] text-white/45">{hint}</p>
          </div>
          <span className="rounded-full bg-white/8 px-2.5 py-1 text-[11px] text-white/55">
            {list.length}
          </span>
        </div>
        <table className="admin-table">
          <thead>
            <tr>
              <th>Account</th>
              <th>Paid</th>
              <th>≈ USDT credit</th>
              <th>Slip / bill</th>
              <th>Status</th>
              <th>Time</th>
              {showActions ? <th /> : null}
            </tr>
          </thead>
          <tbody>
            {list.length === 0 ? (
              <tr>
                <td colSpan={showActions ? 7 : 6} className="py-8 text-center text-white/40">
                  {empty}
                </td>
              </tr>
            ) : (
              list.map((row) => {
                const href = slipHref(row.slipUrl || "");
                const est = creditPreview(row);
                return (
                  <tr key={row.id}>
                    <td>{row.account}</td>
                    <td>
                      {row.amount} {row.network}
                    </td>
                    <td className="text-[#9ee7ff]">
                      {est
                        ? `${est.usdt} USDT`
                        : row.status === "pending"
                          ? "Set rail rate"
                          : "—"}
                    </td>
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
                          row.status === "paid"
                            ? "pill-ok"
                            : row.status === "pending"
                              ? "pill-wait"
                              : "pill-bad"
                        }`}
                      >
                        {row.status}
                      </span>
                    </td>
                    <td className="text-white/55">{row.at}</td>
                    {showActions ? (
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
                    ) : null}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <AdminShell title="Recharges">
      {node}
      <p className="mb-4 max-w-3xl text-[13px] leading-6 text-white/50">
        Tickets stay in one DB table with status. Below they are split:{" "}
        <strong className="text-white/70">Pending</strong>,{" "}
        <strong className="text-white/70">Paid</strong>,{" "}
        <strong className="text-white/70">Rejected</strong>.{" "}
        <strong className="text-white/70">Add recharge</strong> is only if someone paid outside the app —
        log it, then Approve to credit.
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
          text={
            action === "paid"
              ? `Approve ${pending.amount} ${pending.network} for ${pending.account}? ${approvePreview}`
              : `Reject ${pending.amount} ${pending.network} for ${pending.account}?`
          }
          onYes={() => {
            const act = action === "paid" ? "approve_recharge" : "reject_recharge";
            setBusy(true);
            void fetch("/api/finance", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ action: act, id: pending.id, note }),
            })
              .then(async (res) => {
                const data = (await res.json()) as {
                  error?: string;
                  creditedUsdt?: number;
                  code?: string;
                  railAmount?: number;
                };
                if (!res.ok) {
                  toast(data.error || "Update failed");
                  return;
                }
                await load();
                if (action === "paid") {
                  toast(
                    data.creditedUsdt != null
                      ? `Approved — credited ${data.creditedUsdt} USDT (from ${data.railAmount} ${data.code})`
                      : "Approved — invest credited",
                  );
                } else {
                  toast("Rejected");
                }
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

      <div className="space-y-5">
        {renderTable(
          "Pending",
          "Waiting for Approve / Reject. Approve credits USDT after FX convert.",
          pendingRows,
          "No pending tickets.",
          true,
        )}
        {renderTable(
          "Paid",
          "Approved deposits — invest wallet already credited.",
          paidRows,
          "No paid deposits yet.",
          false,
        )}
        {renderTable(
          "Rejected",
          "Rejected tickets — no wallet credit.",
          rejectedRows,
          "No rejected tickets.",
          false,
        )}
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
