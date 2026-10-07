import { NextResponse } from "next/server";
import { zuvoAdmin } from "@/lib/zuvo";
import { DEFAULT_ADMIN_AUTH, DEFAULT_SETTINGS, migrateCoins, type Store } from "@/lib/store";
import { displayName } from "@/lib/member-name";
import { stripDemoRows } from "@/lib/strip-demo";
import {
  readActivities,
  readActivityState,
  readAdminAuth,
  readAudit,
  readCms,
  readCoins,
  readFaqs,
  readHoldings,
  readNotices,
  readRecharges,
  readSettings,
  readShopHoldings,
  readTransfers,
  readWithdraws,
  writeActivities,
  writeAdminAuth,
  writeAudit,
  writeCms,
  writeCoins,
  writeFaqs,
  writeHoldings,
  writeNotices,
  writeRecharges,
  writeSettings,
  writeShopHoldings,
  writeTransfers,
  writeWithdraws,
} from "@/lib/db-tables";

let opsHold: { at: number; body: { store: Store | null } } | null = null;
const OPS_TTL = 60_000;

function publicStore(store: Store) {
  return { ...store, adminAuth: { user: store.adminAuth?.user || "admin", pass: "" } };
}

async function loadStore(): Promise<Store> {
  const db = zuvoAdmin();
  const membersWithName = db
    .from("members")
    .select("id,account,name,vip,invite,upline,invest,brokerage,status,joined");
  const [
    settings,
    auth,
    coins,
    cms,
    notices,
    faqs,
    activities,
    recharges,
    withdraws,
    transfers,
    holdings,
    shopHoldings,
    audit,
    activityState,
    packsRes,
    membersFirst,
  ] = await Promise.all([
    readSettings(),
    readAdminAuth(),
    readCoins(),
    readCms(),
    readNotices(),
    readFaqs(),
    readActivities(),
    readRecharges(),
    readWithdraws(),
    readTransfers(),
    readHoldings(),
    readShopHoldings(),
    readAudit(),
    readActivityState(),
    db.from("car_packages").select("id,name,kind,invest,returns,term,enabled"),
    membersWithName,
  ]);
  let membersRes = membersFirst;
  if (membersRes.error) {
    membersRes = await db.from("members").select("id,account,vip,invite,upline,invest,brokerage,status,joined");
  }
  const store = {
    settings: { ...DEFAULT_SETTINGS, ...(settings || {}) },
    adminAuth: auth?.user ? auth : { ...DEFAULT_ADMIN_AUTH },
    coins: migrateCoins(coins),
    cms,
    notices,
    faqs,
    activities: activities.map((row) => ({
      id: row.id,
      title: row.title,
      desc: row.desc,
      time: row.time,
      status: row.status === "ended" ? "ended" : "live",
      enabled: row.enabled,
    })),
    recharges: stripDemoRows(recharges),
    withdraws: stripDemoRows(withdraws),
    transfers: stripDemoRows(transfers),
    holdings: [...holdings, ...shopHoldings],
    audit: stripDemoRows(audit),
    activityState,
    users: [],
    vips: [],
  } as Store;
  const members = membersRes.error ? [] : membersRes.data || [];
  store.users = stripDemoRows(
    members.map((row) => ({
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
    }))
  );
  const packs = packsRes.data || [];
  store.vips = packs.map((p) => ({
    id: String(p.id),
    name: String(p.name),
    range: String(p.invest),
    income: String(p.returns),
    days: Number(String(p.term).split(" ")[0]) || 30,
    kind: p.kind === "used" ? "used" : "new",
    image: `/api/package-photo?id=${encodeURIComponent(String(p.id))}`,
    enabled: p.enabled !== false,
  }));
  return store;
}

export async function GET() {
  try {
    if (opsHold && Date.now() - opsHold.at < OPS_TTL) {
      return NextResponse.json(opsHold.body);
    }
    const store = await loadStore();
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
    const prevAuth = await readAdminAuth();
    if (!store.adminAuth?.pass && prevAuth?.pass) store.adminAuth = prevAuth;
    store.recharges = stripDemoRows(store.recharges || []);
    store.withdraws = stripDemoRows(store.withdraws || []);
    store.transfers = stripDemoRows(store.transfers || []);
    store.audit = stripDemoRows(store.audit || []);
    store.users = stripDemoRows(store.users || []);
    await Promise.all([
      writeSettings({ ...DEFAULT_SETTINGS, ...(store.settings || {}) }),
      store.adminAuth?.user && store.adminAuth.pass ? writeAdminAuth(store.adminAuth) : Promise.resolve(),
      writeCoins(migrateCoins(store.coins || [])),
      writeCms(store.cms || []),
      writeNotices(store.notices || []),
      writeFaqs(store.faqs || []),
      writeActivities(store.activities || []),
      writeRecharges(store.recharges),
      writeWithdraws(store.withdraws),
      writeTransfers(store.transfers),
      writeHoldings((store.holdings || []).filter((row) => row.kind !== "jewelry" && row.kind !== "electronics")),
      writeShopHoldings((store.holdings || []).filter((row) => row.kind === "jewelry" || row.kind === "electronics")),
      writeAudit(store.audit),
    ]);
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
        const retry = await db.from("members").upsert(rows.map(({ name: _name, ...rest }) => rest));
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
