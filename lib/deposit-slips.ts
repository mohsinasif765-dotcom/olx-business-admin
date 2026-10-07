import { zuvoAdmin } from "@/lib/zuvo";
export { slipHref } from "@/lib/slip-href";

const BUCKET = "deposit-slips";

function publicUrl(path: string) {
  const base = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/$/, "");
  return `${base}/storage/v1/object/public/${BUCKET}/${path}`;
}

export async function readDepositSlipImage(id: string) {
  for (const ext of ["jpg", "png", "webp"]) {
    const path = `${id}.${ext}`;
    const url = publicUrl(path);
    try {
      const res = await fetch(url, { method: "HEAD" });
      if (res.ok) return url;
    } catch {
      /* next */
    }
  }

  const { data, error } = await zuvoAdmin().from("deposit_slips").select("image").eq("id", id).maybeSingle();
  if (!error && data?.image) return String(data.image);

  const recharge = await zuvoAdmin().from("recharges").select("slip_url").ilike("slip_url", `%${id}%`).maybeSingle();
  if (!recharge.error && recharge.data?.slip_url) return String(recharge.data.slip_url);

  return "";
}
