import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const ROOT = path.join(process.cwd(), "private-uploads");

/** Payment screenshots are private: only the crafter who sent one and admins can open it. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return new NextResponse("Sign in to view this payment proof.", { status: 401 });
  }

  const { id } = await params;
  const payment = await prisma.planPayment.findUnique({
    where: { id },
    select: { userId: true, proofPath: true },
  });
  if (!payment) return new NextResponse("Payment proof not found.", { status: 404 });
  if (session.user.role !== "admin" && payment.userId !== session.user.id) {
    return new NextResponse("Payment proof not found.", { status: 404 });
  }

  const filePath = path.resolve(ROOT, payment.proofPath);
  if (!filePath.startsWith(ROOT + path.sep)) {
    return new NextResponse("Payment proof not found.", { status: 404 });
  }

  try {
    const file = await readFile(filePath);
    return new NextResponse(new Uint8Array(file), {
      headers: {
        "Content-Type": "image/avif",
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return new NextResponse("Payment proof not found.", { status: 404 });
  }
}
