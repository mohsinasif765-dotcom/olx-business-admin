import { NextResponse } from "next/server";
import { migratePackagePhotos } from "@/lib/package-photos";

export async function POST() {
  try {
    const results = await migratePackagePhotos();
    return NextResponse.json({ ok: true, ...results });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Migration failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
