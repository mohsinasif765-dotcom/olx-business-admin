import { zuvoAdmin } from "@/lib/zuvo";

export type BrandKind = "logo" | "splash";

const BUCKET = "brand";
let bucketReady: Promise<void> | null = null;

const DEFAULTS: Record<BrandKind, string> = {
  logo: "/logo.png",
  splash: "/logo.png",
};

function publicUrl(path: string) {
  const base = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/$/, "");
  return `${base}/storage/v1/object/public/${BUCKET}/${path}`;
}

async function ensureBucket() {
  if (!bucketReady) {
    bucketReady = (async () => {
      const { data } = await zuvoAdmin().storage.listBuckets();
      if ((data || []).some((b) => b.name === BUCKET || b.id === BUCKET)) return;
      await zuvoAdmin().storage.createBucket(BUCKET, {
        public: true,
        fileSizeLimit: 4 * 1024 * 1024,
        allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
      });
    })().catch((err) => {
      bucketReady = null;
      throw err;
    });
  }
  await bucketReady;
}

function parseDataUrl(image: string) {
  const match = image.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!match) return null;
  return {
    contentType: match[1],
    bytes: Buffer.from(match[2], "base64"),
    ext: match[1].includes("png") ? "png" : match[1].includes("webp") ? "webp" : "jpg",
  };
}

async function resolveKind(kind: BrandKind) {
  try {
    const { data } = await zuvoAdmin().storage.from(BUCKET).list("", { limit: 50 });
    const match = (data || []).find((f) => {
      const name = String(f.name || "");
      return name === kind || name.startsWith(`${kind}.`);
    });
    if (match?.name) {
      const updated = match.updated_at || match.created_at || "";
      const url = publicUrl(match.name);
      return updated ? `${url}?v=${encodeURIComponent(String(updated))}` : url;
    }
  } catch {
    /* bucket missing */
  }
  return DEFAULTS[kind];
}

export async function readBrandAssets() {
  const [logo, splash] = await Promise.all([resolveKind("logo"), resolveKind("splash")]);
  return { logo, splash };
}

export async function saveBrandAsset(kind: BrandKind, image: string) {
  const value = image.trim();
  if (!value) return { ok: false as const, error: "Image missing" };
  if (value === DEFAULTS.logo || value === DEFAULTS.splash) {
    return { ok: true as const, url: value };
  }
  if (/^https?:\/\//i.test(value) && value.includes(`/storage/v1/object/public/${BUCKET}/`)) {
    return { ok: true as const, url: value };
  }

  const parsed = parseDataUrl(value);
  if (!parsed) return { ok: false as const, error: "Upload a JPG, PNG or WEBP image" };

  await ensureBucket();

  // Clear old extensions so resolve finds one file
  for (const ext of ["png", "jpg", "jpeg", "webp"]) {
    await zuvoAdmin().storage.from(BUCKET).remove([`${kind}.${ext}`, kind]);
  }

  const path = `${kind}.${parsed.ext}`;
  const { error } = await zuvoAdmin().storage.from(BUCKET).upload(path, parsed.bytes, {
    contentType: parsed.contentType,
    upsert: true,
  });
  if (error) return { ok: false as const, error: error.message };

  return { ok: true as const, url: `${publicUrl(path)}?v=${Date.now()}` };
}
