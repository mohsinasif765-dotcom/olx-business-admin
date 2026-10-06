import { NextResponse } from "next/server";
import { zuvoAdmin } from "@/lib/zuvo";
import { publishCarCatalog } from "@/lib/publish-plans";
import type { Store, UserRow, VipPlan } from "@/lib/store";
import { insertAudit, readSettings } from "@/lib/db-tables";

function money(value: unknown) {
  const n = Number(String(value ?? "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? Number(n.toFixed(2)) : 0;
}

function asUser(row: Record<string, unknown>): UserRow {
  const account = String(row.account);
  return {
    id: String(row.id),
    account,
    name: String(row.name || "").trim() || account,
    vip: String(row.vip || "—"),
    invite: String(row.invite || ""),
    upline: String(row.upline || "—"),
    invest: money(row.invest),
    brokerage: money(row.brokerage),
    status: row.status === "frozen" || row.status === "banned" ? row.status : "active",
    joined: String(row.joined || ""),
  };
}

async function loadDb() {
  const db = zuvoAdmin();
  const [{ data: members, error: mErr }, settings, { data: packs, error: pErr }] = await Promise.all([
    db.from("members").select("*"),
    readSettings(),
    db.from("car_packages").select("*"),
  ]);
  if (mErr) throw mErr;
  if (pErr) throw pErr;
  const store = { settings: settings || {} } as Store;
  const users = ((members || []) as Record<string, unknown>[]).map(asUser);
  const vips: VipPlan[] =
    store.vips ||
    ((packs || []) as Record<string, unknown>[]).map((p) => ({
      id: String(p.id),
      name: String(p.name),
      range: String(p.invest),
      income: String(p.returns),
      days: Number(String(p.term).split(" ")[0]) || 30,
      kind: p.kind === "used" ? "used" : "new",
      image: String(p.image),
      enabled: p.enabled !== false,
    }));
  return { db, store, users, vips };
}

async function saveUsers(users: UserRow[]) {
  const db = zuvoAdmin();
  if (!users.length) return;
  const { error } = await db.from("members").upsert(
    users.map((u) => ({
      id: u.id,
      account: u.account.trim().toLowerCase(),
      vip: u.vip,
      invite: u.invite,
      upline: u.upline,
      invest: u.invest,
      brokerage: u.brokerage,
      status: u.status,
      joined: u.joined,
      name: u.name || "",
    }))
  );
  if (error) {
    const retry = await db.from("members").upsert(
      users.map((u) => ({
        id: u.id,
        account: u.account.trim().toLowerCase(),
        vip: u.vip,
        invite: u.invite,
        upline: u.upline,
        invest: u.invest,
        brokerage: u.brokerage,
        status: u.status,
        joined: u.joined,
      }))
    );
    if (retry.error) throw retry.error;
  }
}

export async function POST(request: Request) {
  let body: { id?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const id = body.id;
  try {
    const { store, users, vips } = await loadDb();
    store.users = users;
    store.vips = vips;
    let message = "";

    if (id === "publish") {
      const result = await publishCarCatalog(vips);
      message = result.message;
    } else if (id === "comm") {
      const rate = Number(store.settings?.commissionL1) || 0;
      let total = 0;
      for (const user of users) {
        const downlines = users.filter((row) => row.upline === user.invite && row.status === "active");
        const book = downlines.reduce((sum, row) => sum + row.invest, 0);
        user.brokerage = Number(((book * rate) / 100).toFixed(2));
        total += user.brokerage;
      }
      await saveUsers(users);
      message = `LEV 1 rebuilt at ${rate}%. Brokerage now ${total.toFixed(2)} USDT across ${users.length} members.`;
    } else if (id === "expire") {
      const live = new Set(vips.filter((plan) => plan.enabled).map((plan) => plan.name));
      let cleared = 0;
      for (const user of users) {
        if (user.vip !== "—" && !live.has(user.vip)) {
          user.vip = "—";
          cleared += 1;
        }
      }
      await saveUsers(users);
      const active = users.filter((user) => user.vip !== "—").length;
      message = cleared
        ? `${cleared} members taken off disabled packages. ${active} still on a live plan.`
        : `No expired packages. ${active} members remain on live car plans.`;
    } else if (id === "yield") {
      let count = 0;
      let total = 0;
      for (const user of users) {
        if (user.status !== "active" || user.vip === "—") continue;
        const plan = vips.find((row) => row.enabled && row.name === user.vip);
        if (!plan) continue;
        const ret = money(plan.income);
        user.invest = Number((user.invest + ret).toFixed(2));
        count += 1;
        total += ret;
      }
      await saveUsers(users);
      message = count
        ? `Package returns credited to ${count} members · ${total.toFixed(2)} USDT.`
        : "No members are on a live car package.";
    } else {
      return NextResponse.json({ error: "Unknown command" }, { status: 400 });
    }

    store.users = users;
    await insertAudit({
      id: `a${Date.now()}`,
      at: new Date().toLocaleString(),
      actor: "admin",
      action: `command_${id}`,
      target: "zuvo",
    });
    return NextResponse.json({ ok: true, message, users });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Zuvo command failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
