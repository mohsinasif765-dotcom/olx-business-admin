import { NextResponse } from "next/server";
import { fiatAmountToUsdt, formatDepositCreditNote } from "@/lib/deposit-fx";
import { payTeamEarnings } from "@/lib/earnings";
import {
  insertLedgerTx,
  patchRecharge,
  patchWithdraw,
  readCoins,
  readRecharges,
  readSettings,
  readWithdraws,
} from "@/lib/db-tables";
import { zuvoAdmin } from "@/lib/zuvo";

function money(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? Number(n.toFixed(2)) : 0;
}

async function creditInvest(account: string, delta: number) {
  const db = zuvoAdmin();
  const { data, error } = await db.from("members").select("invest").eq("account", account).maybeSingle();
  if (error) throw error;
  if (!data) return;
  const next = money(data.invest) + money(delta);
  const { error: saveError } = await db.from("members").update({ invest: Math.max(0, next) }).eq("account", account);
  if (saveError) throw saveError;
}

export async function POST(request: Request) {
  let body: { action?: string; id?: string; note?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "required" }, { status: 400 });
  }
  const id = String(body.id || "").trim();
  const action = String(body.action || "");
  const note = String(body.note || "");
  if (!id || !action) return NextResponse.json({ error: "required" }, { status: 400 });

  try {
    if (action === "approve_recharge" || action === "reject_recharge") {
      const row = (await readRecharges()).find((item) => item.id === id);
      if (!row) return NextResponse.json({ error: "missing" }, { status: 404 });
      if (row.status !== "pending") return NextResponse.json({ error: "used" }, { status: 400 });
      const status = action === "approve_recharge" ? "paid" : "rejected";

      if (status === "rejected") {
        await patchRecharge(id, { status, note });
        return NextResponse.json({ ok: true, status });
      }

      const [settings, coins] = await Promise.all([readSettings(), readCoins()]);
      let credit;
      try {
        credit = fiatAmountToUsdt(
          row.amount,
          row.network,
          Number(settings?.usdtToPkrRate) || 280,
          coins,
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : "FX convert failed";
        return NextResponse.json({ error: message }, { status: 400 });
      }

      const creditNote = [formatDepositCreditNote(credit), note].filter(Boolean).join(" · ");
      await patchRecharge(id, { status, note: creditNote });
      await creditInvest(row.account, credit.usdt);
      await insertLedgerTx({
        id: `c${id}`,
        account: row.account,
        kind: "deposit",
        amount: credit.usdt,
        wallet: "invest",
        status: "paid",
        note: creditNote,
        at: new Date().toISOString(),
      });
      await payTeamEarnings(row.account, credit.usdt, "deposit");
      return NextResponse.json({
        ok: true,
        status,
        creditedUsdt: credit.usdt,
        railAmount: credit.railAmount,
        code: credit.code,
        rate: credit.rate,
      });
    }

    if (action === "approve_withdraw" || action === "paid_withdraw" || action === "reject_withdraw") {
      const row = (await readWithdraws()).find((item) => item.id === id);
      if (!row) return NextResponse.json({ error: "missing" }, { status: 404 });
      const status = action === "approve_withdraw" ? "approved" : action === "paid_withdraw" ? "paid" : "rejected";
      const held = row.status === "pending" || row.status === "approved";
      if (status === "rejected" && held) {
        await creditInvest(row.account, row.amount);
      }
      await patchWithdraw(id, { status, note });
      await insertLedgerTx({
        id: `w${Date.now().toString(36)}`,
        account: row.account,
        kind: "withdraw",
        amount: row.amount,
        wallet: "invest",
        status,
        note: status === "rejected" ? "refunded" : note || status,
        at: new Date().toISOString(),
      });
      return NextResponse.json({ ok: true, status });
    }

    return NextResponse.json({ error: "unknown" }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Zuvo write failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
