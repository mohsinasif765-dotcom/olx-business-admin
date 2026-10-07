import { NextResponse } from "next/server";
import { readDepositSlipImage, slipHref } from "@/lib/deposit-slips";

function bytesFromDataUrl(image: string) {
  const match = image.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!match) return null;
  return { type: match[1], buf: Buffer.from(match[2], "base64") };
}

function slipIdFromUrl(value: string) {
  const match = value.match(/\/api\/slip-photo\/([^/?#]+)/);
  return match ? decodeURIComponent(match[1]) : "";
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const id = url.searchParams.get("id") || slipIdFromUrl(url.searchParams.get("url") || "");
  if (!id) return new NextResponse("Not found", { status: 404 });
  try {
    const image = await readDepositSlipImage(id);
    if (!image) return new NextResponse("Not found", { status: 404 });
    const href = slipHref(image) || image;
    if (/^https?:\/\//i.test(href)) {
      return NextResponse.redirect(href, {
        headers: { "Cache-Control": "private, max-age=300" },
      });
    }
    const parsed = bytesFromDataUrl(href);
    if (parsed) {
      return new NextResponse(new Uint8Array(parsed.buf), {
        headers: { "Content-Type": parsed.type, "Cache-Control": "private, max-age=300" },
      });
    }
    return new NextResponse("Not found", { status: 404 });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
