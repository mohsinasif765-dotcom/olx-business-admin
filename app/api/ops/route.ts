import { NextResponse } from "next/server";
import { zuvoAdmin } from "@/lib/zuvo";
import type { Store } from "@/lib/store";

export async function GET() {
  try {
    const { data, error } = await zuvoAdmin().from("ops_snapshot").select("payload").eq("id", 1).maybeSingle();
    if (error) throw error;
    return NextResponse.json({ store: (data?.payload as Store | undefined) || null });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Zuvo read failed";
    return NextResponse.json({ error: message, store: null }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  let store: Store;
  try {
    store = (await request.json()) as Store;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  try {
    const db = zuvoAdmin();
    const { error } = await db.from("ops_snapshot").upsert({
      id: 1,
      payload: store,
      updated_at: new Date().toISOString(),
    });
    if (error) throw error;
    if (Array.isArray(store.vips)) {
      const { error: pkgError } = await db.from("car_packages").upsert(
        store.vips.map((plan) => ({
          id: plan.id,
          name: plan.name,
          kind: plan.kind,
          invest: plan.range,
          returns: plan.income,
          term: `${plan.days} days`,
          image: plan.image,
          enabled: plan.enabled !== false,
          updated_at: new Date().toISOString(),
        }))
      );
      if (pkgError) throw pkgError;
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Zuvo write failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
