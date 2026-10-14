/** Convert rail deposit amounts to USDT using per-rail or Settings rates. */

export type DepositFxResult = {
  usdt: number;
  code: string;
  rate: number;
  railAmount: number;
};

export type RailRateRow = {
  id?: string;
  name?: string;
  network?: string;
  payKind?: string;
  usdtRate?: number;
};

function money(value: unknown, digits = 4) {
  const n = Number(value);
  return Number.isFinite(n) ? Number(n.toFixed(digits)) : 0;
}

/** Normalize recharge.network / rail labels → currency code. */
export function normalizeDepositCode(raw: unknown): string {
  const s = String(raw || "").trim().toUpperCase();
  if (!s) return "";
  if (/\bUSDT\b|TETHER|TRC20|BEP20|TRON/.test(s)) return "USDT";
  if (/\bPKR\b|PAKISTAN|\bRS\.?\b|RUPEE|EASYPAISA|JAZZCASH|BANK|IBAN|HBL|UBL|MEEZAN/.test(s)) {
    return "PKR";
  }
  if (/\bUSD\b|UNITED STATES|DOLLAR/.test(s) && !/\bUSDT\b/.test(s)) return "USD";
  if (/\bAED\b|DIRHAM|UAE/.test(s)) return "AED";
  if (/\bEUR\b|EURO/.test(s)) return "EUR";
  const token = (s.split(/[\s·|/,_-]+/).filter(Boolean).pop() || s).replace(/[^A-Z0-9]/g, "");
  if (/^[A-Z]{3,5}$/.test(token)) return token;
  return token.slice(0, 8);
}

function isCryptoCode(code: string) {
  return code === "USDT" || code === "USD" || code === "BTC" || code === "ETH" || code === "BNB";
}

/** Resolve 1 USDT = N units for a deposit currency. */
export function resolveRailUsdtRate(
  networkOrCode: unknown,
  rails: RailRateRow[] | undefined | null,
  fallbackPkrRate: number,
): { code: string; rate: number } {
  // Empty / unknown must NOT default to USDT@1 — that credits PKR as USDT 1:1 on live.
  let code = normalizeDepositCode(networkOrCode);
  if (!code) code = "PKR";

  const list = Array.isArray(rails) ? rails : [];
  const codeLower = code.toLowerCase();

  const hit = list.find((row) => {
    const id = String(row.id || "").toLowerCase();
    const name = String(row.name || "").toUpperCase();
    const net = String(row.network || "").toUpperCase();
    if (id === codeLower || id.startsWith(`${codeLower}-`)) return true;
    if (name === code || name.startsWith(`${code} `)) return true;
    if (net.includes(code)) return true;
    return false;
  });

  const fromRail = money(hit?.usdtRate, 6);
  if (fromRail > 0) return { code, rate: fromRail };

  if (isCryptoCode(code)) return { code, rate: 1 };
  if (code === "PKR") {
    const pkr = Number(fallbackPkrRate) > 0 ? Number(fallbackPkrRate) : 280;
    return { code, rate: pkr };
  }
  throw new Error(`No USDT rate for ${code}. Set "1 USDT =" on Receiving accounts.`);
}

/**
 * Rail fiat/crypto amount → USDT to credit invest wallet.
 */
export function fiatAmountToUsdt(
  amount: unknown,
  networkOrCode: unknown,
  usdtToPkrRate: number,
  rails?: RailRateRow[] | null,
): DepositFxResult {
  const railAmount = money(amount, 2);
  if (railAmount <= 0) {
    throw new Error("Invalid deposit amount");
  }
  const { code, rate } = resolveRailUsdtRate(networkOrCode, rails, usdtToPkrRate);
  if (!(rate > 0)) {
    throw new Error(`Invalid USDT rate for ${code}`);
  }
  // Guard: fiat rails must never credit 1:1 as USDT.
  if (!isCryptoCode(code) && rate <= 1.5) {
    throw new Error(`Bad rate for ${code} (${rate}). Set "1 USDT =" on Receiving accounts.`);
  }
  const usdt = money(railAmount / rate, 4);
  if (usdt <= 0) {
    throw new Error("Converted USDT amount is zero");
  }
  return { usdt, code, rate, railAmount };
}

export function formatDepositCreditNote(fx: DepositFxResult) {
  if (fx.code === "USDT" || fx.code === "USD") {
    return `approved: ${fx.railAmount} ${fx.code} → ${fx.usdt} USDT`;
  }
  return `approved: ${fx.railAmount} ${fx.code} → ${fx.usdt} USDT @ ${fx.rate}`;
}
