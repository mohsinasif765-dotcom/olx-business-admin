import { NextResponse } from "next/server";
import {
  countOpenTickets,
  listMessages,
  listTickets,
  sendAdminMessage,
  setTicketStatus,
} from "@/lib/support";

export async function GET(request: Request) {
  const ticketId = (new URL(request.url).searchParams.get("ticketId") || "").trim();
  try {
    if (ticketId) {
      const [ticketList, messages] = await Promise.all([listTickets(200), listMessages(ticketId)]);
      const ticket = ticketList.find((row) => row.id === ticketId) || null;
      return NextResponse.json({ ticket, messages }, { headers: { "Cache-Control": "no-store" } });
    }
    const [tickets, openCount] = await Promise.all([listTickets(), countOpenTickets()]);
    return NextResponse.json({ tickets, openCount }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Zuvo read failed";
    return NextResponse.json({ error: message, tickets: [], messages: [] }, { status: 500 });
  }
}

export async function POST(request: Request) {
  let body: { ticketId?: string; message?: string; action?: string; status?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const ticketId = String(body.ticketId || "").trim();
  if (!ticketId) return NextResponse.json({ error: "ticketId required" }, { status: 400 });

  try {
    if (body.action === "status") {
      const status = body.status === "closed" ? "closed" : body.status === "open" ? "open" : "replied";
      await setTicketStatus(ticketId, status);
      return NextResponse.json({ ok: true });
    }
    const message = await sendAdminMessage(ticketId, String(body.message || ""));
    const messages = await listMessages(ticketId);
    return NextResponse.json({ ok: true, message, messages });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Send failed";
    if (message === "empty") return NextResponse.json({ error: "empty" }, { status: 400 });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
