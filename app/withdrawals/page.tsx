"use client";

import { useEffect, useState } from "react";
import { AddPanel } from "@/components/AddPanel";
import { AdminShell } from "@/components/AdminShell";
import { ConfirmBar, useToast } from "@/components/Feedback";
import { downloadCsv, fetchOpsStore, getStore, nid, patchStore, stamp, toCsv, type WithdrawRow } from "@/lib/store";

export default function Page() {
  const { toast, node } = useToast();
  const [rows, setRows] = useState<WithdrawRow[]>([]);
  const [pending, setPending] = useState<WithdrawRow | null>(null);
  const [action, setAction] = useState<WithdrawRow["status"] | null>(null);
  const [account, setAccount] = useState("");
  const [amount, setAmount] = useState("");
  const [wallet, setWallet] = useState("USDT");
  const [address, setAddress] = useState("");

  useEffect(() => {
    void fetchOpsStore().then((s) => setRows(s.withdraws));
  }, []);

  function apply(status: WithdrawRow["status"]) {
    if (!pending) return;
    const act =
      status === "approved" ? "approve_withdraw" : status === "paid" ? "paid_withdraw" : "reject_withdraw";
    void fetch("/api/finance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: act, id: pending.id }),
    }).then(async (res) => {
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        toast(data.error || "Update failed");
        return;
      }
      await fetchOpsStore();
      setPending(null);
      setAction(null);
      setRows(getStore().withdraws);
      toast(status === "paid" ? "Marked paid" : status === "rejected" ? "Rejected and refunded" : "Approved — send payout");
    });
  }

  function confirmText() {
    if (!pending || !action) return "";
    const pay = `${pending.amount} ${pending.wallet}`;
    if (action === "approved") {
      return `Approve ${pay} for ${pending.account}? Then send ${pay} to ${pending.address}.`;
    }
    if (action === "paid") {
      return `Confirm you already sent ${pay} to ${pending.address}?`;
    }
    return `Reject ${pay} for ${pending.account}? Amount returns to their invest wallet.`;
  }

  return (
    <AdminShell title="Withdrawals">
      {node}
      <p className="mb-4 max-w-3xl text-[13px] leading-5 text-white/50">
        Member request holds the amount. You send the payout to their bank or wallet, then Approve and Mark paid. Reject refunds the hold.
      </p>
      <AddPanel title="Add withdrawal" hint="Create a payout ticket. Approve after you send money to the member." onSubmit={() => {
        if (!account.trim() || !Number(amount) || !address.trim()) {
          toast("Account, amount and address required");
          return;
        }
        patchStore((s) => {
          s.withdraws.unshift({
            id: nid("w"),
            account: account.trim(),
            amount: Number(amount),
            wallet,
            address: address.trim(),
            status: "pending",
            at: stamp(),
            note: "",
          });
        }, { action: "withdraw_add", target: account.trim(), amount });
        setAccount("");
        setAmount("");
        setAddress("");
        setRows(getStore().withdraws);
        toast("Withdrawal added");
      }}>
        <input value={account} onChange={(e) => setAccount(e.target.value)} className="admin-input" placeholder="Member account" />
        <input value={amount} onChange={(e) => setAmount(e.target.value)} className="admin-input" placeholder="Amount" />
        <input value={wallet} onChange={(e) => setWallet(e.target.value)} className="admin-input" placeholder="PKR / USDT / bank" />
        <input value={address} onChange={(e) => setAddress(e.target.value)} className="admin-input" placeholder="Member payout address" />
      </AddPanel>
      <div className="mb-3 flex gap-2">
        <button
          type="button"
          className="ghost-btn"
          onClick={() =>
            downloadCsv(
              "withdrawals.csv",
              toCsv(rows.map((r) => ({ account: r.account, amount: r.amount, wallet: r.wallet, address: r.address, status: r.status, at: r.at })))
            )
          }
        >
          Export CSV
        </button>
      </div>
      {pending && action ? (
        <ConfirmBar
          text={confirmText()}
          onYes={() => apply(action)}
          onNo={() => { setPending(null); setAction(null); }}
        />
      ) : null}
      <div className="admin-card overflow-x-auto p-4">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Account</th>
              <th>Amount</th>
              <th>Pay to member</th>
              <th>Status</th>
              <th>Time</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>{row.account}</td>
                <td>
                  {row.amount} {row.wallet}
                </td>
                <td className="max-w-[220px]">
                  <p className="font-mono text-[12px] break-all">{row.address}</p>
                  <button
                    type="button"
                    className="mt-1 text-[11px] text-[#9ec6ff]"
                    onClick={() => {
                      void navigator.clipboard.writeText(row.address);
                      toast("Address copied");
                    }}
                  >
                    Copy
                  </button>
                </td>
                <td>
                  <span className={`pill ${row.status === "paid" ? "pill-ok" : row.status === "approved" ? "pill-ok" : row.status === "pending" ? "pill-wait" : "pill-bad"}`}>
                    {row.status}
                  </span>
                </td>
                <td className="text-white/55">{row.at}</td>
                <td className="space-x-2 whitespace-nowrap">
                  {row.status === "pending" ? (
                    <>
                      <button type="button" className="ghost-btn" onClick={() => { setPending(row); setAction("approved"); }}>Approve</button>
                      <button type="button" className="ghost-btn" onClick={() => { setPending(row); setAction("rejected"); }}>Reject</button>
                    </>
                  ) : null}
                  {row.status === "approved" ? (
                    <button type="button" className="ghost-btn" onClick={() => { setPending(row); setAction("paid"); }}>Mark paid</button>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}
