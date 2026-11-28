import { pingDatabaseConnection } from "@/lib/prisma";

const PING_INTERVAL_MS = 10_000;

const KEEPALIVE_VERSION = 2;

const globalForKeepAlive = globalThis as unknown as {
  databaseKeepAlive?: ReturnType<typeof setInterval>;
  databaseKeepAliveReady?: boolean;
  databaseKeepAliveVersion?: number;
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
    process.stderr.write("[database] Keepalive ping failed.\n");
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
  if (globalForKeepAlive.databaseKeepAlive && globalForKeepAlive.databaseKeepAliveVersion === KEEPALIVE_VERSION) return;
  if (globalForKeepAlive.databaseKeepAlive) clearInterval(globalForKeepAlive.databaseKeepAlive);
  const timer = setInterval(() => {
    void pingDatabase().catch(() => {
      globalForKeepAlive.databaseKeepAliveReady = false;
    });
  }, PING_INTERVAL_MS);
  timer.unref?.();
  globalForKeepAlive.databaseKeepAlive = timer;
  globalForKeepAlive.databaseKeepAliveVersion = KEEPALIVE_VERSION;
  void pingDatabase().catch(() => undefined);
}
