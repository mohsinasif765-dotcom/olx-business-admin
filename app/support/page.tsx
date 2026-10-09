"use client";

import { FormEvent, KeyboardEvent, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AdminShell } from "@/components/AdminShell";
import { useToast } from "@/components/Feedback";
import {
  formatChatTime,
  initials,
  isTicketUnread,
  markTicketSeen,
} from "@/lib/support-notify";

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

function SupportInbox() {
  const { toast, node } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const deepTicket = searchParams.get("ticket") || "";
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [openCount, setOpenCount] = useState(0);
  const [activeId, setActiveId] = useState("");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "open" | "closed">("all");
  const bottomRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);

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
    const data = (await res.json()) as { messages?: Msg[]; ticket?: Ticket; error?: string };
    if (!res.ok) {
      toast(data.error || "Could not load messages");
      return;
    }
    setMessages(Array.isArray(data.messages) ? data.messages : []);
    if (data.ticket?.updatedAt) markTicketSeen(ticketId, data.ticket.updatedAt);
  }

  useEffect(() => {
    void loadTickets();
    const tick = window.setInterval(() => {
      void loadTickets();
      if (activeId) void loadThread(activeId);
    }, 4000);
    return () => window.clearInterval(tick);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId]);

  useEffect(() => {
    if (!deepTicket || deepTicket === activeId) return;
    setActiveId(deepTicket);
    void loadThread(deepTicket);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deepTicket]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, activeId]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return tickets.filter((row) => {
      if (filter === "open" && row.status === "closed") return false;
      if (filter === "closed" && row.status !== "closed") return false;
      if (!needle) return true;
      return (
        row.account.toLowerCase().includes(needle) ||
        row.lastMessage.toLowerCase().includes(needle) ||
        row.subject.toLowerCase().includes(needle)
      );
    });
  }, [tickets, q, filter]);

  async function selectTicket(id: string) {
    setActiveId(id);
    router.replace(`/support?ticket=${encodeURIComponent(id)}`, { scroll: false });
    await loadThread(id);
    const row = tickets.find((t) => t.id === id);
    if (row) markTicketSeen(id, row.updatedAt);
  }

  function clearTicket() {
    setActiveId("");
    setMessages([]);
    router.replace("/support", { scroll: false });
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
      markTicketSeen(activeId, new Date().toISOString());
      composerRef.current?.focus();
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
    toast(status === "closed" ? "Chat closed" : "Chat updated");
    await loadTickets();
  }

  const active = tickets.find((row) => row.id === activeId);

  function onComposerKey(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void onReply(e as unknown as FormEvent);
    }
  }

  return (
    <AdminShell title="Support" flush>
      {node}
      <div className={`wa-shell ${activeId ? "is-thread" : "is-list"}`}>
        <aside className="wa-list">
          <div className="wa-list-head">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-[15px] font-semibold text-white">Chats</p>
                <p className="text-[11px] text-white/45">{openCount} waiting · {tickets.length} total</p>
              </div>
            </div>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="wa-search"
              placeholder="Search or start filter…"
            />
            <div className="wa-filters">
              {(
                [
                  ["all", "All"],
                  ["open", "Open"],
                  ["closed", "Closed"],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  className={`wa-filter ${filter === key ? "is-on" : ""}`}
                  onClick={() => setFilter(key)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="wa-list-body">
            {filtered.length === 0 ? (
              <p className="px-4 py-8 text-center text-[13px] text-white/40">No chats yet.</p>
            ) : (
              filtered.map((row) => {
                const unread = isTicketUnread(row);
                const on = activeId === row.id;
                return (
                  <button
                    key={row.id}
                    type="button"
                    onClick={() => void selectTicket(row.id)}
                    className={`wa-row ${on ? "is-on" : ""} ${unread ? "is-unread" : ""}`}
                  >
                    <span className="wa-avatar">{initials(row.account)}</span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2">
                        <span className="truncate text-[13px] font-semibold text-white/95">{row.account}</span>
                        <span className="shrink-0 text-[10px] text-white/35">{formatChatTime(row.updatedAt)}</span>
                      </span>
                      <span className="mt-0.5 flex items-center justify-between gap-2">
                        <span className="truncate text-[12px] text-white/45">{row.lastMessage || "No messages yet"}</span>
                        {unread ? <span className="wa-badge">{1}</span> : null}
                      </span>
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        <section className="wa-thread">
          {!activeId || !active ? (
            <div className="wa-empty">
              <div className="wa-empty-card">
                <p className="text-[16px] font-semibold text-white/85">OLX Support</p>
                <p className="mt-2 text-[13px] leading-relaxed text-white/45">
                  Select a chat from the left. New member messages appear here instantly — same flow as WhatsApp.
                </p>
              </div>
            </div>
          ) : (
            <>
              <header className="wa-thread-head">
                <div className="flex min-w-0 items-center gap-2 sm:gap-3">
                  <button
                    type="button"
                    className="wa-back"
                    aria-label="Back to chats"
                    onClick={clearTicket}
                  >
                    ‹
                  </button>
                  <span className="wa-avatar is-lg">{initials(active.account)}</span>
                  <div className="min-w-0">
                    <p className="truncate text-[14px] font-semibold text-white">{active.account}</p>
                    <p className="truncate text-[11px] text-white/45">
                      {active.status === "open"
                        ? "Waiting for reply"
                        : active.status === "closed"
                          ? "Closed"
                          : "You replied"}
                      {" · "}
                      {active.subject}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 gap-2">
                  {active.status !== "closed" ? (
                    <button type="button" className="wa-head-btn" onClick={() => void setStatus("closed")}>
                      Close
                    </button>
                  ) : (
                    <button type="button" className="wa-head-btn" onClick={() => void setStatus("replied")}>
                      Reopen
                    </button>
                  )}
                </div>
              </header>

              <div className="wa-messages">
                {messages.map((msg) => (
                  <div key={msg.id} className={`wa-bubble-row ${msg.isAdmin ? "is-out" : "is-in"}`}>
                    <div className={`wa-bubble ${msg.isAdmin ? "is-out" : "is-in"}`}>
                      {msg.attachmentUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={msg.attachmentUrl} alt="" className="wa-attach" />
                      ) : null}
                      {msg.message ? <span className="wa-bubble-text">{msg.message}</span> : null}
                      <span className="wa-bubble-time">
                        {msg.createdAt
                          ? new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                          : ""}
                        {msg.isAdmin ? <span className="wa-ticks">✓✓</span> : null}
                      </span>
                    </div>
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>

              {active.status === "closed" ? (
                <div className="wa-closed-bar">This chat is closed. Reopen to send a reply.</div>
              ) : (
                <form onSubmit={onReply} className="wa-composer">
                  <textarea
                    ref={composerRef}
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={onComposerKey}
                    rows={1}
                    className="wa-input"
                    placeholder="Type a message"
                    disabled={busy}
                  />
                  <button type="submit" className="wa-send" disabled={busy || !text.trim()} aria-label="Send">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M2.01 21 23 12 2.01 3 2 10l15 2-15 2z" />
                    </svg>
                  </button>
                </form>
              )}
            </>
          )}
        </section>
      </div>
    </AdminShell>
  );
}

export default function Page() {
  return (
    <Suspense
      fallback={
        <AdminShell title="Support" flush>
          <div className="grid min-h-[60vh] place-items-center text-[13px] text-white/40">Loading inbox…</div>
        </AdminShell>
      }
    >
      <SupportInbox />
    </Suspense>
  );
}
