import { pingDatabaseConnection } from "@/lib/prisma";

const PING_INTERVAL_MS = 10_000;

const globalForKeepAlive = globalThis as unknown as {
  databaseKeepAlive?: ReturnType<typeof setInterval>;
  databaseKeepAliveReady?: boolean;
};

let pingInFlight = false;
let nextPingAt = 0;

async function pingDatabase() {
  if (pingInFlight || Date.now() < nextPingAt) return;
  pingInFlight = true;
  try {
    await pingDatabaseConnection();
    nextPingAt = 0;
  } catch (error) {
    nextPingAt = Date.now() + 60_000;
    throw error;
  } finally {
    pingInFlight = false;
  }
  if (!globalForKeepAlive.databaseKeepAliveReady) {
    globalForKeepAlive.databaseKeepAliveReady = true;
    console.info("Database keepalive is running every 10 seconds.");
  }
}

export function startDatabaseKeepAlive() {
  if (globalForKeepAlive.databaseKeepAlive) return;
  const timer = setInterval(() => {
    void pingDatabase().catch(() => {
      globalForKeepAlive.databaseKeepAliveReady = false;
      console.error("Database keepalive ping failed.");
    });
  }, PING_INTERVAL_MS);
  timer.unref?.();
  globalForKeepAlive.databaseKeepAlive = timer;
  void pingDatabase().catch(() => {
    console.error("Database keepalive ping failed.");
  });
}
