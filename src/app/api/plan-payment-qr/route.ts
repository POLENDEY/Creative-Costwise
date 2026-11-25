import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import { getPlanPaymentQr } from "@/lib/plan-payments";

/**
 * The payment QR code is public on purpose: every crafter scans it from the
 * plans page. It is served through this route instead of the public folder so
 * the image keeps working after a rebuild or a dev-server restart.
 */
export async function GET() {
  const qr = await getPlanPaymentQr();
  if (!qr) return new NextResponse("No payment QR code has been uploaded.", { status: 404 });

  try {
    const file = await readFile(qr.filePath);
    return new NextResponse(new Uint8Array(file), {
      headers: {
        "Content-Type": "image/avif",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch {
    return new NextResponse("No payment QR code has been uploaded.", { status: 404 });
  }
}
