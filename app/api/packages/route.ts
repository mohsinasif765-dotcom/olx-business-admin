import { NextResponse } from "next/server";
import { listCatalogPhotoUrls, packageImageRef, savePackagePhoto } from "@/lib/package-photos";
import { zuvoAdmin } from "@/lib/zuvo";
import type { VipPlan } from "@/lib/store";

function daysFromTerm(term: string) {
  const n = Number(String(term).split(" ")[0]);
  return Number.isFinite(n) && n > 0 ? n : 30;
}

function toVip(row: Record<string, unknown>, photoUrls: Record<string, string>): VipPlan {
  const id = String(row.id);
  return {
    id,
    name: String(row.name || ""),
    range: String(row.invest || ""),
    income: String(row.returns || ""),
    days: daysFromTerm(String(row.term || "30")),
    kind: row.kind === "used" ? "used" : "new",
    image: packageImageRef("car", id, photoUrls[id]),
    enabled: row.enabled !== false,
  };
}

function toRow(plan: VipPlan, imageRef: string) {
  return {
    id: plan.id,
    name: plan.name,
    kind: plan.kind === "used" ? "used" : "new",
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
      .from("car_packages")
      .select("id,name,kind,invest,returns,term,enabled,updated_at")
      .order("updated_at", { ascending: false });
    data = first.data;
    error = first.error;
    if (error) {
      const retry = await zuvoAdmin()
        .from("car_packages")
        .select("id,name,kind,invest,returns,term,enabled")
        .order("id");
      data = retry.data;
      error = retry.error;
    }
    if (error) throw error;
    const photoUrls = await listCatalogPhotoUrls("car");
    return NextResponse.json({
      packages: (data || []).map((row) => toVip(row as Record<string, unknown>, photoUrls)),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Zuvo read failed";
    return NextResponse.json({ error: message, packages: [] }, { status: 500 });
  }
}

export async function POST(request: Request) {
  let plan: VipPlan;
  try {
    plan = (await request.json()) as VipPlan;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!plan?.id || !plan.name || !plan.range || !plan.income || !plan.image) {
    return NextResponse.json({ error: "Name, invest, return, and photo are required" }, { status: 400 });
  }

  const saved = await savePackagePhoto("car", plan.id, plan.image);
  if (!saved.ok) return NextResponse.json({ error: saved.error }, { status: 400 });

  const imageRef =
    saved.fallbackRow && saved.image.startsWith("data:image/")
      ? saved.image
      : packageImageRef("car", plan.id, saved.image.startsWith("http") ? saved.image : undefined);
  try {
    const { error } = await zuvoAdmin().from("car_packages").upsert(toRow(plan, imageRef));
    if (error) throw error;
    return NextResponse.json({ ok: true, package: { ...plan, image: imageRef } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Zuvo write failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const id = new URL(request.url).searchParams.get("id") || "";
  if (!id) return NextResponse.json({ error: "required" }, { status: 400 });
  try {
    await zuvoAdmin().from("package_photos").delete().eq("id", id).eq("catalog", "car");
    const { error } = await zuvoAdmin().from("car_packages").delete().eq("id", id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Zuvo write failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
