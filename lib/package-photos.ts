import { zuvoAdmin } from "@/lib/zuvo";

export type PackageCatalog = "car" | "shop";

const BUCKET = "package-photos";
let bucketReady: Promise<void> | null = null;

function isProxyRef(value: string) {
  return (
    value.startsWith("/api/package-photo") ||
    value.startsWith("/api/shop-photo") ||
    value.startsWith("/api/car-photo")
  );
}

function isStoredImage(value: string) {
  const v = value.trim();
  if (!v) return false;
  if (v.startsWith("data:image/")) return true;
  if (/^https?:\/\//i.test(v)) return true;
  if (v.startsWith("/uploads/") || v.startsWith("/cars/")) return true;
  if (v.startsWith("/api/")) return false;
  return false;
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

function storagePath(catalog: PackageCatalog, id: string, ext = "jpg") {
  return `${catalog}/${id}.${ext}`;
}

export function publicStorageUrl(catalog: PackageCatalog, id: string, ext = "jpg") {
  const base = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/$/, "");
  return `${base}/storage/v1/object/public/${BUCKET}/${storagePath(catalog, id, ext)}`;
}

function publicUrlFor(path: string) {
  const base = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/$/, "");
  return `${base}/storage/v1/object/public/${BUCKET}/${path}`;
}

/** One Storage list → id → public URL (correct extension). */
export async function listCatalogPhotoUrls(catalog: PackageCatalog) {
  const map: Record<string, string> = {};
  try {
    const { data } = await zuvoAdmin().storage.from(BUCKET).list(catalog, { limit: 200 });
    for (const file of data || []) {
      const name = String(file.name || "");
      const id = name.replace(/\.(jpe?g|png|webp)$/i, "");
      if (!id || id === name) continue;
      map[id] = publicUrlFor(`${catalog}/${name}`);
    }
  } catch {
    /* bucket missing */
  }
  return map;
}

async function ensureBucket() {
  if (!bucketReady) {
    bucketReady = (async () => {
      const { data } = await zuvoAdmin().storage.listBuckets();
      if ((data || []).some((b) => b.name === BUCKET || b.id === BUCKET)) return;
      await zuvoAdmin().storage.createBucket(BUCKET, {
        public: true,
        fileSizeLimit: 5 * 1024 * 1024,
        allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
      });
    })().catch((err) => {
      bucketReady = null;
      throw err;
    });
  }
  await bucketReady;
}

async function putBytes(catalog: PackageCatalog, id: string, bytes: Buffer, contentType: string) {
  const ext = contentType.includes("png") ? "png" : contentType.includes("webp") ? "webp" : "jpg";
  const path = storagePath(catalog, id, ext);
  const { error } = await zuvoAdmin().storage.from(BUCKET).upload(path, bytes, {
    contentType,
    upsert: true,
  });
  if (error) throw new Error(error.message);
  return publicUrlFor(path);
}

async function uploadToStorage(catalog: PackageCatalog, id: string, image: string) {
  await ensureBucket();
  const parsed = parseDataUrl(image);
  if (parsed) return putBytes(catalog, id, parsed.bytes, parsed.contentType);

  let fetchUrl = "";
  if (/^https?:\/\//i.test(image)) fetchUrl = image;
  else if (image.startsWith("/uploads/") || image.startsWith("/cars/")) {
    const member = (process.env.NEXT_PUBLIC_MEMBER_URL || "http://localhost:3000").replace(/\/$/, "");
    fetchUrl = `${member}${image}`;
  }
  if (fetchUrl) {
    const res = await fetch(fetchUrl);
    if (!res.ok) throw new Error(`Could not fetch photo (${res.status})`);
    const contentType = res.headers.get("content-type") || "image/jpeg";
    const bytes = Buffer.from(await res.arrayBuffer());
    if (!bytes.length) throw new Error("Empty photo");
    return putBytes(catalog, id, bytes, contentType);
  }
  throw new Error("Unsupported photo format");
}

/** Fast path: prefer public Storage URL (no download / base64). */
export async function resolvePackagePhotoUrl(catalog: PackageCatalog, id: string) {
  const photo = await zuvoAdmin().from("package_photos").select("image").eq("id", id).eq("catalog", catalog).maybeSingle();
  if (!photo.error && photo.data?.image) {
    const img = String(photo.data.image);
    if (/^https?:\/\//i.test(img)) return img;
    if (img.startsWith("data:image/")) return img;
    if (img.startsWith("/uploads/") || img.startsWith("/cars/")) {
      const member = (process.env.NEXT_PUBLIC_MEMBER_URL || "http://localhost:3000").replace(/\/$/, "");
      return `${member}${img}`;
    }
  }

  const probes = await Promise.all(
    ["jpg", "png", "webp"].map(async (ext) => {
      const url = publicStorageUrl(catalog, id, ext);
      try {
        const res = await fetch(url, { method: "HEAD" });
        return res.ok ? url : "";
      } catch {
        return "";
      }
    })
  );
  const hit = probes.find(Boolean);
  if (hit) return hit;

  const table = catalog === "shop" ? "shop_packages" : "car_packages";
  const pack = await zuvoAdmin().from(table).select("image").eq("id", id).maybeSingle();
  if (pack.error) return "";
  const legacy = String(pack.data?.image || "");
  if (/^https?:\/\//i.test(legacy)) return legacy;
  if (legacy.startsWith("data:image/")) return legacy;
  if (legacy.startsWith("/uploads/") || legacy.startsWith("/cars/")) {
    const member = (process.env.NEXT_PUBLIC_MEMBER_URL || "http://localhost:3000").replace(/\/$/, "");
    return `${member}${legacy}`;
  }
  return "";
}

async function writePhotoRow(catalog: PackageCatalog, id: string, image: string) {
  const { error } = await zuvoAdmin().from("package_photos").upsert({
    id,
    catalog,
    image,
    updated_at: new Date().toISOString(),
  });
  return !error;
}

export async function savePackagePhoto(catalog: PackageCatalog, id: string, image: string) {
  const value = image.trim();
  if (!value) return { ok: false as const, error: "Photo missing" };

  // Editing other fields keeps an existing photo ref — do not re-upload
  if (isProxyRef(value) || value.includes("/storage/v1/object/public/package-photos/")) {
    return { ok: true as const, image: value, fallbackRow: false as const };
  }

  let storedUrl = value;
  try {
    storedUrl = await uploadToStorage(catalog, id, value);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Photo upload failed";
    if (value.startsWith("data:image/")) {
      const tableOk = await writePhotoRow(catalog, id, value);
      return { ok: true as const, image: value, fallbackRow: !tableOk };
    }
    return { ok: false as const, error: message };
  }

  const tableOk = await writePhotoRow(catalog, id, storedUrl);
  return { ok: true as const, image: storedUrl, fallbackRow: !tableOk };
}

export async function readPackagePhoto(catalog: PackageCatalog, id: string) {
  return resolvePackagePhotoUrl(catalog, id);
}

export function packageImageProxy(catalog: PackageCatalog, id: string) {
  return catalog === "shop"
    ? `/api/shop-photo?id=${encodeURIComponent(id)}`
    : `/api/package-photo?id=${encodeURIComponent(id)}`;
}

/** Prefer a known public URL; otherwise the lightweight proxy. */
export function packageImageRef(catalog: PackageCatalog, id: string, publicUrl?: string) {
  if (publicUrl && /^https?:\/\//i.test(publicUrl)) return publicUrl;
  return packageImageProxy(catalog, id);
}

/** Move legacy base64/paths off package rows into Storage (+ package_photos when available). */
export async function migratePackagePhotos() {
  await ensureBucket();
  const results = { car: 0, shop: 0, errors: [] as string[] };

  for (const catalog of ["car", "shop"] as const) {
    const table = catalog === "shop" ? "shop_packages" : "car_packages";
    const { data, error } = await zuvoAdmin().from(table).select("id,image");
    if (error) {
      if (catalog === "shop") continue;
      results.errors.push(error.message);
      continue;
    }
    for (const row of data || []) {
      const id = String(row.id);
      const img = String(row.image || "").trim();
      if (!img || isProxyRef(img)) {
        const existing = await resolvePackagePhotoUrl(catalog, id);
        if (!existing || existing.startsWith("data:image/")) {
          if (!existing) continue;
          const saved = await savePackagePhoto(catalog, id, existing);
          if (!saved.ok) {
            results.errors.push(`${id}: ${saved.error}`);
            continue;
          }
        }
        await zuvoAdmin().from(table).update({ image: packageImageRef(catalog, id) }).eq("id", id);
        results[catalog] += 1;
        continue;
      }
      if (/^https?:\/\//i.test(img) && img.includes("/storage/v1/object/public/package-photos/")) {
        await zuvoAdmin().from(table).update({ image: packageImageRef(catalog, id) }).eq("id", id);
        results[catalog] += 1;
        continue;
      }
      const saved = await savePackagePhoto(catalog, id, img);
      if (!saved.ok) {
        results.errors.push(`${id}: ${saved.error}`);
        continue;
      }
      await zuvoAdmin().from(table).update({ image: packageImageRef(catalog, id) }).eq("id", id);
      results[catalog] += 1;
    }
  }

  return results;
}
