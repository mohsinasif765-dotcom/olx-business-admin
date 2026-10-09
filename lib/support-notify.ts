const SEEN_KEY = "olx-admin-support-seen";
const SNAP_KEY = "olx-admin-support-snap";

export type SupportSnapTicket = {
  id: string;
  account: string;
  status: string;
  lastMessage: string;
  updatedAt: string;
};

export function readSeenMap(): Record<string, string> {
  try {
    return JSON.parse(window.localStorage.getItem(SEEN_KEY) || "{}") as Record<string, string>;
  } catch {
    return {};
  }
}

export function markTicketSeen(ticketId: string, updatedAt: string) {
  if (!ticketId) return;
  const map = readSeenMap();
  map[ticketId] = updatedAt || new Date().toISOString();
  window.localStorage.setItem(SEEN_KEY, JSON.stringify(map));
  window.dispatchEvent(new Event("olx-support-seen"));
}

/** Unread = member waiting (status open) and ticket updated after last seen. */
export function isTicketUnread(ticket: SupportSnapTicket) {
  if (ticket.status !== "open") return false;
  const seen = readSeenMap()[ticket.id];
  if (!seen) return true;
  return String(ticket.updatedAt || "") > seen;
}

export function unreadCount(tickets: SupportSnapTicket[]) {
  return tickets.filter((row) => isTicketUnread(row)).length;
}

export function readLastSnap(): SupportSnapTicket[] {
  try {
    return JSON.parse(window.localStorage.getItem(SNAP_KEY) || "[]") as SupportSnapTicket[];
  } catch {
    return [];
  }
}

export function writeLastSnap(tickets: SupportSnapTicket[]) {
  window.localStorage.setItem(
    SNAP_KEY,
    JSON.stringify(
      tickets.slice(0, 80).map((row) => ({
        id: row.id,
        account: row.account,
        status: row.status,
        lastMessage: row.lastMessage,
        updatedAt: row.updatedAt,
      })),
    ),
  );
}

/** New member messages since last snap (status open + updated). */
export function detectNewMemberMessages(next: SupportSnapTicket[], prev: SupportSnapTicket[]) {
  const prevMap = new Map(prev.map((row) => [row.id, row]));
  const fresh: SupportSnapTicket[] = [];
  for (const row of next) {
    if (row.status !== "open") continue;
    const old = prevMap.get(row.id);
    if (!old) {
      if (row.lastMessage) fresh.push(row);
      continue;
    }
    if (row.updatedAt !== old.updatedAt) fresh.push(row);
  }
  return fresh;
}

export function playSupportChime() {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "sine";
    o.frequency.value = 880;
    g.gain.value = 0.04;
    o.connect(g);
    g.connect(ctx.destination);
    o.start();
    o.frequency.exponentialRampToValueAtTime(1175, ctx.currentTime + 0.08);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.22);
    o.stop(ctx.currentTime + 0.24);
  } catch {
    /* ignore */
  }
}

export function formatChatTime(iso: string) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) {
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

export function initials(account: string) {
  const base = (account || "?").trim();
  const letter = base[0] || "?";
  return letter.toUpperCase();
}
