import { NextResponse } from "next/server";
import { readBrandAssets, saveBrandAsset, type BrandKind } from "@/lib/brand-assets";

export async function GET() {
  try {
    const assets = await readBrandAssets();
    return NextResponse.json(assets, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load brand assets";
    return NextResponse.json({ error: message, logo: "/logo.png", splash: "/logo.png" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  let body: { kind?: string; image?: string };
  try {
    body = (await request.json()) as { kind?: string; image?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const kind = body.kind === "splash" ? "splash" : body.kind === "logo" ? "logo" : null;
  if (!kind || !body.image) {
    return NextResponse.json({ error: "kind (logo|splash) and image are required" }, { status: 400 });
  }
  try {
    const saved = await saveBrandAsset(kind as BrandKind, body.image);
    if (!saved.ok) return NextResponse.json({ error: saved.error }, { status: 400 });
    const assets = await readBrandAssets();
    return NextResponse.json({ ok: true, url: saved.url, ...assets });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
