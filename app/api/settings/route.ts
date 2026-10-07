import { NextResponse } from "next/server";
import { readSettings, writeSettings, type SettingsRow } from "@/lib/db-tables";
import { DEFAULT_SETTINGS, type Settings } from "@/lib/store";

function asSettings(row: SettingsRow | null): Settings {
  return { ...DEFAULT_SETTINGS, ...(row || {}) };
}

export async function GET() {
  try {
    const settings = asSettings(await readSettings());
    return NextResponse.json({ settings });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Zuvo read failed";
    return NextResponse.json({ error: message, settings: DEFAULT_SETTINGS }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  let body: Partial<Settings>;
  try {
    body = (await request.json()) as Partial<Settings>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  try {
    const current = asSettings(await readSettings());
    const next: Settings = {
      ...current,
      ...body,
      siteName: String(body.siteName ?? current.siteName).trim() || "OLX Business",
      telegram: String(body.telegram ?? current.telegram).trim(),
      defaultLang: String(body.defaultLang ?? current.defaultLang),
      maintenance: String(body.maintenance ?? current.maintenance),
      minWithdraw: Number(body.minWithdraw ?? current.minWithdraw),
      payoutFee: Number(body.payoutFee ?? current.payoutFee),
      dailyCap: Number(body.dailyCap ?? current.dailyCap),
      commissionL1: Number(body.commissionL1 ?? current.commissionL1),
      commissionL2: Number(body.commissionL2 ?? current.commissionL2),
      commissionL3: Number(body.commissionL3 ?? current.commissionL3),
    };
    await writeSettings(next);
    return NextResponse.json({ ok: true, settings: next });
  } catch (error) {
    const message =
      error && typeof error === "object" && "message" in error
        ? String((error as { message: string }).message)
        : error instanceof Error
          ? error.message
          : "Zuvo write failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
