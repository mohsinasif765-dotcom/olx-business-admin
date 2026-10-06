const DEMO_ACCOUNTS = new Set(["us6414@gmail.com", "ahmed.k@olx.mail", "+923001112233"]);
const DEMO_IDS = new Set(["u1", "u2", "u3", "r1", "r2", "w1", "w2", "t1", "a1"]);

export function isDemoAccount(account: string) {
  const a = account.trim().toLowerCase();
  return DEMO_ACCOUNTS.has(a) || a.endsWith("@olx.mail");
}

export function stripDemoRows<T extends { account?: string; id?: string }>(rows: T[] | undefined): T[] {
  return (rows || []).filter((row) => {
    if (row.id && DEMO_IDS.has(String(row.id))) return false;
    if (row.account && isDemoAccount(String(row.account))) return false;
    return true;
  });
}
