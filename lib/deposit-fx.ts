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
  if (/\bUSDT\b|TETHER/.test(s)) return "USDT";
  if (/\bPKR\b|PAKISTAN|\bRS\.?\b|EASYPAISA|JAZZCASH/.test(s)) return "PKR";
  if (/\bUSD\b|UNITED STATES/.test(s)) return "USD";
  const token = (s.split(/[\s·|/,_-]+/).filter(Boolean).pop() || s).replace(/[^A-Z0-9]/g, "");
  if (/^[A-Z]{3,5}$/.test(token)) return token;
  return token.slice(0, 8);
}

/** Resolve 1 USDT = N units for a deposit currency. */
export function resolveRailUsdtRate(
  networkOrCode: unknown,
  rails: RailRateRow[] | undefined | null,
  fallbackPkrRate: number,
): { code: string; rate: number } {
  const code = normalizeDepositCode(networkOrCode) || "USDT";
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

  if (code === "USDT" || code === "USD") return { code, rate: 1 };
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
