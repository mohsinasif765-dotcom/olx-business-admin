"use client";

import { useEffect, useState } from "react";
import { AdminShell } from "@/components/AdminShell";
import { getStore, type AuditRow } from "@/lib/store";

export default function Page() {
  const [rows, setRows] = useState<AuditRow[]>([]);
  useEffect(() => setRows(getStore().audit), []);

  return (
    <AdminShell title="Audit log">
      <div className="admin-card overflow-x-auto p-4">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Time</th>
              <th>Actor</th>
              <th>Action</th>
              <th>Target</th>
              <th>Amount / note</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td className="text-white/55">{row.at}</td>
                <td>{row.actor}</td>
                <td>{row.action}</td>
                <td>{row.target}</td>
                <td>{row.amount || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}
