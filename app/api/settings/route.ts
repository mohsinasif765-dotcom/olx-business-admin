import { NextResponse } from "next/server";
import { readSettings, writeSettings, type SettingsRow, type WalletMode } from "@/lib/db-tables";
import { fetchLiveUsdtPkrRate } from "@/lib/live-fx";
import { DEFAULT_SETTINGS, type Settings } from "@/lib/store";

function asWalletMode(value: unknown): WalletMode {
  const mode = String(value || "pkr").toLowerCase();
  if (mode === "usdt") return "usdt";
  if (mode === "dual") return "dual";
  return "pkr";
}

function asSettings(row: SettingsRow | null): Settings {
  return {
    ...DEFAULT_SETTINGS,
    ...(row || {}),
    walletMode: asWalletMode(row?.walletMode ?? DEFAULT_SETTINGS.walletMode),
    usdtToPkrRate: Number(row?.usdtToPkrRate ?? DEFAULT_SETTINGS.usdtToPkrRate) || 280,
    usdtRateAuto: row?.usdtRateAuto !== false,
  };
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
      walletMode: asWalletMode(body.walletMode ?? current.walletMode),
      usdtToPkrRate: Number(body.usdtToPkrRate ?? current.usdtToPkrRate) || 280,
      usdtRateAuto: body.usdtRateAuto === false ? false : true,
      aboutTagline: String(body.aboutTagline ?? current.aboutTagline),
      aboutBody: String(body.aboutBody ?? current.aboutBody),
      aboutStep1: String(body.aboutStep1 ?? current.aboutStep1),
      aboutStep2: String(body.aboutStep2 ?? current.aboutStep2),
      aboutStep3: String(body.aboutStep3 ?? current.aboutStep3),
      aboutVersion: String(body.aboutVersion ?? current.aboutVersion).trim() || "Version 1.0",
      companyName: String(body.companyName ?? current.companyName).trim() || "OLX Business Digital Ltd",
      companyAddress: String(body.companyAddress ?? current.companyAddress).trim(),
      companyNo: String(body.companyNo ?? current.companyNo).trim(),
      companyRegDate: String(body.companyRegDate ?? current.companyRegDate).trim(),
      companyIssued: String(body.companyIssued ?? current.companyIssued).trim(),
    };
    if (next.usdtRateAuto !== false) {
      const live = await fetchLiveUsdtPkrRate(true);
      if (live?.rate) next.usdtToPkrRate = live.rate;
    }
    await writeSettings(next);
    return NextResponse.json({ ok: true, settings: next });
  } catch (error) {
    let message =
      error && typeof error === "object" && "message" in error
        ? String((error as { message: string }).message)
        : error instanceof Error
          ? error.message
          : "Zuvo write failed";
    if (/could not find the .+ column/i.test(message)) {
      message = `${message} — run scripts/site-settings-migrate.sql in Zuvo, then retry Save.`;
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
