import { NextResponse } from "next/server";
import { fetchLiveUsdtPkrRate } from "@/lib/live-fx";
import { readSettings, writeSettings, type SettingsRow, type WalletMode } from "@/lib/db-tables";
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

export async function GET(request: Request) {
  const force = new URL(request.url).searchParams.get("force") === "1";
  const persist = new URL(request.url).searchParams.get("persist") === "1";
  try {
    const live = await fetchLiveUsdtPkrRate(force);
    if (!live) {
      const settings = asSettings(await readSettings());
      return NextResponse.json({
        ok: false,
        error: "Live market rate unavailable",
        rate: settings.usdtToPkrRate,
        source: "saved fallback",
        auto: settings.usdtRateAuto,
      });
    }
    if (persist) {
      try {
        const current = asSettings(await readSettings());
        await writeSettings({
          ...current,
          usdtToPkrRate: live.rate,
          usdtRateAuto: true,
        });
      } catch {
        /* persist optional */
      }
    }
    return NextResponse.json({
      ok: true,
      rate: live.rate,
      source: live.source,
      at: live.at,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "FX fetch failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
