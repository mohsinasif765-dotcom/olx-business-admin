"use client";

import { useEffect, useMemo, useState } from "react";
import { AddPanel } from "@/components/AddPanel";
import { AdminShell } from "@/components/AdminShell";
import { useToast } from "@/components/Feedback";
import { fetchOpsStore, getStore, nid, patchStore, stamp, type TransferRow } from "@/lib/store";

export default function Page() {
  const { toast, node } = useToast();
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<TransferRow[]>([]);
  const [account, setAccount] = useState("");
  const [amount, setAmount] = useState("");
  const [from, setFrom] = useState<"invest" | "brokerage">("invest");
  const [to, setTo] = useState<"invest" | "brokerage">("brokerage");

  useEffect(() => {
    void fetchOpsStore().then((s) => setRows(s.transfers));
  }, []);
  const list = useMemo(
    () => rows.filter((r) => r.account.toLowerCase().includes(q.toLowerCase())),
    [rows, q]
  );

  return (
    <AdminShell title="Transfers & records">
      {node}
      <AddPanel title="Add transfer" hint="Move value between invest and brokerage for a member." onSubmit={() => {
        if (!account.trim() || !Number(amount) || from === to) {
          toast("Need account, amount, and two different wallets");
          return;
        }
        const n = Number(amount);
        patchStore((s) => {
          const u = s.users.find((x) => x.account === account.trim());
          if (u && u[from] >= n) {
            u[from] = Number((u[from] - n).toFixed(2));
            u[to] = Number((u[to] + n).toFixed(2));
          }
          s.transfers.unshift({
            id: nid("t"),
            account: account.trim(),
            from,
            to,
            amount: n,
            at: stamp(),
          });
        }, { action: "transfer_add", target: account.trim(), amount: String(n) });
        setAccount("");
        setAmount("");
        setRows(getStore().transfers);
        toast("Transfer recorded");
      }}>
        <input value={account} onChange={(e) => setAccount(e.target.value)} className="admin-input" placeholder="Member account" />
        <input value={amount} onChange={(e) => setAmount(e.target.value)} className="admin-input" placeholder="Amount USDT" />
        <select value={from} onChange={(e) => setFrom(e.target.value as "invest" | "brokerage")} className="admin-input">
          <option value="invest">From invest</option>
          <option value="brokerage">From brokerage</option>
        </select>
        <select value={to} onChange={(e) => setTo(e.target.value as "invest" | "brokerage")} className="admin-input">
          <option value="brokerage">To brokerage</option>
          <option value="invest">To invest</option>
        </select>
      </AddPanel>
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter by account" className="admin-input mb-4 max-w-md" />
      <div className="admin-card overflow-x-auto p-4">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Account</th>
              <th>From</th>
              <th>To</th>
              <th>Amount</th>
              <th>Time</th>
            </tr>
          </thead>
          <tbody>
            {list.map((row) => (
              <tr key={row.id}>
                <td>{row.account}</td>
                <td>{row.from}</td>
                <td>{row.to}</td>
                <td>{row.amount.toFixed(2)} USDT</td>
                <td className="text-white/55">{row.at}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}
