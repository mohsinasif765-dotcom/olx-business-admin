import { NextResponse } from "next/server";
import { zuvoAdmin } from "@/lib/zuvo";

function bytesFromDataUrl(image: string) {
  const match = image.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!match) return null;
  return { type: match[1], buf: Buffer.from(match[2], "base64") };
}

export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get("id") || "";
  if (!id) return new NextResponse("Not found", { status: 404 });
  try {
    const { data, error } = await zuvoAdmin().from("car_packages").select("image").eq("id", id).maybeSingle();
    if (error) throw error;
    const image = String(data?.image || "");
    const parsed = bytesFromDataUrl(image);
    if (parsed) {
      return new NextResponse(new Uint8Array(parsed.buf), {
        headers: { "Content-Type": parsed.type, "Cache-Control": "public, max-age=30" },
      });
    }
    if (/^https?:\/\//i.test(image) || image.startsWith("/")) {
      return NextResponse.redirect(image);
    }
    return new NextResponse("Not found", { status: 404 });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
