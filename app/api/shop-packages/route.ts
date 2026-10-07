import { NextResponse } from "next/server";
import { listCatalogPhotoUrls, packageImageRef, savePackagePhoto } from "@/lib/package-photos";
import { zuvoAdmin } from "@/lib/zuvo";
import type { ShopPlan } from "@/lib/store";

function daysFromTerm(term: string) {
  const n = Number(String(term).split(" ")[0]);
  return Number.isFinite(n) && n > 0 ? n : 30;
}

function toShop(row: Record<string, unknown>, photoUrls: Record<string, string>): ShopPlan {
  const id = String(row.id);
  return {
    id,
    name: String(row.name || ""),
    range: String(row.invest || ""),
    income: String(row.returns || ""),
    days: daysFromTerm(String(row.term || "30")),
    kind: row.kind === "electronics" ? "electronics" : "jewelry",
    image: packageImageRef("shop", id, photoUrls[id]),
    enabled: row.enabled !== false,
  };
}

function toRow(plan: ShopPlan, imageRef: string) {
  return {
    id: plan.id,
    name: plan.name,
    kind: plan.kind === "electronics" ? "electronics" : "jewelry",
    invest: plan.range,
    returns: plan.income,
    term: `${Number(plan.days) || 30} days`,
    image: imageRef,
    enabled: plan.enabled !== false,
    updated_at: new Date().toISOString(),
  };
}

export async function GET() {
  try {
    let data: unknown[] | null = null;
    let error: { message?: string } | null = null;
    const first = await zuvoAdmin()
      .from("shop_packages")
      .select("id,name,kind,invest,returns,term,enabled,updated_at")
      .order("updated_at", { ascending: false });
    data = first.data;
    error = first.error;
    if (error) {
      const retry = await zuvoAdmin()
        .from("shop_packages")
        .select("id,name,kind,invest,returns,term,enabled")
        .order("id");
      data = retry.data;
      error = retry.error;
    }
    if (error) throw error;
    const photoUrls = await listCatalogPhotoUrls("shop");
    return NextResponse.json({
      packages: (data || []).map((row) => toShop(row as Record<string, unknown>, photoUrls)),
    });
  } catch (error) {
    const message =
      error && typeof error === "object" && "message" in error
        ? String((error as { message: string }).message)
        : error instanceof Error
          ? error.message
          : "Zuvo read failed";
    return NextResponse.json({ error: message, packages: [] }, { status: 500 });
  }
}

export async function POST(request: Request) {
  let plan: ShopPlan;
  try {
    plan = (await request.json()) as ShopPlan;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!plan?.id || !plan.name || !plan.range || !plan.income || !plan.image) {
    return NextResponse.json({ error: "Name, invest, return, and photo are required" }, { status: 400 });
  }

  const saved = await savePackagePhoto("shop", plan.id, plan.image);
  if (!saved.ok) return NextResponse.json({ error: saved.error }, { status: 400 });

  const imageRef =
    saved.fallbackRow && saved.image.startsWith("data:image/")
      ? saved.image
      : packageImageRef("shop", plan.id, saved.image.startsWith("http") ? saved.image : undefined);
  try {
    const { error } = await zuvoAdmin().from("shop_packages").upsert(toRow(plan, imageRef));
    if (error) throw error;
    return NextResponse.json({
      ok: true,
      package: { ...plan, image: imageRef },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Zuvo write failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const id = new URL(request.url).searchParams.get("id") || "";
  if (!id) return NextResponse.json({ error: "required" }, { status: 400 });
  try {
    await zuvoAdmin().from("package_photos").delete().eq("id", id).eq("catalog", "shop");
    const { error } = await zuvoAdmin().from("shop_packages").delete().eq("id", id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Zuvo write failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
