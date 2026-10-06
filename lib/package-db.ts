import { zuvoAdmin } from "@/lib/zuvo";
import { DEFAULT_CAR_IMAGE, type VipPlan } from "@/lib/store";

export function planToRow(plan: VipPlan) {
  const image = String(plan.image || DEFAULT_CAR_IMAGE[plan.kind] || "");
  return {
    id: plan.id,
    name: plan.name,
    kind: plan.kind === "used" ? "used" : "new",
    invest: plan.range,
    returns: plan.income,
    term: `${Number(plan.days) || 30} days`,
    image: image.startsWith("data:") || image.length > 400 ? DEFAULT_CAR_IMAGE[plan.kind] : image,
    enabled: plan.enabled !== false,
    updated_at: new Date().toISOString(),
  };
}

export function rowToPlan(row: Record<string, unknown>): VipPlan {
  return {
    id: String(row.id),
    name: String(row.name || "Package"),
    range: String(row.invest || ""),
    income: String(row.returns || ""),
    days: Number(String(row.term || "30").split(" ")[0]) || 30,
    kind: row.kind === "used" ? "used" : "new",
    image:
      typeof row.image === "string" && !row.image.startsWith("data:") && row.image.length < 400
        ? row.image
        : DEFAULT_CAR_IMAGE[row.kind === "used" ? "used" : "new"],
    enabled: row.enabled !== false,
  };
}

export async function listPackagePlans(): Promise<VipPlan[]> {
  const { data, error } = await zuvoAdmin()
    .from("car_packages")
    .select("id,name,kind,invest,returns,term,enabled")
    .order("id");
  if (error) throw error;
  return (data || []).map((row) => rowToPlan(row as Record<string, unknown>));
}

export async function savePackagePlans(plans: VipPlan[]) {
  const db = zuvoAdmin();
  if (!plans.length) return listPackagePlans();
  const { data: existing, error: readError } = await db.from("car_packages").select("id");
  if (readError) throw readError;
  const keep = new Set(plans.map((plan) => plan.id));
  const extra = ((existing || []) as { id: string }[]).map((row) => row.id).filter((id) => !keep.has(id));
  if (extra.length && plans.length >= 1) {
    const { error } = await db.from("car_packages").delete().in("id", extra);
    if (error) throw error;
  }
  const { error } = await db.from("car_packages").upsert(plans.map(planToRow));
  if (error) throw error;
  return plans;
}
