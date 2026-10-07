import { NextResponse } from "next/server";
import { insertRecharge, readRecharges } from "@/lib/db-tables";
import { slipHref } from "@/lib/deposit-slips";
import { nid } from "@/lib/store";

export async function GET() {
  try {
    const rows = await readRecharges();
    return NextResponse.json(
      {
        recharges: rows.map((row) => ({
          ...row,
          slipUrl: slipHref(row.slipUrl || "") || row.slipUrl || "",
        })),
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Zuvo read failed";
    return NextResponse.json({ error: message, recharges: [] }, { status: 500 });
  }
}

export async function POST(request: Request) {
  let body: { account?: string; amount?: number; network?: string; note?: string };
  try {
    body = (await request.json()) as { account?: string; amount?: number; network?: string; note?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const account = String(body.account || "").trim().toLowerCase();
  const amount = Number(body.amount);
  if (!account || !Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: "Account and amount are required" }, { status: 400 });
  }
  try {
    const row = {
      id: nid("r"),
      account,
      amount,
      network: String(body.network || "PKR").trim() || "PKR",
      txHash: "",
      status: "pending",
      at: new Date().toISOString(),
      note: String(body.note || "").trim(),
      slipUrl: "",
    };
    await insertRecharge(row);
    return NextResponse.json({ ok: true, recharge: row });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Zuvo write failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
