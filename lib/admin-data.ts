export type UserRow = {
  id: string;
  account: string;
  vip: string;
  invest: number;
  brokerage: number;
  status: "active" | "frozen";
  joined: string;
};

export type OrderRow = {
  id: string;
  account: string;
  amount: number;
  network: string;
  status: "pending" | "paid" | "rejected";
  at: string;
};

export type WithdrawRow = {
  id: string;
  account: string;
  amount: number;
  wallet: string;
  address: string;
  status: "pending" | "approved" | "rejected";
  at: string;
};

const USERS = "olx-admin-users";
const RECHARGES = "olx-admin-recharges";
const WITHDRAWS = "olx-admin-withdraws";

const seedUsers: UserRow[] = [
  { id: "u1", account: "us6414@gmail.com", vip: "VIP 2", invest: 220, brokerage: 18.5, status: "active", joined: "12 Sep 2026" },
  { id: "u2", account: "ahmed.k@olx.mail", vip: "VIP 1", invest: 100, brokerage: 4.2, status: "active", joined: "20 Sep 2026" },
  { id: "u3", account: "+923001112233", vip: "—", invest: 0, brokerage: 0, status: "frozen", joined: "01 Oct 2026" },
];

const seedRecharges: OrderRow[] = [
  { id: "r1", account: "us6414@gmail.com", amount: 200, network: "BEP20-USDT", status: "paid", at: "04 Oct 2026 18:12" },
  { id: "r2", account: "ahmed.k@olx.mail", amount: 100, network: "TRC20-USDT", status: "pending", at: "05 Oct 2026 09:40" },
];

const seedWithdraws: WithdrawRow[] = [
  { id: "w1", account: "us6414@gmail.com", amount: 50, wallet: "TRC20-USDT", address: "TXk9…a2f1", status: "pending", at: "05 Oct 2026 10:05" },
  { id: "w2", account: "ahmed.k@olx.mail", amount: 20, wallet: "BEP20-USDT", address: "0x8c…91b0", status: "approved", at: "03 Oct 2026 14:22" },
];

function read<T>(key: string, seed: T[]): T[] {
  const raw = window.localStorage.getItem(key);
  if (!raw) {
    window.localStorage.setItem(key, JSON.stringify(seed));
    return seed;
  }
  try {
    return JSON.parse(raw) as T[];
  } catch {
    return seed;
  }
}

function write<T>(key: string, rows: T[]) {
  window.localStorage.setItem(key, JSON.stringify(rows));
}

export function getUsers() {
  return read(USERS, seedUsers);
}
export function saveUsers(rows: UserRow[]) {
  write(USERS, rows);
}

export function getRecharges() {
  return read(RECHARGES, seedRecharges);
}
export function saveRecharges(rows: OrderRow[]) {
  write(RECHARGES, rows);
}

export function getWithdraws() {
  return read(WITHDRAWS, seedWithdraws);
}
export function saveWithdraws(rows: WithdrawRow[]) {
  write(WITHDRAWS, rows);
}
