import { NextResponse } from "next/server";
import { zuvoAdmin } from "@/lib/zuvo";
import { DEFAULT_SETTINGS, migrateCoins, type Store } from "@/lib/store";
import { displayName } from "@/lib/member-name";
import { stripDemoRows } from "@/lib/strip-demo";

let opsHold: { at: number; body: { store: Store | null } } | null = null;
const OPS_TTL = 4000;

function publicStore(store: Store) {
  return { ...store, adminAuth: { user: store.adminAuth?.user || "admin", pass: "" } };
}

export async function GET() {
  try {
    if (opsHold && Date.now() - opsHold.at < OPS_TTL) {
      return NextResponse.json(opsHold.body);
    }
    const db = zuvoAdmin();
    const snapRes = db.from("ops_snapshot").select("payload").eq("id", 1).maybeSingle();
    const packsResP = db.from("car_packages").select("id,name,kind,invest,returns,term,image,enabled");
    let membersRes = await db
      .from("members")
      .select("id,account,name,vip,invite,upline,invest,brokerage,status,joined");
    if (membersRes.error) {
      membersRes = await db
        .from("members")
        .select("id,account,vip,invite,upline,invest,brokerage,status,joined");
    }
    const [{ data, error }, packsRes] = await Promise.all([snapRes, packsResP]);
    if (error) throw error;
    const store = { ...(data?.payload as Store | undefined) } as Store;
    if (!store || !Object.keys(store).length) return NextResponse.json({ store: null });
    store.settings = { ...DEFAULT_SETTINGS, ...(store.settings || {}) };
    store.adminAuth = store.adminAuth?.user ? store.adminAuth : { user: "admin", pass: "olx2026" };
    store.holdings = Array.isArray(store.holdings) ? store.holdings : [];
    store.recharges = Array.isArray(store.recharges) ? store.recharges : [];
    store.withdraws = Array.isArray(store.withdraws) ? store.withdraws : [];
    store.transfers = Array.isArray(store.transfers) ? store.transfers : [];
    store.cms = Array.isArray(store.cms) ? store.cms : [];
    store.faqs = Array.isArray(store.faqs) ? store.faqs : [];
    store.notices = Array.isArray(store.notices) ? store.notices : [];
    store.activities = Array.isArray(store.activities) ? store.activities : [];
    store.coins = migrateCoins(Array.isArray(store.coins) ? store.coins : []);
    store.audit = Array.isArray(store.audit) ? store.audit : [];
    store.users = Array.isArray(store.users) ? store.users : [];
    store.vips = Array.isArray(store.vips) ? store.vips : [];
    const members = membersRes.error ? null : membersRes.data;
    const packs = packsRes.data;
    if (!membersRes.error) {
      store.users = (members || []).map((row) => ({
        id: String(row.id),
        account: String(row.account),
        name: displayName((row as { name?: string }).name, String(row.account)),
        vip: String(row.vip || "—"),
        invite: String(row.invite || ""),
        upline: String(row.upline || "—"),
        invest: Number(row.invest) || 0,
        brokerage: Number(row.brokerage) || 0,
        status: row.status === "frozen" || row.status === "banned" ? row.status : "active",
        joined: String(row.joined || ""),
      }));
    }
    if (packs?.length) {
      store.vips = packs.map((p) => ({
        id: String(p.id),
        name: String(p.name),
        range: String(p.invest),
        income: String(p.returns),
        days: Number(String(p.term).split(" ")[0]) || 30,
        kind: p.kind === "used" ? "used" : "new",
        image: String(p.image),
        enabled: p.enabled !== false,
      }));
    }
    const before = {
      recharges: store.recharges.length,
      withdraws: store.withdraws.length,
      transfers: store.transfers.length,
      audit: store.audit.length,
    };
    store.recharges = stripDemoRows(store.recharges);
    store.withdraws = stripDemoRows(store.withdraws);
    store.transfers = stripDemoRows(store.transfers);
    store.audit = stripDemoRows(store.audit);
    store.users = stripDemoRows(store.users);
    if (
      store.recharges.length !== before.recharges ||
      store.withdraws.length !== before.withdraws ||
      store.transfers.length !== before.transfers ||
      store.audit.length !== before.audit
    ) {
      await db.from("ops_snapshot").upsert({
        id: 1,
        payload: store,
        updated_at: new Date().toISOString(),
      });
    }
    const body = { store: publicStore(store) };
    opsHold = { at: Date.now(), body };
    return NextResponse.json(body);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Zuvo read failed";
    return NextResponse.json({ error: message, store: null }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  let store: Store;
  try {
    store = (await request.json()) as Store;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  try {
    const db = zuvoAdmin();
    const { data: current } = await db.from("ops_snapshot").select("payload").eq("id", 1).maybeSingle();
    const prev = (current?.payload || {}) as Store;
    if (!Array.isArray(store.holdings)) store.holdings = Array.isArray(prev.holdings) ? prev.holdings : [];
    if (!store.adminAuth?.pass && prev.adminAuth?.pass) store.adminAuth = prev.adminAuth;
    if (!store.activityState && prev.activityState) store.activityState = prev.activityState;
    store.recharges = stripDemoRows(store.recharges);
    store.withdraws = stripDemoRows(store.withdraws);
    store.transfers = stripDemoRows(store.transfers);
    store.audit = stripDemoRows(store.audit);
    store.users = stripDemoRows(store.users);
    const { error } = await db.from("ops_snapshot").upsert({
      id: 1,
      payload: store,
      updated_at: new Date().toISOString(),
    });
    if (error) throw error;
    opsHold = null;
    if (Array.isArray(store.users)) {
      const rows = store.users.map((user) => ({
        id: user.id,
        account: user.account.trim().toLowerCase(),
        name: displayName(user.name, user.account),
        vip: user.vip,
        invite: user.invite,
        upline: user.upline,
        invest: user.invest,
        brokerage: user.brokerage,
        status: user.status,
        joined: user.joined,
      }));
      let { error: userError } = await db.from("members").upsert(rows);
      if (userError) {
        const retry = await db.from("members").upsert(
          rows.map(({ name: _name, ...rest }) => rest)
        );
        userError = retry.error;
      }
      if (userError) throw userError;
    }
    if (Array.isArray(store.vips)) {
      const { error: pkgError } = await db.from("car_packages").upsert(
        store.vips.map((plan) => ({
          id: plan.id,
          name: plan.name,
          kind: plan.kind,
          invest: plan.range,
          returns: plan.income,
          term: `${plan.days} days`,
          image: plan.image,
          enabled: plan.enabled !== false,
          updated_at: new Date().toISOString(),
        }))
      );
      if (pkgError) throw pkgError;
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Zuvo write failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
