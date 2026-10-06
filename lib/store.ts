/**
 * Local ops store. Swap these helpers for API/DB calls later
 * without rewriting admin screens.
 */

export type UserStatus = "active" | "frozen" | "banned";
export type TicketStatus = "pending" | "paid" | "approved" | "rejected";

export type UserRow = {
  id: string;
  account: string;
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

export type CarKind = "new" | "used";

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
};

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

const KEY = "olx-admin-v7";

export type Store = {
  users: UserRow[];
  recharges: OrderRow[];
  withdraws: WithdrawRow[];
  transfers: TransferRow[];
  vips: VipPlan[];
  coins: CoinRow[];
  cms: CmsPage[];
  notices: NoticeRow[];
  faqs: FaqRow[];
  activities: ActivityRow[];
  audit: AuditRow[];
  settings: Settings;
};

const seed: Store = {
  users: [
    { id: "u1", account: "us6414@gmail.com", vip: "Family SUV", invite: "346099", upline: "—", invest: 220, brokerage: 18.5, status: "active", joined: "12 Sep 2026" },
    { id: "u2", account: "ahmed.k@olx.mail", vip: "City sedan", invite: "882104", upline: "346099", invest: 100, brokerage: 4.2, status: "active", joined: "20 Sep 2026" },
    { id: "u3", account: "+923001112233", vip: "—", invite: "110293", upline: "346099", invest: 0, brokerage: 0, status: "frozen", joined: "01 Oct 2026" },
  ],
  recharges: [
    { id: "r1", account: "us6414@gmail.com", amount: 200, network: "USDT", txHash: "pay-8a…c21", status: "paid", at: "04 Oct 2026 18:12", note: "" },
    { id: "r2", account: "ahmed.k@olx.mail", amount: 100, network: "USDT", txHash: "pay-T9…aa1", status: "pending", at: "05 Oct 2026 09:40", note: "" },
  ],
  withdraws: [
    { id: "w1", account: "us6414@gmail.com", amount: 50, wallet: "USDT", address: "TXk9…a2f1", status: "pending", at: "05 Oct 2026 10:05", note: "" },
    { id: "w2", account: "ahmed.k@olx.mail", amount: 20, wallet: "USDT", address: "0x8c…91b0", status: "paid", at: "03 Oct 2026 14:22", note: "Paid" },
  ],
  transfers: [
    { id: "t1", account: "us6414@gmail.com", from: "invest", to: "brokerage", amount: 10, at: "04 Oct 2026 21:02" },
  ],
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
  coins: [
    { id: "usdt", name: "USDT", network: "Wallet", min: "10", address: "OLX-USDT-WALLET-DEMO", enabled: true },
  ],
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
  audit: [
    { id: "a1", at: "05 Oct 2026 10:08", actor: "admin", action: "login", target: "console" },
  ],
  settings: {
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
  },
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
  const usdt = rows.find((c) => c.id === "usdt" || c.name.toUpperCase().includes("USDT"));
  if (usdt) {
    return [{ ...usdt, id: "usdt", name: usdt.name || "USDT", network: "Wallet" }];
  }
  return fallback;
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
      vips: (parsed.vips ?? base.vips).map(normalizeVip),
      coins: normalizeCoins(parsed.coins ?? [], base.coins),
      cms: parsed.cms ?? base.cms,
      notices: parsed.notices ?? base.notices,
      faqs: parsed.faqs ?? base.faqs,
      activities: parsed.activities ?? base.activities,
      audit: parsed.audit ?? base.audit,
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
