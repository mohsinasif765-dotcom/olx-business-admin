import { NextResponse } from "next/server";
import { DEFAULT_ADMIN_AUTH, type AdminAuth } from "@/lib/store";
import { readAdminAuth, writeAdminAuth } from "@/lib/db-tables";

async function readAuth(): Promise<AdminAuth> {
  const auth = await readAdminAuth();
  if (auth?.user && auth.pass) return auth;
  return { ...DEFAULT_ADMIN_AUTH };
}

export async function POST(request: Request) {
  let body: { user?: string; pass?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "required" }, { status: 400 });
  }
  try {
    const auth = await readAuth();
    if (String(body.user || "").trim() === auth.user && String(body.pass || "") === auth.pass) {
      return NextResponse.json({ ok: true, user: auth.user });
    }
    return NextResponse.json({ error: "badpass" }, { status: 401 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Zuvo read failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  let body: { current?: string; next?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "required" }, { status: 400 });
  }
  const next = String(body.next || "").trim();
  if (next.length < 8) return NextResponse.json({ error: "short" }, { status: 400 });
  try {
    const auth = await readAuth();
    if (String(body.current || "") !== auth.pass) {
      return NextResponse.json({ error: "badpass" }, { status: 401 });
    }
    if (next === auth.pass) return NextResponse.json({ error: "same" }, { status: 400 });
    await writeAdminAuth({ ...auth, pass: next });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Zuvo write failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
