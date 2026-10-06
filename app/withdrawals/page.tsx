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
    patchStore((s) => {
      const row = s.withdraws.find((w) => w.id === pending.id);
      if (!row) return;
      if (row.status === "pending" && (status === "approved" || status === "paid")) {
        const u = s.users.find((x) => x.account === row.account);
        if (u && u.invest >= row.amount) u.invest = Number((u.invest - row.amount).toFixed(2));
      }
      row.status = status;
    }, { action: `withdraw_${status}`, target: pending.account, amount: String(pending.amount) });
    setPending(null);
    setAction(null);
    setRows(getStore().withdraws);
    toast("Withdrawal updated");
  }

  return (
    <AdminShell title="Withdrawals">
      {node}
      <AddPanel title="Add withdrawal" hint="Create a payout ticket. Approve or mark paid after review." onSubmit={() => {
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
        <input value={amount} onChange={(e) => setAmount(e.target.value)} className="admin-input" placeholder="Amount USDT" />
        <input value={wallet} onChange={(e) => setWallet(e.target.value)} className="admin-input" placeholder="Network / wallet" />
        <input value={address} onChange={(e) => setAddress(e.target.value)} className="admin-input" placeholder="Payout address" />
      </AddPanel>
      <div className="mb-3 flex gap-2">
        <button
          type="button"
          className="ghost-btn"
          onClick={() =>
            downloadCsv(
              "withdrawals.csv",
              toCsv(rows.map((r) => ({ account: r.account, amount: r.amount, wallet: r.wallet, status: r.status, at: r.at })))
            )
          }
        >
          Export CSV
        </button>
      </div>
      {pending && action ? (
        <ConfirmBar
          text={`${action} ${pending.amount} USDT for ${pending.account}? Security password was already collected on the user app.`}
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
              <th>Wallet</th>
              <th>Address</th>
              <th>Status</th>
              <th>Time</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>{row.account}</td>
                <td>{row.amount} USDT</td>
                <td>{row.wallet}</td>
                <td className="font-mono text-[12px]">{row.address}</td>
                <td>
                  <span className={`pill ${row.status === "paid" || row.status === "approved" ? "pill-ok" : row.status === "pending" ? "pill-wait" : "pill-bad"}`}>
                    {row.status}
                  </span>
                </td>
                <td className="text-white/55">{row.at}</td>
                <td className="space-x-2">
                  {row.status === "pending" ? (
                    <>
                      <button type="button" className="ghost-btn" onClick={() => { setPending(row); setAction("approved"); }}>Approve</button>
                      <button type="button" className="ghost-btn" onClick={() => { setPending(row); setAction("paid"); }}>Mark paid</button>
                      <button type="button" className="ghost-btn" onClick={() => { setPending(row); setAction("rejected"); }}>Reject</button>
                    </>
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
