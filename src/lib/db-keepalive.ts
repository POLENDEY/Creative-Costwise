import { prisma } from "@/lib/prisma";

const PING_INTERVAL_MS = 10_000;

const globalForKeepAlive = globalThis as unknown as {
  databaseKeepAlive?: ReturnType<typeof setInterval>;
  databaseKeepAliveReady?: boolean;
};

let pingInFlight = false;

async function pingDatabase() {
  if (pingInFlight) return;
  pingInFlight = true;
  try {
    await prisma.$runCommandRaw({ ping: 1 });
    await prisma.user.findFirst({ select: { id: true } });
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
    void pingDatabase().catch((error: unknown) => {
      globalForKeepAlive.databaseKeepAliveReady = false;
      console.error("Database keepalive ping failed.", error);
    });
  }, PING_INTERVAL_MS);
  timer.unref?.();
  globalForKeepAlive.databaseKeepAlive = timer;
  void pingDatabase().catch((error: unknown) => {
    console.error("Database keepalive ping failed.", error);
  });
}
