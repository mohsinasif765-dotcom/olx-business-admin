import { DEFAULT_CAR_IMAGE, type VipPlan } from "@/lib/store";

const MEMBER_URL = process.env.NEXT_PUBLIC_MEMBER_URL || "http://localhost:3000";
const OPS_KEY = process.env.NEXT_PUBLIC_OLX_OPS_KEY || "olx-ops-local";

export type LiveCarPlan = {
  id: string;
  kind: "new" | "used";
  name: string;
  invest: string;
  returns: string;
  term: string;
  image: string;
};

export function toLivePlans(vips: VipPlan[]): LiveCarPlan[] {
  return vips
    .filter((plan) => plan.enabled)
    .map((plan) => ({
      id: plan.id,
      kind: plan.kind,
      name: plan.name,
      invest: plan.range,
      returns: plan.income,
      term: `${plan.days} days`,
      image: plan.image || DEFAULT_CAR_IMAGE[plan.kind],
    }));
}

export function isPackageImage(value: string) {
  const v = value.trim();
  return (
    /^https?:\/\//i.test(v) ||
    v.startsWith("data:image/") ||
    v.startsWith("/uploads/") ||
    v.startsWith("/cars/") ||
    v.startsWith("/api/package-photo") ||
    v.startsWith("/api/shop-photo") ||
    v.startsWith("/logo.png") ||
    v.includes("/storage/v1/object/public/package-photos/") ||
    v.includes("/storage/v1/object/public/brand/")
  );
}

export function mediaSrc(path: string) {
  const v = path.trim();
  if (!v) return v;
  if (/^https?:\/\//i.test(v) || v.startsWith("data:image/")) return v;
  // Admin photo proxies live on this app — do not send them to the member URL.
  if (
    v.startsWith("/api/package-photo") ||
    v.startsWith("/api/shop-photo") ||
    v.startsWith("/api/slip-photo") ||
    v.startsWith("/api/brand-") ||
    v.startsWith("/logo.")
  ) {
    return v;
  }
  const base = (process.env.NEXT_PUBLIC_MEMBER_URL || "http://localhost:3000").replace(/\/$/, "");
  return `${base}${v.startsWith("/") ? v : `/${v}`}`;
}

export async function uploadCarPhoto(file: File): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const body = new FormData();
  body.set("file", file);
  try {
    const res = await fetch(`${MEMBER_URL}/api/car-images`, {
      method: "POST",
      headers: { "x-olx-ops": OPS_KEY },
      body,
    });
    const data = (await res.json()) as { url?: string; error?: string };
    if (!res.ok || !data.url) {
      return { ok: false, error: data.error || "Could not upload the photo. Keep the member app running." };
    }
    return { ok: true, url: data.url };
  } catch {
    return { ok: false, error: "Could not upload. Start the member app on port 3000." };
  }
}

export async function publishCarCatalog(vips: VipPlan[]): Promise<{ ok: boolean; message: string }> {
  try {
    const res = await fetch(`${MEMBER_URL}/api/car-plans`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "x-olx-ops": OPS_KEY,
      },
      body: JSON.stringify({ plans: toLivePlans(vips) }),
    });
    if (!res.ok) {
      return {
        ok: false,
        message: "Saved in admin. Open the member app on port 3000 to show it on Cars.",
      };
    }
    return { ok: true, message: "Live on the member Cars page." };
  } catch {
    return {
      ok: false,
      message: "Saved in admin. Start the member app (localhost:3000) to publish.",
    };
  }
}
