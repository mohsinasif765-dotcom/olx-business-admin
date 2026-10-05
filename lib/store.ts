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

export type VipPlan = {
  id: string;
  name: string;
  range: string;
  income: string;
  days: number;
  rebate: string;
  hashpower: string;
  enabled: boolean;
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
  miningOn: boolean;
  minWithdraw: number;
  bep20Fee: number;
  trc20Fee: number;
  dailyCap: number;
  maintenance: string;
  commissionL1: number;
  commissionL2: number;
  commissionL3: number;
};

const KEY = "olx-admin-v2";

type Store = {
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
    { id: "u1", account: "us6414@gmail.com", vip: "VIP 2", invite: "346099", upline: "—", invest: 220, brokerage: 18.5, status: "active", joined: "12 Sep 2026" },
    { id: "u2", account: "ahmed.k@olx.mail", vip: "VIP 1", invite: "882104", upline: "346099", invest: 100, brokerage: 4.2, status: "active", joined: "20 Sep 2026" },
    { id: "u3", account: "+923001112233", vip: "—", invite: "110293", upline: "346099", invest: 0, brokerage: 0, status: "frozen", joined: "01 Oct 2026" },
  ],
  recharges: [
    { id: "r1", account: "us6414@gmail.com", amount: 200, network: "BEP20-USDT", txHash: "0x8a…c21", status: "paid", at: "04 Oct 2026 18:12", note: "" },
    { id: "r2", account: "ahmed.k@olx.mail", amount: 100, network: "TRC20-USDT", txHash: "T9k…aa1", status: "pending", at: "05 Oct 2026 09:40", note: "" },
  ],
  withdraws: [
    { id: "w1", account: "us6414@gmail.com", amount: 50, wallet: "TRC20-USDT", address: "TXk9…a2f1", status: "pending", at: "05 Oct 2026 10:05", note: "" },
    { id: "w2", account: "ahmed.k@olx.mail", amount: 20, wallet: "BEP20-USDT", address: "0x8c…91b0", status: "paid", at: "03 Oct 2026 14:22", note: "Paid on chain" },
  ],
  transfers: [
    { id: "t1", account: "us6414@gmail.com", from: "invest", to: "brokerage", amount: 10, at: "04 Oct 2026 21:02" },
  ],
  vips: [
    { id: "vip1", name: "VIP 1", range: "$100 – $199.99", income: "$3.00", days: 1, rebate: "0.01%", hashpower: "1.0 GH/s", enabled: true },
    { id: "vip2", name: "VIP 2", range: "$200 – $499.99", income: "$24.00", days: 3, rebate: "0.01%", hashpower: "8.0 GH/s", enabled: true },
    { id: "vip3", name: "VIP 3", range: "$500 – $1,999.99", income: "$60.00", days: 5, rebate: "0.01%", hashpower: "20 GH/s", enabled: true },
    { id: "vip4", name: "VIP 4", range: "$2,000 – $4,999.99", income: "$360.00", days: 7, rebate: "0.02%", hashpower: "120 GH/s", enabled: true },
    { id: "vip5", name: "VIP 5", range: "$5,000 – $9,999.99", income: "$1,050.00", days: 10, rebate: "0.03%", hashpower: "350 GH/s", enabled: true },
    { id: "vip6", name: "VIP 6", range: "$10,000 – $19,999.99", income: "$2,400.00", days: 15, rebate: "0.04%", hashpower: "800 GH/s", enabled: true },
    { id: "vip7", name: "VIP 7", range: "$20,000 – $29,999.99", income: "$6,000.00", days: 20, rebate: "0.05%", hashpower: "2.0 TH/s", enabled: true },
    { id: "vip8", name: "VIP 8", range: "$30,000+", income: "$10,500.00", days: 30, rebate: "0.06%", hashpower: "3.5 TH/s", enabled: true },
  ],
  coins: [
    { id: "bep20-usdt", name: "BEP20-USDT", network: "BEP20", min: "10", address: "0xDEMO_BEP20_USDT_ADDRESS_OLX", enabled: true },
    { id: "trc20-usdt", name: "TRC20-USDT", network: "TRC20", min: "10", address: "TDEMO_TRC20_USDT_ADDRESS_OLX99", enabled: true },
    { id: "eth-usdt", name: "ETH-USDT", network: "ERC20", min: "20", address: "0xDEMO_ETH_USDT_ADDRESS_OLX99", enabled: true },
  ],
  cms: [
    { slug: "about", title: "About Us", body: "OLX Business is a cloud-mining membership platform in Dubai." },
    { slug: "agreement", title: "User Agreement", body: "By creating an account you accept this agreement." },
    { slug: "privacy", title: "Privacy Policy", body: "We collect account details you submit to run the app." },
    { slug: "support", title: "Support", body: "Contact @olxbusiness_help on Telegram. Online 24 hours." },
    { slug: "faq", title: "FAQ intro", body: "Cloud mining, VIP plans, recharge and withdraw." },
    { slug: "app", title: "App download", body: "Android 8+ or iOS 14+. Add to Home Screen." },
  ],
  notices: [
    { id: "n1", title: "Welcome to OLX Business", body: "VIP mining is live. Recharge USDT to start.", enabled: true },
    { id: "n2", title: "Withdraw window", body: "Withdrawals are processed within 1–3 hours.", enabled: true },
  ],
  faqs: [
    { id: "f1", tab: "mining", title: "How does cloud mining start?", body: "Create an account, recharge, and pick a VIP plan. Mining begins after payment is confirmed.", enabled: true },
    { id: "f2", tab: "wallet", title: "Which networks are supported?", body: "USDT on BEP20 and TRC20 is primary. Always send the same coin on the selected network.", enabled: true },
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
    miningOn: true,
    minWithdraw: 1,
    bep20Fee: 1,
    trc20Fee: 0,
    dailyCap: 5000,
    maintenance: "",
    commissionL1: 15,
    commissionL2: 3,
    commissionL3: 1,
  },
};

function load(): Store {
  const raw = window.localStorage.getItem(KEY);
  const base = structuredClone(seed);
  if (!raw) {
    window.localStorage.setItem(KEY, JSON.stringify(base));
    return base;
  }
  try {
    const parsed = JSON.parse(raw) as Partial<Store>;
    return {
      ...base,
      ...parsed,
      settings: { ...base.settings, ...(parsed.settings || {}) },
      users: parsed.users ?? base.users,
      recharges: parsed.recharges ?? base.recharges,
      withdraws: parsed.withdraws ?? base.withdraws,
      transfers: parsed.transfers ?? base.transfers,
      vips: parsed.vips ?? base.vips,
      coins: parsed.coins ?? base.coins,
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
  window.localStorage.setItem(KEY, JSON.stringify(store));
}

export function getStore() {
  return load();
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
