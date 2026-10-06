import { insertLedgerTx, readSettings } from "@/lib/db-tables";
import { zuvoAdmin } from "@/lib/zuvo";

function money(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? Number(n.toFixed(2)) : 0;
}

export async function payTeamEarnings(fromAccount: string, amount: number, reason: string) {
  const deposit = money(amount);
  if (deposit <= 0) return;
  const settings = await readSettings();
  const rates = [
    money(settings?.commissionL1) || 0,
    money(settings?.commissionL2) || 0,
    money(settings?.commissionL3) || 0,
  ];
  const db = zuvoAdmin();
  const { data: members, error } = await db.from("members").select("account,invite,upline,brokerage,status");
  if (error) throw error;
  const rows = members || [];
  const me = rows.find((row) => String(row.account).toLowerCase() === fromAccount.toLowerCase());
  if (!me) return;

  let sponsorCode = String(me.upline || "");
  for (let level = 0; level < 3; level += 1) {
    if (!sponsorCode || sponsorCode === "—") break;
    const sponsor = rows.find((row) => String(row.invite) === sponsorCode);
    if (!sponsor || sponsor.status === "frozen" || sponsor.status === "banned") break;
    const cut = money((deposit * rates[level]) / 100);
    if (cut > 0) {
      const next = money(sponsor.brokerage) + cut;
      await db.from("members").update({ brokerage: next }).eq("account", sponsor.account);
      sponsor.brokerage = next;
      await insertLedgerTx({
        id: `e${Date.now().toString(36)}${level}`,
        account: String(sponsor.account),
        kind: `team_l${level + 1}`,
        amount: cut,
        wallet: "brokerage",
        status: "paid",
        note: `${reason} from ${fromAccount} · LEV ${level + 1} ${rates[level]}%`,
        at: new Date().toISOString(),
      });
    }
    sponsorCode = String(sponsor.upline || "");
  }
}
