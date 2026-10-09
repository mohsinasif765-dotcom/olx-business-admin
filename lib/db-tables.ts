import { zuvoAdmin } from "@/lib/zuvo";

export type WalletMode = "pkr" | "usdt" | "dual";

export type SettingsRow = {
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
  /** Member app currency policy: PKR only, USDT only, or both rails. */
  walletMode: WalletMode;
  /** Trade FX–style: Bank withdraw estimated PKR = USDT × rate. */
  usdtToPkrRate: number;
  aboutTagline: string;
  aboutBody: string;
  aboutStep1: string;
  aboutStep2: string;
  aboutStep3: string;
  aboutVersion: string;
  companyName: string;
  companyAddress: string;
  companyNo: string;
  companyRegDate: string;
  companyIssued: string;
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

export type CmsPage = { slug: string; title: string; body: string };
export type NoticeRow = { id: string; title: string; body: string; enabled: boolean };
export type FaqRow = { id: string; tab: string; title: string; body: string; enabled: boolean };
export type ActivityRow = { id: string; title: string; desc: string; time: string; status: string; enabled: boolean };
export type RechargeRow = {
  id: string;
  account: string;
  amount: number;
  network: string;
  txHash: string;
  status: string;
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
  status: string;
  at: string;
  note: string;
};
export type TransferRow = {
  id: string;
  account: string;
  from: string;
  to: string;
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
export type AuditRow = { id: string; at: string; actor: string; action: string; target: string; amount?: string };
export type ActivityState = Record<string, { checkin?: { date: string; streak: number }; lucky?: { date: string; prize: string } }>;

function db() {
  return zuvoAdmin();
}

function money(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? Number(n.toFixed(2)) : 0;
}

function on(value: unknown) {
  return value !== false;
}

export async function replaceKeyed(table: string, pk: string, rows: Record<string, unknown>[]) {
  const client = db();
  const { data: existing, error: readError } = await client.from(table).select(pk);
  if (readError) throw readError;
  const keep = new Set(rows.map((row) => String(row[pk])));
  const extra = ((existing || []) as unknown as Record<string, string>[])
    .map((row) => String(row[pk]))
    .filter((id) => id && !keep.has(id));
  if (extra.length) {
    const { error } = await client.from(table).delete().in(pk, extra);
    if (error) throw error;
  }
  if (!rows.length) return;
  const { error } = await client.from(table).upsert(rows);
  if (error) throw error;
}

function mapWalletMode(value: unknown): WalletMode {
  const mode = String(value || "pkr").toLowerCase();
  if (mode === "usdt") return "usdt";
  if (mode === "dual") return "dual";
  return "pkr";
}

export function mapSettings(row: Record<string, unknown> | null | undefined): SettingsRow | null {
  if (!row) return null;
  return {
    siteName: String(row.site_name || "OLX Business"),
    telegram: String(row.telegram || "https://t.me/olxbusiness_help"),
    defaultLang: String(row.default_lang || "en"),
    registerOn: on(row.register_on),
    loginOn: on(row.login_on),
    rechargeOn: on(row.recharge_on),
    withdrawOn: on(row.withdraw_on),
    transferOn: on(row.transfer_on),
    packagesOn: on(row.packages_on),
    minWithdraw: row.min_withdraw == null || row.min_withdraw === "" ? 1 : money(row.min_withdraw),
    payoutFee: row.payout_fee == null || row.payout_fee === "" ? 1 : money(row.payout_fee),
    dailyCap: row.daily_cap == null || row.daily_cap === "" ? 5000 : money(row.daily_cap),
    maintenance: String(row.maintenance || ""),
    commissionL1: row.commission_l1 == null || row.commission_l1 === "" ? 15 : money(row.commission_l1),
    commissionL2: row.commission_l2 == null || row.commission_l2 === "" ? 3 : money(row.commission_l2),
    commissionL3: row.commission_l3 == null || row.commission_l3 === "" ? 1 : money(row.commission_l3),
    walletMode: mapWalletMode(row.wallet_mode ?? row.walletMode),
    usdtToPkrRate:
      row.usdt_to_pkr_rate == null || row.usdt_to_pkr_rate === ""
        ? 280
        : money(row.usdt_to_pkr_rate ?? row.usdtToPkrRate) || 280,
    aboutTagline: String(row.about_tagline ?? row.aboutTagline ?? ""),
    aboutBody: String(row.about_body ?? row.aboutBody ?? ""),
    aboutStep1: String(row.about_step1 ?? row.aboutStep1 ?? ""),
    aboutStep2: String(row.about_step2 ?? row.aboutStep2 ?? ""),
    aboutStep3: String(row.about_step3 ?? row.aboutStep3 ?? ""),
    aboutVersion: String(row.about_version ?? row.aboutVersion ?? "Version 1.0"),
    companyName: String(row.company_name ?? row.companyName ?? "OLX Business Digital Ltd"),
    companyAddress: String(
      row.company_address ??
        row.companyAddress ??
        "Office 2208, Bay View Tower, Business Bay, Dubai, United Arab Emirates",
    ),
    companyNo: String(row.company_no ?? row.companyNo ?? "OB-2026-8841"),
    companyRegDate: String(row.company_reg_date ?? row.companyRegDate ?? "12 Jan 2026"),
    companyIssued: String(row.company_issued ?? row.companyIssued ?? "05 Oct 2026"),
  };
}

export function settingsToRow(s: SettingsRow) {
  return {
    id: 1,
    site_name: s.siteName,
    telegram: s.telegram,
    default_lang: s.defaultLang,
    register_on: s.registerOn,
    login_on: s.loginOn,
    recharge_on: s.rechargeOn,
    withdraw_on: s.withdrawOn,
    transfer_on: s.transferOn,
    packages_on: s.packagesOn,
    min_withdraw: s.minWithdraw,
    payout_fee: s.payoutFee,
    daily_cap: s.dailyCap,
    maintenance: s.maintenance,
    commission_l1: s.commissionL1,
    commission_l2: s.commissionL2,
    commission_l3: s.commissionL3,
    wallet_mode: mapWalletMode(s.walletMode),
    usdt_to_pkr_rate: money(s.usdtToPkrRate) || 280,
    about_tagline: s.aboutTagline,
    about_body: s.aboutBody,
    about_step1: s.aboutStep1,
    about_step2: s.aboutStep2,
    about_step3: s.aboutStep3,
    about_version: s.aboutVersion,
    company_name: s.companyName,
    company_address: s.companyAddress,
    company_no: s.companyNo,
    company_reg_date: s.companyRegDate,
    company_issued: s.companyIssued,
    updated_at: new Date().toISOString(),
  };
}

export function mapCoin(row: Record<string, unknown>): CoinRow {
  return {
    id: String(row.id),
    name: String(row.name || ""),
    network: String(row.network || ""),
    min: String(row.min || "10"),
    address: String(row.address || row.account_number || ""),
    enabled: on(row.enabled),
    payKind: row.pay_kind === "crypto" || row.payKind === "crypto" ? "crypto" : "bank",
    bankName: String(row.bank_name || row.bankName || ""),
    accountName: String(row.account_name || row.accountName || ""),
    accountNumber: String(row.account_number || row.accountNumber || ""),
    iban: String(row.iban || ""),
    swift: String(row.swift || ""),
    branch: String(row.branch || ""),
    instructions: String(row.instructions || ""),
  };
}

export function coinToRow(c: CoinRow) {
  return {
    id: c.id,
    name: c.name,
    network: c.network,
    min: c.min,
    address: c.address,
    enabled: c.enabled,
    pay_kind: c.payKind || "bank",
    bank_name: c.bankName || "",
    account_name: c.accountName || "",
    account_number: c.accountNumber || "",
    iban: c.iban || "",
    swift: c.swift || "",
    branch: c.branch || "",
    instructions: c.instructions || "",
  };
}

export function mapHolding(row: Record<string, unknown>): HoldingRow {
  return {
    id: String(row.id),
    account: String(row.account),
    planId: String(row.plan_id || row.planId || ""),
    name: String(row.name || ""),
    kind: String(row.kind || "new"),
    invest: String(row.invest || ""),
    investAmount: money(row.invest_amount ?? row.investAmount),
    returns: String(row.returns || ""),
    term: String(row.term || ""),
    image: String(row.image || ""),
    status: row.status === "ended" ? "ended" : "active",
    startedAt: String(row.started_at || row.startedAt || ""),
  };
}

export function holdingToRow(h: HoldingRow) {
  return {
    id: h.id,
    account: h.account,
    plan_id: h.planId,
    name: h.name,
    kind: h.kind,
    invest: h.invest,
    invest_amount: h.investAmount,
    returns: h.returns,
    term: h.term,
    image: h.image,
    status: h.status,
    started_at: h.startedAt,
  };
}

export async function readSettings() {
  const { data, error } = await db().from("site_settings").select("*").eq("id", 1).maybeSingle();
  if (error) throw error;
  return mapSettings(data as Record<string, unknown> | null);
}

export async function writeSettings(s: SettingsRow) {
  const { error } = await db().from("site_settings").upsert(settingsToRow(s));
  if (error) throw error;
}

export async function readAdminAuth() {
  const { data, error } = await db().from("admin_auth").select("*").eq("id", 1).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return { user: String(data.username || "admin"), pass: String(data.password || "") };
}

export async function writeAdminAuth(auth: { user: string; pass: string }) {
  const { error } = await db().from("admin_auth").upsert({ id: 1, username: auth.user, password: auth.pass });
  if (error) throw error;
}

export async function readCoins() {
  const { data, error } = await db().from("pay_rails").select("*").order("id");
  if (error) throw error;
  return (data || []).map((row) => mapCoin(row as Record<string, unknown>));
}

export async function writeCoins(rows: CoinRow[]) {
  await replaceKeyed("pay_rails", "id", rows.map(coinToRow));
}

export async function upsertCoin(row: CoinRow) {
  const { error } = await db().from("pay_rails").upsert(coinToRow(row));
  if (error) throw error;
}

export async function deleteCoin(id: string) {
  const { error } = await db().from("pay_rails").delete().eq("id", id);
  if (error) throw error;
}

export async function readCms() {
  const { data, error } = await db().from("cms_pages").select("*").order("slug");
  if (error) throw error;
  return (data || []).map((row) => ({ slug: String(row.slug), title: String(row.title), body: String(row.body || "") }));
}

export async function writeCms(rows: CmsPage[]) {
  await replaceKeyed(
    "cms_pages",
    "slug",
    rows.map((row) => ({ slug: row.slug, title: row.title, body: row.body }))
  );
}

export async function readNotices() {
  const { data, error } = await db().from("notices").select("*").order("id");
  if (error) throw error;
  return (data || []).map((row) => ({
    id: String(row.id),
    title: String(row.title),
    body: String(row.body || ""),
    enabled: on(row.enabled),
  }));
}

export async function writeNotices(rows: NoticeRow[]) {
  await replaceKeyed(
    "notices",
    "id",
    rows.map((row) => ({ id: row.id, title: row.title, body: row.body, enabled: row.enabled }))
  );
}

export async function readFaqs() {
  const { data, error } = await db().from("faqs").select("*").order("id");
  if (error) throw error;
  return (data || []).map((row) => ({
    id: String(row.id),
    tab: String(row.tab || "about"),
    title: String(row.title),
    body: String(row.body || ""),
    enabled: on(row.enabled),
  }));
}

export async function writeFaqs(rows: FaqRow[]) {
  await replaceKeyed(
    "faqs",
    "id",
    rows.map((row) => ({ id: row.id, tab: row.tab, title: row.title, body: row.body, enabled: row.enabled }))
  );
}

export async function readActivities() {
  const { data, error } = await db().from("activities").select("*").order("id");
  if (error) throw error;
  return (data || []).map((row) => ({
    id: String(row.id),
    title: String(row.title),
    desc: String(row.description || ""),
    time: String(row.time_label || ""),
    status: String(row.status || "live"),
    enabled: on(row.enabled),
  }));
}

export async function writeActivities(rows: ActivityRow[]) {
  await replaceKeyed(
    "activities",
    "id",
    rows.map((row) => ({
      id: row.id,
      title: row.title,
      description: row.desc,
      time_label: row.time,
      status: row.status,
      enabled: row.enabled,
    }))
  );
}

export async function readActivityState(): Promise<ActivityState> {
  const { data, error } = await db().from("activity_state").select("*");
  if (error) throw error;
  const out: ActivityState = {};
  for (const row of data || []) {
    const account = String(row.account);
    out[account] = {};
    if (row.checkin_date) out[account].checkin = { date: String(row.checkin_date), streak: Number(row.checkin_streak) || 0 };
    if (row.lucky_date) out[account].lucky = { date: String(row.lucky_date), prize: String(row.lucky_prize || "0.00") };
  }
  return out;
}

export async function upsertActivityState(account: string, state: { checkin?: { date: string; streak: number }; lucky?: { date: string; prize: string } }) {
  const { error } = await db().from("activity_state").upsert({
    account,
    checkin_date: state.checkin?.date || "",
    checkin_streak: state.checkin?.streak || 0,
    lucky_date: state.lucky?.date || "",
    lucky_prize: state.lucky?.prize || "",
  });
  if (error) throw error;
}

export async function insertLedgerTx(row: {
  id: string;
  account: string;
  kind: string;
  amount: number;
  wallet?: string;
  status?: string;
  note?: string;
  at?: string;
}) {
  const { error } = await db().from("ledger_tx").insert({
    id: row.id,
    account: row.account,
    kind: row.kind,
    amount: row.amount,
    wallet: row.wallet || "invest",
    status: row.status || "pending",
    note: row.note || "",
    at: row.at || new Date().toISOString(),
  });
  if (error) throw error;
}

export async function readLedgerTx(account?: string) {
  let query = db().from("ledger_tx").select("*").order("at", { ascending: false }).limit(300);
  if (account) query = query.eq("account", account);
  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map((row) => ({
    id: String(row.id),
    account: String(row.account),
    kind: String(row.kind),
    amount: money(row.amount),
    wallet: String(row.wallet || "invest"),
    status: String(row.status || "pending"),
    note: String(row.note || ""),
    at: String(row.at || ""),
  }));
}

export async function readRecharges() {
  const { data, error } = await db().from("recharges").select("*").order("at", { ascending: false });
  if (error) throw error;
  return (data || []).map((row) => ({
    id: String(row.id),
    account: String(row.account),
    amount: money(row.amount),
    network: String(row.network || ""),
    txHash: String(row.tx_hash || ""),
    status: String(row.status || "pending"),
    at: String(row.at || ""),
    note: String(row.note || ""),
    slipUrl: String(row.slip_url || ""),
  }));
}

export async function patchRecharge(id: string, patch: Record<string, unknown>) {
  const { error } = await db().from("recharges").update(patch).eq("id", id);
  if (error) throw error;
}

export async function patchWithdraw(id: string, patch: Record<string, unknown>) {
  const { error } = await db().from("withdraws").update(patch).eq("id", id);
  if (error) throw error;
}

export async function insertRecharge(row: RechargeRow) {
  const { error } = await db().from("recharges").insert({
    id: row.id,
    account: row.account,
    amount: row.amount,
    network: row.network,
    tx_hash: row.txHash,
    status: row.status,
    at: row.at,
    note: row.note,
    slip_url: row.slipUrl || "",
  });
  if (error) throw error;
}

export async function writeRecharges(rows: RechargeRow[]) {
  await replaceKeyed(
    "recharges",
    "id",
    rows.map((row) => ({
      id: row.id,
      account: row.account,
      amount: row.amount,
      network: row.network,
      tx_hash: row.txHash,
      status: row.status,
      at: row.at,
      note: row.note,
      slip_url: row.slipUrl || "",
    }))
  );
}

export async function readWithdraws() {
  const { data, error } = await db().from("withdraws").select("*").order("at", { ascending: false });
  if (error) throw error;
  return (data || []).map((row) => ({
    id: String(row.id),
    account: String(row.account),
    amount: money(row.amount),
    wallet: String(row.wallet || ""),
    address: String(row.address || ""),
    status: String(row.status || "pending"),
    at: String(row.at || ""),
    note: String(row.note || ""),
  }));
}

export async function insertWithdraw(row: WithdrawRow) {
  const { error } = await db().from("withdraws").insert({
    id: row.id,
    account: row.account,
    amount: row.amount,
    wallet: row.wallet,
    address: row.address,
    status: row.status,
    at: row.at,
    note: row.note,
  });
  if (error) throw error;
}

export async function writeWithdraws(rows: WithdrawRow[]) {
  await replaceKeyed(
    "withdraws",
    "id",
    rows.map((row) => ({
      id: row.id,
      account: row.account,
      amount: row.amount,
      wallet: row.wallet,
      address: row.address,
      status: row.status,
      at: row.at,
      note: row.note,
    }))
  );
}

export async function readTransfers() {
  const { data, error } = await db().from("transfers").select("*").order("at", { ascending: false });
  if (error) throw error;
  return (data || []).map((row) => ({
    id: String(row.id),
    account: String(row.account),
    from: String(row.from_wallet || "invest"),
    to: String(row.to_wallet || "brokerage"),
    amount: money(row.amount),
    at: String(row.at || ""),
  }));
}

export async function insertTransfer(row: TransferRow) {
  const { error } = await db().from("transfers").insert({
    id: row.id,
    account: row.account,
    from_wallet: row.from,
    to_wallet: row.to,
    amount: row.amount,
    at: row.at,
  });
  if (error) throw error;
}

export async function writeTransfers(rows: TransferRow[]) {
  await replaceKeyed(
    "transfers",
    "id",
    rows.map((row) => ({
      id: row.id,
      account: row.account,
      from_wallet: row.from,
      to_wallet: row.to,
      amount: row.amount,
      at: row.at,
    }))
  );
}

export async function readHoldings(account?: string) {
  let query = db().from("car_holdings").select("*").order("started_at", { ascending: false });
  if (account) query = query.eq("account", account);
  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map((row) => mapHolding(row as Record<string, unknown>));
}

export async function insertHolding(row: HoldingRow) {
  const { error } = await db().from("car_holdings").upsert(holdingToRow(row));
  if (error) throw error;
}

export async function readShopHoldings(account?: string) {
  let query = db().from("shop_holdings").select("*").order("started_at", { ascending: false });
  if (account) query = query.eq("account", account);
  const { data, error } = await query;
  if (error) return [];
  return (data || []).map((row) => mapHolding(row as Record<string, unknown>));
}

export async function insertShopHolding(row: HoldingRow) {
  const { error } = await db().from("shop_holdings").upsert(holdingToRow(row));
  if (error) throw error;
}

export async function writeHoldings(rows: HoldingRow[]) {
  await replaceKeyed("car_holdings", "id", rows.map(holdingToRow));
}

export async function writeShopHoldings(rows: HoldingRow[]) {
  await replaceKeyed("shop_holdings", "id", rows.map(holdingToRow));
}

export async function readAudit() {
  const { data, error } = await db().from("audit_log").select("*").order("at", { ascending: false }).limit(200);
  if (error) throw error;
  return (data || []).map((row) => ({
    id: String(row.id),
    at: String(row.at || ""),
    actor: String(row.actor || "admin"),
    action: String(row.action || ""),
    target: String(row.target || ""),
    amount: String(row.amount || ""),
  }));
}

export async function insertAudit(row: AuditRow) {
  const { error } = await db().from("audit_log").insert({
    id: row.id,
    at: row.at,
    actor: row.actor,
    action: row.action,
    target: row.target,
    amount: row.amount || "",
  });
  if (error) throw error;
}

export async function writeAudit(rows: AuditRow[]) {
  await replaceKeyed(
    "audit_log",
    "id",
    rows.slice(0, 200).map((row) => ({
      id: row.id,
      at: row.at,
      actor: row.actor,
      action: row.action,
      target: row.target,
      amount: row.amount || "",
    }))
  );
}

export async function insertLedger(
  kind: "recharges" | "withdraws" | "transfers",
  row: RechargeRow | WithdrawRow | TransferRow
) {
  if (kind === "recharges") return insertRecharge(row as RechargeRow);
  if (kind === "withdraws") return insertWithdraw(row as WithdrawRow);
  return insertTransfer(row as TransferRow);
}
