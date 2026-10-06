/**
 * Local ops store. Swap these helpers for API/DB calls later
 * without rewriting admin screens.
 */

export type UserStatus = "active" | "frozen" | "banned";
export type TicketStatus = "pending" | "paid" | "approved" | "rejected";

export type UserRow = {
  id: string;
  account: string;
  name: string;
  vip: string;
  invite: string;
  upline: string;
  invest: number;
  brokerage: number;
  status: UserStatus;
  joined: string;
};

export type OrderRow = {
  id: string;
  account: string;
  amount: number;
  network: string;
  txHash: string;
  status: "pending" | "paid" | "rejected";
  at: string;
  note: string;
  slipUrl?: string;
};

export type WithdrawRow = {
  id: string;
  account: string;
  amount: number;
  wallet: string;
  address: string;
  status: "pending" | "approved" | "rejected" | "paid";
  at: string;
  note: string;
};

export type TransferRow = {
  id: string;
  account: string;
  from: "invest" | "brokerage";
  to: "invest" | "brokerage";
  amount: number;
  at: string;
};

export type HoldingRow = {
  id: string;
  account: string;
  planId: string;
  name: string;
  kind: string;
  invest: string;
  investAmount: number;
  returns: string;
  term: string;
  image: string;
  status: "active" | "ended";
  startedAt: string;
};

export type CarKind = "new" | "used";
export type ShopKind = "jewelry" | "electronics";

export type ShopPlan = {
  id: string;
  name: string;
  range: string;
  income: string;
  days: number;
  kind: ShopKind;
  image: string;
  enabled: boolean;
};

export const DEFAULT_SHOP_IMAGE: Record<ShopKind, string> = {
  jewelry: "/cars/luxury.jpg",
  electronics: "/cars/executive.jpg",
};

export type VipPlan = {
  id: string;
  name: string;
  range: string;
  income: string;
  days: number;
  kind: CarKind;
  image: string;
  enabled: boolean;
};

export const DEFAULT_CAR_IMAGE: Record<CarKind, string> = {
  new: "/cars/city-sedan.jpg",
  used: "/cars/used-compact.jpg",
};

export type CoinRow = {
  id: string;
  name: string;
  network: string;
  min: string;
  address: string;
  enabled: boolean;
  payKind?: "crypto" | "bank";
  bankName?: string;
  accountName?: string;
  accountNumber?: string;
  iban?: string;
  swift?: string;
  branch?: string;
  instructions?: string;
};

function coinRail(row: Partial<CoinRow>, id: string) {
  const crypto = String(id).toLowerCase() === "usdt";
  return {
    payKind: (row.payKind || (crypto ? "crypto" : "bank")) as "crypto" | "bank",
    bankName: String(row.bankName || ""),
    accountName: String(row.accountName || ""),
    accountNumber: String(row.accountNumber || ""),
    iban: String(row.iban || ""),
    swift: String(row.swift || ""),
    branch: String(row.branch || ""),
    instructions: String(row.instructions || ""),
  };
}

export const DEFAULT_COINS: CoinRow[] = [
  { id: "usdt", name: "USDT", network: "Tether", min: "10", address: "", enabled: true, ...coinRail({}, "usdt") },
  { id: "pkr", name: "PKR", network: "Pakistan", min: "1000", address: "", enabled: true, ...coinRail({}, "pkr") },
  { id: "usd", name: "USD", network: "United States", min: "10", address: "", enabled: true, ...coinRail({}, "usd") },
  { id: "eur", name: "EUR", network: "Europe", min: "10", address: "", enabled: true, ...coinRail({}, "eur") },
  { id: "gbp", name: "GBP", network: "United Kingdom", min: "10", address: "", enabled: true, ...coinRail({}, "gbp") },
  { id: "aed", name: "AED", network: "UAE", min: "20", address: "", enabled: true, ...coinRail({}, "aed") },
  { id: "sar", name: "SAR", network: "Saudi Arabia", min: "20", address: "", enabled: true, ...coinRail({}, "sar") },
  { id: "inr", name: "INR", network: "India", min: "500", address: "", enabled: true, ...coinRail({}, "inr") },
  { id: "cny", name: "CNY", network: "China", min: "50", address: "", enabled: true, ...coinRail({}, "cny") },
];

const LEGACY_CRYPTO = new Set(["usdc", "btc", "eth", "bnb"]);

export function migrateCoins(rows: CoinRow[] | undefined | null): CoinRow[] {
  const list = Array.isArray(rows) ? rows : [];
  const ids = new Set(list.map((row) => String(row.id || "").toLowerCase()));
  const looksLegacy = ids.has("btc") && ids.has("eth") && ids.has("bnb");
  if (!list.length || looksLegacy) {
    return DEFAULT_COINS.map((row) => {
      const live = list.find((item) => String(item.id).toLowerCase() === row.id);
      if (!live) return { ...row };
      return {
        ...row,
        ...coinRail(live, row.id),
        address: live.address || live.accountNumber || row.address,
        min: live.min || row.min,
        enabled: live.enabled !== false,
        network: live.network || row.network,
      };
    });
  }
  return list
    .filter((row) => !LEGACY_CRYPTO.has(String(row.id || "").toLowerCase()))
    .map((row) => {
      const id = String(row.id || row.name || "coin").toLowerCase().replace(/[^a-z0-9]+/g, "-") || "coin";
      return {
        id,
        name: String(row.name || "PKR").toUpperCase(),
        network: String(row.network || "Bank"),
        min: String(row.min || "10"),
        address: String(row.address || row.accountNumber || ""),
        enabled: row.enabled !== false,
        ...coinRail(row, id),
      };
    });
}

export type CmsPage = { slug: string; title: string; body: string };

export type NoticeRow = {
  id: string;
  title: string;
  body: string;
  enabled: boolean;
};

export type FaqRow = {
  id: string;
  tab: string;
  title: string;
  body: string;
  enabled: boolean;
};

export type ActivityRow = {
  id: string;
  title: string;
  desc: string;
  time: string;
  status: "live" | "ended";
  enabled: boolean;
};

export type AuditRow = {
  id: string;
  at: string;
  actor: string;
  action: string;
  target: string;
  amount?: string;
};

export type Settings = {
  siteName: string;
  telegram: string;
  defaultLang: string;
  registerOn: boolean;
  loginOn: boolean;
  rechargeOn: boolean;
  withdrawOn: boolean;
  transferOn: boolean;
  packagesOn: boolean;
  minWithdraw: number;
  payoutFee: number;
  dailyCap: number;
  maintenance: string;
  commissionL1: number;
  commissionL2: number;
  commissionL3: number;
};

export const DEFAULT_SETTINGS: Settings = {
  siteName: "OLX Business",
  telegram: "https://t.me/olxbusiness_help",
  defaultLang: "en",
  registerOn: true,
  loginOn: true,
  rechargeOn: true,
  withdrawOn: true,
  transferOn: true,
  packagesOn: true,
  minWithdraw: 1,
  payoutFee: 1,
  dailyCap: 5000,
  maintenance: "",
  commissionL1: 15,
  commissionL2: 3,
  commissionL3: 1,
};

const KEY = "olx-admin-v9";

export type AdminAuth = { user: string; pass: string };

export const DEFAULT_ADMIN_AUTH: AdminAuth = { user: "admin", pass: "olx2026" };

export type Store = {
  users: UserRow[];
  recharges: OrderRow[];
  withdraws: WithdrawRow[];
  transfers: TransferRow[];
  holdings: HoldingRow[];
  vips: VipPlan[];
  coins: CoinRow[];
  cms: CmsPage[];
  notices: NoticeRow[];
  faqs: FaqRow[];
  activities: ActivityRow[];
  audit: AuditRow[];
  settings: Settings;
  adminAuth: AdminAuth;
  activityState?: Record<string, unknown>;
};

const seed: Store = {
  users: [],
  recharges: [],
  withdraws: [],
  transfers: [],
  holdings: [],
  vips: [
    { id: "new-city", name: "City sedan", range: "$100 – $199", income: "$3.00", days: 30, kind: "new", image: "/cars/city-sedan.jpg", enabled: true },
    { id: "new-family", name: "Family SUV", range: "$200 – $499", income: "$24.00", days: 90, kind: "new", image: "/cars/family-suv.jpg", enabled: true },
    { id: "new-exec", name: "Executive", range: "$500 – $1,999", income: "$60.00", days: 150, kind: "new", image: "/cars/executive.jpg", enabled: true },
    { id: "new-luxe", name: "Luxury", range: "$2,000 – $4,999", income: "$360.00", days: 180, kind: "new", image: "/cars/luxury.jpg", enabled: true },
    { id: "used-compact", name: "Certified compact", range: "$100 – $199", income: "$3.00", days: 30, kind: "used", image: "/cars/used-compact.jpg", enabled: true },
    { id: "used-sedan", name: "Certified sedan", range: "$200 – $499", income: "$24.00", days: 90, kind: "used", image: "/cars/used-sedan.jpg", enabled: true },
    { id: "used-suv", name: "Certified SUV", range: "$500 – $1,999", income: "$60.00", days: 150, kind: "used", image: "/cars/used-suv.jpg", enabled: true },
    { id: "used-premium", name: "Certified premium", range: "$2,000 – $4,999", income: "$360.00", days: 180, kind: "used", image: "/cars/used-premium.jpg", enabled: true },
  ],
  coins: [...DEFAULT_COINS],
  cms: [
    { slug: "about", title: "About Us", body: "OLX Business offers new and certified used car investment packages. Members fund a USDT wallet and pick a plan." },
    { slug: "agreement", title: "User Agreement", body: "By creating an account you accept this agreement." },
    { slug: "privacy", title: "Privacy Policy", body: "We collect account details you submit to run the app." },
    { slug: "support", title: "Support", body: "Contact @olxbusiness_help on Telegram. Online 24 hours." },
    { slug: "faq", title: "FAQ intro", body: "Car packages, USDT funding, and payouts." },
    { slug: "app", title: "App download", body: "Android 8+ or iOS 14+. Add to Home Screen." },
  ],
  notices: [
    { id: "n1", title: "Welcome to OLX Business", body: "New and used car packages are live. Fund USDT to invest.", enabled: true },
    { id: "n2", title: "Withdraw window", body: "Withdrawals are processed within 1–3 hours.", enabled: true },
  ],
  faqs: [
    { id: "f1", tab: "cars", title: "How do car packages work?", body: "Fund USDT, pick New or Used, invest in a package. Returns follow the plan term.", enabled: true },
    { id: "f2", tab: "wallet", title: "How do I fund and withdraw?", body: "USDT only. No chain list. Enter your payout address on Withdraw.", enabled: true },
    { id: "f3", tab: "about", title: "How do I contact support?", body: "Open Telegram @olxbusiness_help. Online 24 hours.", enabled: true },
  ],
  activities: [
    { id: "a-checkin", title: "7-Day Check-in", desc: "Check in every day. Day 7 unlocks a larger USDT bonus.", time: "Long-term", status: "live", enabled: true },
    { id: "a-lucky", title: "Lucky Draw", desc: "Spin once a day for extra USDT.", time: "Daily reset 00:00 UTC", status: "live", enabled: true },
    { id: "a-invite", title: "Invite & Earn", desc: "Share your invite code and earn team rebate.", time: "Long-term", status: "live", enabled: true },
  ],
  audit: [],
  settings: { ...DEFAULT_SETTINGS },
  adminAuth: { ...DEFAULT_ADMIN_AUTH },
};

function normalizeVip(row: Partial<VipPlan> & { rebate?: string; hashpower?: string }): VipPlan {
  const kind: CarKind =
    row.kind === "used" || String(row.rebate || "").toLowerCase().includes("used") ? "used" : "new";
  const rawImage = typeof row.image === "string" ? row.image.trim() : "";
  const image =
    rawImage &&
    !rawImage.includes("unsplash.com") &&
    (/^https?:\/\//i.test(rawImage) ||
      rawImage.startsWith("data:image/") ||
      rawImage.startsWith("/cars/") ||
      rawImage.startsWith("/uploads/"))
      ? rawImage
      : DEFAULT_CAR_IMAGE[kind];
  return {
    id: String(row.id || nid("car")),
    name: String(row.name || "Package"),
    range: String(row.range || ""),
    income: String(row.income || ""),
    days: Number(row.days) || 30,
    kind,
    image,
    enabled: row.enabled !== false,
  };
}

function normalizeSettings(
  raw: Partial<Settings> & { miningOn?: boolean; bep20Fee?: number; trc20Fee?: number },
  base: Settings
): Settings {
  return {
    ...base,
    ...raw,
    packagesOn: raw.packagesOn ?? raw.miningOn ?? base.packagesOn,
    payoutFee: Number(raw.payoutFee ?? raw.bep20Fee ?? base.payoutFee),
  };
}

function normalizeCoins(rows: CoinRow[], fallback: CoinRow[]): CoinRow[] {
  const list = migrateCoins(rows.length ? rows : fallback);
  return list.length ? list : fallback;
}

function load(): Store {
  const base = structuredClone(seed);
  if (typeof window === "undefined") return base;
  const raw = window.localStorage.getItem(KEY);
  if (!raw) {
    window.localStorage.setItem(KEY, JSON.stringify(base));
    return base;
  }
  try {
    const parsed = JSON.parse(raw) as Partial<Store>;
    return {
      ...base,
      ...parsed,
      settings: normalizeSettings(parsed.settings || {}, base.settings),
      users: parsed.users ?? base.users,
      recharges: parsed.recharges ?? base.recharges,
      withdraws: parsed.withdraws ?? base.withdraws,
      transfers: parsed.transfers ?? base.transfers,
      holdings: parsed.holdings ?? base.holdings,
      vips: (parsed.vips ?? base.vips).map(normalizeVip),
      coins: normalizeCoins(parsed.coins ?? [], base.coins),
      cms: parsed.cms ?? base.cms,
      notices: parsed.notices ?? base.notices,
      faqs: parsed.faqs ?? base.faqs,
      activities: parsed.activities ?? base.activities,
      audit: parsed.audit ?? base.audit,
      adminAuth: parsed.adminAuth?.user ? { user: String(parsed.adminAuth.user), pass: String(parsed.adminAuth.pass || "") } : base.adminAuth,
      activityState: parsed.activityState,
    };
  } catch {
    return base;
  }
}

export function nid(prefix: string) {
  return `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
}

export function stamp() {
  return new Date().toLocaleString();
}

function save(store: Store) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(store));
}

export function getStore() {
  return load();
}

export function replaceStore(store: Store) {
  save(store);
  return store;
}

let opsInflight: Promise<Store> | null = null;

export async function fetchOpsStore(): Promise<Store> {
  if (opsInflight) return opsInflight;
  opsInflight = (async () => {
    try {
      const res = await fetch("/api/ops", { cache: "no-store" });
      const data = (await res.json()) as { store?: Store | null };
      if (res.ok && data.store) return replaceStore(data.store);
    } catch {
      /* use local cache */
    }
    return getStore();
  })().finally(() => {
    opsInflight = null;
  });
  return opsInflight;
}

function persistRemote(store: Store) {
  if (typeof window === "undefined") return;
  void fetch("/api/ops", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(store),
  }).catch(() => {});
}

export function patchStore(update: (store: Store) => void, audit?: Omit<AuditRow, "id" | "at" | "actor">) {
  const store = load();
  update(store);
  if (audit) {
    store.audit.unshift({
      id: `a${Date.now()}`,
      at: new Date().toLocaleString(),
      actor: "admin",
      ...audit,
    });
  }
  save(store);
  persistRemote(store);
  return store;
}

export function creditUser(id: string, wallet: "invest" | "brokerage", delta: number, reason: string) {
  return patchStore(
    (s) => {
      const user = s.users.find((u) => u.id === id);
      if (!user) return;
      user[wallet] = Math.max(0, Number((user[wallet] + delta).toFixed(2)));
    },
    { action: delta >= 0 ? "credit" : "debit", target: id, amount: `${delta} ${wallet} (${reason})` }
  );
}

export function toCsv(rows: Record<string, string | number>[]) {
  if (!rows.length) return "";
  const keys = Object.keys(rows[0]);
  return [keys.join(","), ...rows.map((row) => keys.map((k) => `"${row[k]}"`).join(","))].join("\n");
}

export function downloadCsv(name: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

export function downloadJson(name: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}
