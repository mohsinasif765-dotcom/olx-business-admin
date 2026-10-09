"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { AdminShell } from "@/components/AdminShell";
import { useToast } from "@/components/Feedback";

type Ticket = {
  id: string;
  account: string;
  subject: string;
  status: string;
  lastMessage: string;
  updatedAt: string;
};

type Msg = {
  id: string;
  message: string;
  attachmentUrl: string;
  isAdmin: boolean;
  createdAt: string;
};

export default function Page() {
  const { toast, node } = useToast();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [openCount, setOpenCount] = useState(0);
  const [activeId, setActiveId] = useState("");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [q, setQ] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  async function loadTickets() {
    const res = await fetch("/api/support", { cache: "no-store" });
    const data = (await res.json()) as { tickets?: Ticket[]; openCount?: number; error?: string };
    if (!res.ok) {
      toast(data.error || "Could not load support tickets — run support-chat.sql");
      return;
    }
    setTickets(Array.isArray(data.tickets) ? data.tickets : []);
    setOpenCount(Number(data.openCount) || 0);
  }

  async function loadThread(ticketId: string) {
    const res = await fetch(`/api/support?ticketId=${encodeURIComponent(ticketId)}`, { cache: "no-store" });
    const data = (await res.json()) as { messages?: Msg[]; error?: string };
    if (!res.ok) {
      toast(data.error || "Could not load messages");
      return;
    }
    setMessages(Array.isArray(data.messages) ? data.messages : []);
  }

  useEffect(() => {
    void loadTickets();
    const tick = window.setInterval(() => {
      void loadTickets();
      if (activeId) void loadThread(activeId);
    }, 5000);
    return () => window.clearInterval(tick);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const filtered = tickets.filter((row) => {
    const needle = q.trim().toLowerCase();
    if (!needle) return true;
    return row.account.includes(needle) || row.lastMessage.toLowerCase().includes(needle);
  });

  async function selectTicket(id: string) {
    setActiveId(id);
    await loadThread(id);
  }

  async function onReply(event: FormEvent) {
    event.preventDefault();
    if (!activeId || !text.trim() || busy) return;
    setBusy(true);
    try {
      const res = await fetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticketId: activeId, message: text.trim() }),
      });
      const data = (await res.json()) as { messages?: Msg[]; error?: string };
      if (!res.ok) {
        toast(data.error || "Reply failed");
        return;
      }
      setText("");
      if (Array.isArray(data.messages)) setMessages(data.messages);
      await loadTickets();
    } finally {
      setBusy(false);
    }
  }

  async function setStatus(status: "closed" | "replied" | "open") {
    if (!activeId) return;
    const res = await fetch("/api/support", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticketId: activeId, action: "status", status }),
    });
    if (!res.ok) {
      toast("Could not update status");
      return;
    }
    toast(status === "closed" ? "Ticket closed" : "Ticket updated");
    await loadTickets();
  }

  const active = tickets.find((row) => row.id === activeId);

  return (
    <AdminShell title="Support">
      {node}
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[13px] text-[var(--muted)]">
            Trade FX–style inbox. Members chat from the app Support page.
          </p>
          <p className="mt-1 text-[12px] text-white/50">
            Open inquiries: <strong className="text-white/80">{openCount}</strong>
          </p>
        </div>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="admin-input max-w-xs"
          placeholder="Search account…"
        />
      </div>

      <div className="grid min-h-[560px] gap-3 lg:grid-cols-[280px_1fr]">
        <aside className="admin-card max-h-[70vh] overflow-y-auto p-2">
          {filtered.length === 0 ? (
            <p className="p-3 text-[13px] text-[var(--muted)]">No tickets yet.</p>
          ) : (
            filtered.map((row) => (
              <button
                key={row.id}
                type="button"
                onClick={() => void selectTicket(row.id)}
                className={`mb-1 w-full rounded-xl px-3 py-3 text-left transition ${
                  activeId === row.id ? "bg-[#3b82f6]/20" : "hover:bg-white/5"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-[13px] font-semibold text-white/90">{row.account}</p>
                  <span className="shrink-0 text-[10px] uppercase text-white/40">{row.status}</span>
                </div>
                <p className="mt-1 truncate text-[11px] text-white/45">{row.lastMessage || "—"}</p>
              </button>
            ))
          )}
        </aside>

        <section className="admin-card flex max-h-[70vh] flex-col p-0">
          {!activeId ? (
            <p className="m-auto p-6 text-[13px] text-[var(--muted)]">Select a ticket to reply.</p>
          ) : (
            <>
              <div className="flex items-center justify-between gap-3 border-b border-[var(--line)] px-4 py-3">
                <div>
                  <p className="text-[14px] font-semibold">{active?.account}</p>
                  <p className="text-[11px] text-[var(--muted)]">{active?.subject}</p>
                </div>
                <div className="flex gap-2">
                  {active?.status !== "closed" ? (
                    <button
                      type="button"
                      className="rounded-lg border border-white/15 px-3 py-1.5 text-[12px] text-white/70"
                      onClick={() => void setStatus("closed")}
                    >
                      Close
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="rounded-lg border border-white/15 px-3 py-1.5 text-[12px] text-white/70"
                      onClick={() => void setStatus("replied")}
                    >
                      Reopen
                    </button>
                  )}
                </div>
              </div>
              <div className="flex-1 space-y-2 overflow-y-auto px-4 py-3">
                {messages.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.isAdmin ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[75%] rounded-2xl px-3 py-2 text-[13px] ${
                        msg.isAdmin ? "bg-[#3b82f6] text-white" : "bg-white/10 text-white/90"
                      }`}
                    >
                      {msg.attachmentUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={msg.attachmentUrl} alt="" className="mb-1 max-h-40 rounded-lg" />
                      ) : null}
                      <p>{msg.message}</p>
                      <p className="mt-1 text-[10px] opacity-60">
                        {msg.createdAt ? new Date(msg.createdAt).toLocaleString() : ""}
                      </p>
                    </div>
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>
              <form onSubmit={onReply} className="flex gap-2 border-t border-[var(--line)] p-3">
                <input
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  className="admin-input flex-1"
                  placeholder="Reply as support…"
                  disabled={busy || active?.status === "closed"}
                />
                <button type="submit" className="admin-btn px-5" disabled={busy || !text.trim() || active?.status === "closed"}>
                  Send
                </button>
              </form>
            </>
          )}
        </section>
      </div>
    </AdminShell>
  );
}
