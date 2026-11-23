export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startDatabaseKeepAlive } = await import("@/lib/db-keepalive");
    startDatabaseKeepAlive();
    const { startRenewalReminderSchedule } = await import("@/lib/renewal-reminders");
    startRenewalReminderSchedule();
  }
}
