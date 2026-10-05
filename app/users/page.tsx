"use client";

import { useEffect, useMemo, useState } from "react";
import { AddPanel } from "@/components/AddPanel";
import { AdminShell } from "@/components/AdminShell";
import { ConfirmBar, useToast } from "@/components/Feedback";
import { creditUser, getStore, nid, patchStore, stamp, type UserRow, type UserStatus } from "@/lib/store";

export default function Page() {
  const { toast, node } = useToast();
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<UserRow[]>([]);
  const [vips, setVips] = useState<string[]>([]);
  const [edit, setEdit] = useState<UserRow | null>(null);
  const [delta, setDelta] = useState("10");
  const [wallet, setWallet] = useState<"invest" | "brokerage">("invest");
  const [reason, setReason] = useState("manual adjust");
  const [confirm, setConfirm] = useState<"credit" | "debit" | "delete" | null>(null);
  const [account, setAccount] = useState("");
  const [vip, setVip] = useState("—");
  const [invite, setInvite] = useState("");
  const [upline, setUpline] = useState("");
  const [invest, setInvest] = useState("0");
  const [brokerage, setBrokerage] = useState("0");

  function refresh() {
    const s = getStore();
    setRows(s.users);
    setVips(["—", ...s.vips.map((v) => v.name)]);
    setEdit((cur) => (cur ? s.users.find((u) => u.id === cur.id) || null : null));
  }

  useEffect(() => {
    refresh();
  }, []);

  const list = useMemo(
    () => rows.filter((u) => u.account.toLowerCase().includes(q.toLowerCase()) || u.invite.includes(q)),
    [rows, q]
  );

  function setStatus(id: string, status: UserStatus) {
    patchStore((s) => {
      const u = s.users.find((x) => x.id === id);
      if (u) u.status = status;
    }, { action: status, target: id });
    refresh();
    toast(`User ${status}`);
  }

  function addMember() {
    const acc = account.trim();
    if (!acc) {
      toast("Account is required");
      return;
    }
    patchStore((s) => {
      s.users.unshift({
        id: nid("u"),
        account: acc,
        vip,
        invite: invite.trim() || String(Math.floor(100000 + Math.random() * 900000)),
        upline: upline.trim() || "—",
        invest: Number(invest) || 0,
        brokerage: Number(brokerage) || 0,
        status: "active",
        joined: stamp(),
      });
    }, { action: "user_add", target: acc });
    setAccount("");
    setInvite("");
    setUpline("");
    setInvest("0");
    setBrokerage("0");
    refresh();
    toast("Member added");
  }

  function saveEdit() {
    if (!edit) return;
    patchStore((s) => {
      const u = s.users.find((x) => x.id === edit.id);
      if (!u) return;
      u.account = edit.account;
      u.vip = edit.vip;
      u.invite = edit.invite;
      u.upline = edit.upline;
    }, { action: "user_edit", target: edit.id });
    refresh();
    toast("Member saved");
  }

  return (
    <AdminShell title="Users">
      {node}
      <AddPanel title="Add member" hint="Create a member record. Login still lives in the member app until the database is connected." onSubmit={addMember} submit="Add member">
        <input value={account} onChange={(e) => setAccount(e.target.value)} className="admin-input" placeholder="Email or phone" />
        <select value={vip} onChange={(e) => setVip(e.target.value)} className="admin-input">
          {vips.map((name) => (
            <option key={name}>{name}</option>
          ))}
        </select>
        <input value={invite} onChange={(e) => setInvite(e.target.value)} className="admin-input" placeholder="Invite code (auto if empty)" />
        <input value={upline} onChange={(e) => setUpline(e.target.value)} className="admin-input" placeholder="Upline invite" />
        <input value={invest} onChange={(e) => setInvest(e.target.value)} className="admin-input" placeholder="Invest USDT" />
        <input value={brokerage} onChange={(e) => setBrokerage(e.target.value)} className="admin-input" placeholder="Brokerage USDT" />
      </AddPanel>
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search email / phone / invite" className="admin-input mb-4 max-w-md" />
      {confirm && edit ? (
        <ConfirmBar
          text={
            confirm === "delete"
              ? `Delete ${edit.account}? This cannot be undone in this console.`
              : `${confirm} ${delta} USDT on ${wallet} for ${edit.account}?`
          }
          onYes={() => {
            if (confirm === "delete") {
              patchStore((s) => {
                s.users = s.users.filter((u) => u.id !== edit.id);
              }, { action: "user_delete", target: edit.account });
              setEdit(null);
              setConfirm(null);
              refresh();
              toast("Member removed");
              return;
            }
            const n = Number(delta);
            creditUser(edit.id, wallet, confirm === "credit" ? n : -n, reason);
            refresh();
            setConfirm(null);
            toast("Balance updated");
          }}
          onNo={() => setConfirm(null)}
        />
      ) : null}
      <div className="admin-card overflow-x-auto p-4">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Account</th>
              <th>VIP</th>
              <th>Invite</th>
              <th>Upline</th>
              <th>Invest</th>
              <th>Brokerage</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {list.map((row) => (
              <tr key={row.id} className={edit?.id === row.id ? "bg-white/5" : ""}>
                <td>{row.account}</td>
                <td>{row.vip}</td>
                <td className="font-mono text-[12px]">{row.invite}</td>
                <td>{row.upline}</td>
                <td>{row.invest.toFixed(2)}</td>
                <td>{row.brokerage.toFixed(2)}</td>
                <td>
                  <span className={`pill ${row.status === "active" ? "pill-ok" : "pill-bad"}`}>{row.status}</span>
                </td>
                <td>
                  <button type="button" className="ghost-btn" onClick={() => setEdit(row)}>
                    Open
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {edit ? (
        <div className="admin-card mt-4 grid gap-3 p-5 md:grid-cols-2">
          <div className="md:col-span-2">
            <p className="font-semibold">Edit member</p>
            <p className="text-[12px] text-white/50">Joined {edit.joined} · No impersonation</p>
          </div>
          <input value={edit.account} onChange={(e) => setEdit({ ...edit, account: e.target.value })} className="admin-input" />
          <select value={edit.vip} onChange={(e) => setEdit({ ...edit, vip: e.target.value })} className="admin-input">
            {vips.map((name) => (
              <option key={name}>{name}</option>
            ))}
          </select>
          <input value={edit.invite} onChange={(e) => setEdit({ ...edit, invite: e.target.value })} className="admin-input" />
          <input value={edit.upline} onChange={(e) => setEdit({ ...edit, upline: e.target.value })} className="admin-input" />
          <div className="flex flex-wrap gap-2 md:col-span-2">
            <button type="button" className="admin-btn px-6" onClick={saveEdit}>
              Save details
            </button>
            <button type="button" className="ghost-btn h-11 px-4" onClick={() => setStatus(edit.id, edit.status === "active" ? "frozen" : "active")}>
              {edit.status === "active" ? "Freeze login" : "Unfreeze"}
            </button>
            <button type="button" className="ghost-btn h-11 px-4" onClick={() => setStatus(edit.id, "banned")}>
              Ban
            </button>
            <button type="button" className="ghost-btn h-11 px-4" onClick={() => setConfirm("delete")}>
              Delete
            </button>
          </div>
          <select value={wallet} onChange={(e) => setWallet(e.target.value as "invest" | "brokerage")} className="admin-input">
            <option value="invest">Invest wallet</option>
            <option value="brokerage">Brokerage wallet</option>
          </select>
          <input value={delta} onChange={(e) => setDelta(e.target.value)} className="admin-input" placeholder="Amount" />
          <input value={reason} onChange={(e) => setReason(e.target.value)} className="admin-input md:col-span-2" placeholder="Reason (required for ledger)" />
          <div className="flex gap-2 md:col-span-2">
            <button type="button" className="admin-btn px-6" onClick={() => setConfirm("credit")}>
              Credit
            </button>
            <button type="button" className="ghost-btn h-11 px-6" onClick={() => setConfirm("debit")}>
              Debit
            </button>
          </div>
        </div>
      ) : null}
    </AdminShell>
  );
}
