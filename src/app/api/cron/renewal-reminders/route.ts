import { NextResponse } from "next/server";
import { runRenewalReminders } from "@/lib/renewal-reminders";

export const runtime = "nodejs";

/** Vercel calls this once a day. The admin page can still send reminders by hand. */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new NextResponse("Not found.", { status: 404 });
  }

  const result = await runRenewalReminders();
  return NextResponse.json({
    configured: result.configured,
    checked: result.checked,
    sent: result.sent,
    failed: result.failed,
    waiting: result.waiting,
  });
}
