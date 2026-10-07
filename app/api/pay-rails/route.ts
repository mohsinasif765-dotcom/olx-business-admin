import { NextResponse } from "next/server";
import { deleteCoin, readCoins, upsertCoin } from "@/lib/db-tables";
import { migrateCoins, type CoinRow } from "@/lib/store";

function normalize(row: Partial<CoinRow> & { id?: string }): CoinRow | null {
  const id = String(row.id || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-|-$/g, "");
  if (!id || !row.name?.trim()) return null;
  const crypto = row.payKind === "crypto" || id === "usdt";
  const accountNumber = String(row.accountNumber || row.address || "").trim();
  return {
    id,
    name: String(row.name).trim().toUpperCase(),
    network: String(row.network || (crypto ? "Tether" : "Bank")).trim() || "Bank",
    min: String(row.min || "10").trim() || "10",
    address: String(row.address || accountNumber).trim(),
    enabled: row.enabled !== false,
    payKind: crypto ? "crypto" : "bank",
    bankName: String(row.bankName || "").trim(),
    accountName: String(row.accountName || "").trim(),
    accountNumber,
    iban: String(row.iban || "").trim(),
    swift: String(row.swift || "").trim(),
    branch: String(row.branch || "").trim(),
    instructions: String(row.instructions || "").trim(),
  };
}

export async function GET() {
  try {
    const coins = migrateCoins(await readCoins());
    return NextResponse.json({ coins }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Zuvo read failed";
    return NextResponse.json({ error: message, coins: [] }, { status: 500 });
  }
}

export async function POST(request: Request) {
  let body: Partial<CoinRow>;
  try {
    body = (await request.json()) as Partial<CoinRow>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const coin = normalize(body);
  if (!coin) return NextResponse.json({ error: "id and name are required" }, { status: 400 });
  try {
    await upsertCoin(coin);
    return NextResponse.json({ ok: true, coin });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Zuvo write failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const id = new URL(request.url).searchParams.get("id") || "";
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  try {
    const existing = await readCoins();
    if (existing.length < 2) {
      return NextResponse.json({ error: "Keep at least one currency" }, { status: 400 });
    }
    await deleteCoin(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Zuvo write failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
