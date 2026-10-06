"use client";

import { useEffect, useState } from "react";
import { AdminShell } from "@/components/AdminShell";
import { fetchOpsStore, type HoldingRow } from "@/lib/store";

export default function Page() {
  const [rows, setRows] = useState<HoldingRow[]>([]);

  useEffect(() => {
    void fetchOpsStore().then((s) => setRows(s.holdings || []));
  }, []);

  return (
    <AdminShell title="Garage holdings">
      <p className="mb-4 text-[13px] text-white/50">
        Live member packages from Zuvo. Invest on Cars writes a holding here and shows it on Garage.
      </p>
      <div className="admin-card overflow-x-auto p-4">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Account</th>
              <th>Package</th>
              <th>Invest</th>
              <th>Return</th>
              <th>Term</th>
              <th>Status</th>
              <th>Started</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-white/45">
                  No holdings yet.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id}>
                  <td>{row.account}</td>
                  <td>{row.name}</td>
                  <td>{row.investAmount?.toFixed?.(2) || row.invest}</td>
                  <td>{row.returns}</td>
                  <td>{row.term}</td>
                  <td>
                    <span className={`pill ${row.status === "active" ? "pill-ok" : "pill-bad"}`}>{row.status}</span>
                  </td>
                  <td className="text-[12px] text-white/55">{row.startedAt}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}
