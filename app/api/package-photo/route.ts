import { NextResponse } from "next/server";
import { resolvePackagePhotoUrl } from "@/lib/package-photos";

function bytesFromDataUrl(image: string) {
  const match = image.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!match) return null;
  return { type: match[1], buf: Buffer.from(match[2], "base64") };
}

export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get("id") || "";
  if (!id) return new NextResponse("Not found", { status: 404 });
  try {
    const image = await resolvePackagePhotoUrl("car", id);
    if (!image) return new NextResponse("Not found", { status: 404 });

    if (/^https?:\/\//i.test(image)) {
      return NextResponse.redirect(image, {
        headers: { "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800" },
      });
    }

    const parsed = bytesFromDataUrl(image);
    if (parsed) {
      return new NextResponse(new Uint8Array(parsed.buf), {
        headers: {
          "Content-Type": parsed.type,
          "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
        },
      });
    }

    if (image.startsWith("/") && !image.startsWith("/api/")) {
      const member = (process.env.NEXT_PUBLIC_MEMBER_URL || "http://localhost:3000").replace(/\/$/, "");
      return NextResponse.redirect(`${member}${image}`);
    }
    return new NextResponse("Not found", { status: 404 });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
