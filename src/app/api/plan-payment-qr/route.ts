import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import { isBlobReference, readPrivateImage } from "@/lib/file-store";
import { getPlanPaymentQr } from "@/lib/plan-payments";

/**
 * The payment QR code is public on purpose: every crafter scans it from the
 * plans page. It is served through this route instead of the public folder so
 * the image keeps working after a rebuild or a dev-server restart.
 */
export async function GET() {
  let qr: Awaited<ReturnType<typeof getPlanPaymentQr>>;
  try {
    qr = await getPlanPaymentQr();
  } catch {
    return new NextResponse("The payment QR code could not be opened. Try again in a moment.", { status: 503 });
  }
  if (!qr) return new NextResponse("No payment QR code has been uploaded.", { status: 404 });

  try {
    const file = isBlobReference(qr.filePath) ? await readPrivateImage(qr.filePath) : await readFile(qr.filePath);
    if (!file) return new NextResponse("No payment QR code has been uploaded.", { status: 404 });
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
