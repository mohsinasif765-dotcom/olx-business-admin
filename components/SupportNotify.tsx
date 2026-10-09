"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  detectNewMemberMessages,
  playSupportChime,
  readLastSnap,
  unreadCount,
  writeLastSnap,
  type SupportSnapTicket,
} from "@/lib/support-notify";

type ToastItem = { key: string; ticketId: string; account: string; preview: string };

export function useSupportBadge() {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let alive = true;
    async function tick() {
      try {
        const res = await fetch("/api/support", { cache: "no-store" });
        const data = (await res.json()) as { tickets?: SupportSnapTicket[] };
        if (!alive || !res.ok) return;
        const tickets = Array.isArray(data.tickets) ? data.tickets : [];
        setCount(unreadCount(tickets));
      } catch {
        /* ignore */
      }
    }
    void tick();
    const id = window.setInterval(tick, 8000);
    const onFocus = () => void tick();
    window.addEventListener("focus", onFocus);
    window.addEventListener("olx-support-seen", onFocus);
    return () => {
      alive = false;
      window.clearInterval(id);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("olx-support-seen", onFocus);
    };
  }, []);
  return count;
}

/** Site-wide popup when a member sends a new support message (any admin page). */
export function SupportNotifyHost() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeTicket = searchParams.get("ticket") || "";
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const primed = useRef(false);

  useEffect(() => {
    let alive = true;
    async function poll() {
      try {
        const res = await fetch("/api/support", { cache: "no-store" });
        const data = (await res.json()) as { tickets?: SupportSnapTicket[] };
        if (!alive || !res.ok) return;
        const tickets = Array.isArray(data.tickets) ? data.tickets : [];
        const prev = readLastSnap();
        if (!primed.current) {
          primed.current = true;
          writeLastSnap(tickets);
          return;
        }
        const fresh = detectNewMemberMessages(tickets, prev);
        writeLastSnap(tickets);
        if (!fresh.length) return;
        const viewing = pathname === "/support" ? activeTicket : "";
        const show = fresh.filter((row) => row.id !== viewing);
        if (!show.length) return;
        playSupportChime();
        setToasts((current) => {
          const next = [
            ...show.map((row) => ({
              key: `${row.id}:${row.updatedAt}`,
              ticketId: row.id,
              account: row.account,
              preview: row.lastMessage || "New message",
            })),
            ...current,
          ].slice(0, 4);
          return next;
        });
        window.dispatchEvent(new Event("olx-support-seen"));
      } catch {
        /* ignore */
      }
    }
    void poll();
    const id = window.setInterval(poll, 5000);
    return () => {
      alive = false;
      window.clearInterval(id);
    };
  }, [pathname, activeTicket]);

  useEffect(() => {
    if (!toasts.length) return;
    const id = window.setTimeout(() => {
      setToasts((current) => current.slice(0, -1));
    }, 7000);
    return () => window.clearTimeout(id);
  }, [toasts]);

  if (!toasts.length) return null;

  return (
    <div className="support-toast-stack" aria-live="polite">
      {toasts.map((item) => (
        <Link
          key={item.key}
          href={`/support?ticket=${encodeURIComponent(item.ticketId)}`}
          className="support-toast"
          onClick={() => setToasts((current) => current.filter((row) => row.key !== item.key))}
        >
          <span className="support-toast-dot" />
          <span className="min-w-0 flex-1">
            <span className="block text-[12px] font-semibold text-white">New support message</span>
            <span className="mt-0.5 block truncate text-[12px] text-[#9ee6b8]">{item.account}</span>
            <span className="mt-0.5 block truncate text-[11px] text-white/55">{item.preview}</span>
          </span>
          <span className="text-[11px] font-medium text-[#6ee7b7]">Open</span>
        </Link>
      ))}
    </div>
  );
}
