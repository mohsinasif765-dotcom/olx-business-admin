"use client";

import { useEffect, useState } from "react";
import { AddPanel } from "@/components/AddPanel";
import { AdminShell } from "@/components/AdminShell";
import { ConfirmBar, useToast } from "@/components/Feedback";
import { fetchOpsStore, getStore, nid, patchStore, stamp, type OrderRow } from "@/lib/store";

export default function Page() {
  const { toast, node } = useToast();
  const [rows, setRows] = useState<OrderRow[]>([]);
  const [pending, setPending] = useState<OrderRow | null>(null);
  const [action, setAction] = useState<"paid" | "rejected" | null>(null);
  const [note, setNote] = useState("");
  const [account, setAccount] = useState("");
  const [amount, setAmount] = useState("");
  const [txHash, setTxHash] = useState("");

  useEffect(() => {
    void fetchOpsStore().then((s) => setRows(s.recharges));
  }, []);

  function refresh() {
    setRows(getStore().recharges);
  }

  return (
    <AdminShell title="Recharges">
      {node}
      <AddPanel title="Add recharge" hint="Log a deposit ticket. Approve later to credit invest." onSubmit={() => {
        if (!account.trim() || !Number(amount)) {
          toast("Account and amount required");
          return;
        }
        patchStore((s) => {
          s.recharges.unshift({
            id: nid("r"),
            account: account.trim(),
            amount: Number(amount),
            network: "USDT",
            txHash: txHash.trim() || "—",
            status: "pending",
            at: stamp(),
            note: "",
          });
        }, { action: "recharge_add", target: account.trim(), amount });
        setAccount("");
        setAmount("");
        setTxHash("");
        refresh();
        toast("Recharge added");
      }}>
        <input value={account} onChange={(e) => setAccount(e.target.value)} className="admin-input" placeholder="Member account" />
        <input value={amount} onChange={(e) => setAmount(e.target.value)} className="admin-input" placeholder="Amount USDT" />
        <input value={txHash} onChange={(e) => setTxHash(e.target.value)} className="admin-input" placeholder="Note (optional)" />
      </AddPanel>
      {pending && action ? (
        <ConfirmBar
          text={`${action === "paid" ? "Approve and credit invest" : "Reject"} ${pending.amount} USDT for ${pending.account}?`}
          onYes={() => {
            patchStore((s) => {
              const row = s.recharges.find((r) => r.id === pending.id);
              if (!row) return;
              row.status = action;
              row.note = note;
              if (action === "paid") {
                const u = s.users.find((x) => x.account === row.account);
                if (u) u.invest = Number((u.invest + row.amount).toFixed(2));
              }
            }, { action: `recharge_${action}`, target: pending.account, amount: String(pending.amount) });
            setPending(null);
            setAction(null);
            refresh();
            toast("Recharge updated");
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
              <th>Tx hash</th>
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
                <td>{row.network}</td>
                <td className="font-mono text-[12px]">{row.txHash}</td>
                <td>
                  <span className={`pill ${row.status === "paid" ? "pill-ok" : row.status === "pending" ? "pill-wait" : "pill-bad"}`}>
                    {row.status}
                  </span>
                </td>
                <td className="text-white/55">{row.at}</td>
                <td className="space-x-2">
                  {row.status === "pending" ? (
                    <>
                      <button type="button" className="ghost-btn" onClick={() => { setPending(row); setAction("paid"); }}>
                        Approve
                      </button>
                      <button type="button" className="ghost-btn" onClick={() => { setPending(row); setAction("rejected"); }}>
                        Reject
                      </button>
                    </>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {pending ? (
        <input value={note} onChange={(e) => setNote(e.target.value)} className="admin-input mt-3 max-w-lg" placeholder="Note (optional)" />
      ) : null}
    </AdminShell>
  );
}
