import { zuvoAdmin } from "@/lib/zuvo";

export type SupportTicket = {
  id: string;
  account: string;
  subject: string;
  status: string;
  lastMessage: string;
  createdAt: string;
  updatedAt: string;
};

export type SupportMessage = {
  id: string;
  ticketId: string;
  account: string;
  message: string;
  type: string;
  attachmentUrl: string;
  isAdmin: boolean;
  createdAt: string;
};

function mapTicket(row: Record<string, unknown>): SupportTicket {
  return {
    id: String(row.id),
    account: String(row.account || ""),
    subject: String(row.subject || "Customer Support"),
    status: String(row.status || "open"),
    lastMessage: String(row.last_message || ""),
    createdAt: String(row.created_at || ""),
    updatedAt: String(row.updated_at || ""),
  };
}

function mapMessage(row: Record<string, unknown>): SupportMessage {
  return {
    id: String(row.id),
    ticketId: String(row.ticket_id || ""),
    account: String(row.account || ""),
    message: String(row.message || ""),
    type: String(row.type || "text"),
    attachmentUrl: String(row.attachment_url || ""),
    isAdmin: row.is_admin === true,
    createdAt: String(row.created_at || ""),
  };
}

function newId(prefix: string) {
  return `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

export async function listTickets(limit = 100): Promise<SupportTicket[]> {
  const { data, error } = await zuvoAdmin()
    .from("support_tickets")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data || []).map((row) => mapTicket(row as Record<string, unknown>));
}

export async function listMessages(ticketId: string): Promise<SupportMessage[]> {
  const { data, error } = await zuvoAdmin()
    .from("support_messages")
    .select("*")
    .eq("ticket_id", ticketId)
    .order("created_at", { ascending: true })
    .limit(200);
  if (error) throw error;
  return (data || []).map((row) => mapMessage(row as Record<string, unknown>));
}

export async function sendAdminMessage(ticketId: string, message: string) {
  const text = message.trim();
  if (!text) throw new Error("empty");
  const msg = {
    id: newId("m"),
    ticket_id: ticketId,
    account: "admin",
    message: text,
    type: "text",
    attachment_url: "",
    is_admin: true,
    created_at: new Date().toISOString(),
  };
  const { error } = await zuvoAdmin().from("support_messages").insert(msg);
  if (error) throw error;
  const { error: upError } = await zuvoAdmin()
    .from("support_tickets")
    .update({
      last_message: text.slice(0, 160),
      status: "replied",
      updated_at: new Date().toISOString(),
    })
    .eq("id", ticketId);
  if (upError) throw upError;
  return mapMessage(msg);
}

export async function setTicketStatus(ticketId: string, status: "open" | "replied" | "closed") {
  const { error } = await zuvoAdmin()
    .from("support_tickets")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", ticketId);
  if (error) throw error;
}

export async function countOpenTickets() {
  const { count, error } = await zuvoAdmin()
    .from("support_tickets")
    .select("id", { count: "exact", head: true })
    .eq("status", "open");
  if (error) throw error;
  return count || 0;
}
