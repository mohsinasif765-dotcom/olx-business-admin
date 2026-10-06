import { NextResponse } from "next/server";
import { readLedgerTx } from "@/lib/db-tables";

export async function GET() {
  try {
    const rows = await readLedgerTx();
    return NextResponse.json({ rows });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Zuvo read failed";
    return NextResponse.json({ error: message, rows: [] }, { status: 500 });
  }
}
