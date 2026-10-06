"use client";

import { useEffect, useState } from "react";
import { AdminShell } from "@/components/AdminShell";

type Tx = {
  id: string;
  account: string;
  kind: string;
  amount: number;
  wallet: string;
  status: string;
  note: string;
  at: string;
};

export default function Page() {
  const [rows, setRows] = useState<Tx[]>([]);
  useEffect(() => {
    void fetch("/api/transactions", { cache: "no-store" })
      .then((res) => res.json())
      .then((data: { rows?: Tx[] }) => setRows(Array.isArray(data.rows) ? data.rows : []))
      .catch(() => {});
  }, []);

  return (
    <AdminShell title="Transactions">
      <p className="mb-4 text-[13px] text-white/50">
        Live deposit, withdraw, invest, and team earning rows from Zuvo <code>ledger_tx</code>.
      </p>
      <div className="admin-card overflow-x-auto p-4">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Time</th>
              <th>Account</th>
              <th>Kind</th>
              <th>Amount</th>
              <th>Wallet</th>
              <th>Status</th>
              <th>Note</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-white/45">
                  No transactions yet.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id}>
                  <td className="text-white/55">{row.at}</td>
                  <td>{row.account}</td>
                  <td>{row.kind}</td>
                  <td>{row.amount}</td>
                  <td>{row.wallet}</td>
                  <td>{row.status}</td>
                  <td className="text-[12px] text-white/55">{row.note}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}
