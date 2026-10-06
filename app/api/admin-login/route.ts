import { NextResponse } from "next/server";
import { DEFAULT_ADMIN_AUTH, type AdminAuth, type Store } from "@/lib/store";
import { zuvoAdmin } from "@/lib/zuvo";

async function readAuth(): Promise<AdminAuth> {
  const { data, error } = await zuvoAdmin().from("ops_snapshot").select("payload").eq("id", 1).maybeSingle();
  if (error) throw error;
  const payload = (data?.payload || {}) as Store;
  const auth = payload.adminAuth;
  if (auth?.user && auth.pass) return { user: String(auth.user), pass: String(auth.pass) };
  return { ...DEFAULT_ADMIN_AUTH };
}

async function writeAuth(auth: AdminAuth) {
  const db = zuvoAdmin();
  const { data } = await db.from("ops_snapshot").select("payload").eq("id", 1).maybeSingle();
  const payload = { ...((data?.payload as Store | undefined) || {}), adminAuth: auth };
  const { error } = await db.from("ops_snapshot").upsert({
    id: 1,
    payload,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
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
    await writeAuth({ ...auth, pass: next });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Zuvo write failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
