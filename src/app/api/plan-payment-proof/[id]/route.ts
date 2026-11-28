import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { readPrivateImage } from "@/lib/file-store";
import { prisma } from "@/lib/prisma";

/** Payment screenshots are private: only the crafter who sent one and admins can open it. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return new NextResponse("Sign in to view this payment proof.", { status: 401 });
  }

  const { id } = await params;
  let payment: { userId: string; proofPath: string } | null;
  try {
    payment = await prisma.planPayment.findUnique({
      where: { id },
      select: { userId: true, proofPath: true },
    });
  } catch {
    return new NextResponse("The payment proof could not be opened. Try again in a moment.", { status: 503 });
  }
  if (!payment) return new NextResponse("Payment proof not found.", { status: 404 });
  if (session.user.role !== "admin" && payment.userId !== session.user.id) {
    return new NextResponse("Payment proof not found.", { status: 404 });
  }

  const file = await readPrivateImage(payment.proofPath);
  if (!file) return new NextResponse("Payment proof not found.", { status: 404 });
  return new NextResponse(new Uint8Array(file), {
    headers: {
      "Content-Type": "image/avif",
      "Cache-Control": "private, no-store",
    },
  });
}
