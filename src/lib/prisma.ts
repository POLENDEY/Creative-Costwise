import { AsyncLocalStorage } from "node:async_hooks";
import { setDefaultResultOrder } from "node:dns";
import { PrismaClient } from "@prisma/client";
import { assertProjectDatabase } from "@/lib/project-database";

setDefaultResultOrder("ipv4first");
assertProjectDatabase();

function clientDatabaseUrl(readPreference: "primary" | "primaryPreferred", serverSelectionTimeoutMS: number) {
  const url = process.env.DATABASE_URL ?? "";
  assertProjectDatabase(url);
  const stripped = url
    .replace(/([?&])(readPreference|serverSelectionTimeoutMS)=[^&]*&?/g, "$1")
    .replace(/[?&]$/, "");
  const join = stripped.includes("?") ? "&" : "?";
  return `${stripped}${join}readPreference=${readPreference}&serverSelectionTimeoutMS=${serverSelectionTimeoutMS}`;
}

const READ_OPERATIONS = new Set([
  "findUnique",
  "findUniqueOrThrow",
  "findFirst",
  "findFirstOrThrow",
  "findMany",
  "count",
  "aggregate",
  "groupBy",
]);
const CACHE_VERSION = 10;
const STALE_MS = 3 * 60 * 1000;
const CACHE_TTL_MS = 20_000;

const bypassReadCache = new AsyncLocalStorage<true>();
const memory = new Map<string, { value: unknown; expires: number; generation: number; storedAt: number }>();
const inflight = new Map<string, Promise<unknown>>();
let generation = 0;

function copy<T>(value: T): T {
  if (typeof structuredClone === "function") return structuredClone(value);
  return value;
}

function remember<T>(key: string, load: () => Promise<T>): Promise<T> {
  const now = Date.now();
  const hit = memory.get(key);
  if (hit && hit.generation === generation && hit.expires > now) return Promise.resolve(copy(hit.value) as T);
  const pending = inflight.get(key);
  if (pending) return pending.then((value) => copy(value) as T);
  const started = generation;
  const promise = load()
    .then((value) => {
      if (started === generation) {
        memory.set(key, { value: copy(value), expires: Date.now() + CACHE_TTL_MS, generation, storedAt: Date.now() });
      }
      return value;
    })
    .catch((error: unknown) => {
      const stale = memory.get(key);
      if (isTransientDbError(error) && stale && Date.now() - stale.storedAt < STALE_MS) return copy(stale.value);
      throw error;
    })
    .finally(() => {
      if (inflight.get(key) === promise) inflight.delete(key);
    });
  inflight.set(key, promise);
  return promise as Promise<T>;
}

function clearReadCache() {
  generation += 1;
  memory.clear();
}

export function isTransientDbError(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  return message.includes("DNS resolution")
    || message.includes("hostname resolution")
    || message.includes("unreachable network")
    || message.includes("I/O error: timed out")
    || message.includes("Server selection timeout")
    || message.includes("server monitor timeout")
    || message.includes("ReplicaSetNoPrimary")
    || message.includes("RetryableWriteError");
}

async function readWithRetry(load: () => Promise<unknown>) {
  let last: unknown;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await load();
    } catch (error) {
      last = error;
      if (!isTransientDbError(error) || attempt === 2) throw error;
      await new Promise((resolve) => setTimeout(resolve, 700));
    }
  }
  throw last;
}

let activeReader: PrismaClient | undefined;

function readOperation(model: string, operation: string, args: unknown) {
  const delegateName = `${model.charAt(0).toLowerCase()}${model.slice(1)}`;
  const delegate = (activeReader as unknown as Record<string, Record<string, (value: unknown) => Promise<unknown>>>)[delegateName];
  if (!delegate?.[operation]) return Promise.reject(new Error(`Cannot read ${model}.${operation}.`));
  return delegate[operation](args);
}

function createPrisma() {
  const log = process.env.NODE_ENV === "development" ? ["error", "warn"] as const : ["error"] as const;
  const reader = new PrismaClient({
    datasources: { db: { url: clientDatabaseUrl("primaryPreferred", 8_000) } },
    log: [...log],
  });
  activeReader = reader;
  const writer = new PrismaClient({
    datasources: { db: { url: clientDatabaseUrl("primary", 20_000) } },
    log: [...log],
  });
  const extended = writer.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          if (!READ_OPERATIONS.has(operation) || bypassReadCache.getStore()) {
            if (!READ_OPERATIONS.has(operation)) clearReadCache();
            return query(args);
          }
          return remember(`${model}:${operation}:${JSON.stringify(args)}`, () => readWithRetry(() => readOperation(model, operation, args)));
        },
      },
    },
  });
  Object.defineProperty(extended, "__reader", { value: reader });
  const transaction = extended.$transaction.bind(extended);
  Object.defineProperty(extended, "$transaction", {
    configurable: true,
    value: ((async (...args: unknown[]) => {
      const next = [...args];
      if (typeof next[0] === "function") {
        const given = typeof next[1] === "object" && next[1] !== null ? next[1] as { maxWait?: number; timeout?: number } : {};
        next[1] = { maxWait: 15_000, timeout: 30_000, ...given };
      }
      try {
        return await bypassReadCache.run(true, () => transaction(...(next as [never])));
      } finally {
        clearReadCache();
      }
    }) as typeof extended.$transaction),
  });
  return extended;
}

type AppPrisma = ReturnType<typeof createPrisma> & { __reader?: PrismaClient };

const globalForPrisma = globalThis as unknown as { prisma?: AppPrisma; prismaCacheVersion?: number };

if (globalForPrisma.prisma && globalForPrisma.prismaCacheVersion !== CACHE_VERSION) {
  void globalForPrisma.prisma.$disconnect();
  void globalForPrisma.prisma.__reader?.$disconnect();
  globalForPrisma.prisma = undefined;
}

export const prisma = globalForPrisma.prisma ?? createPrisma();

export function pingDatabaseConnection() {
  const reader = (prisma as AppPrisma).__reader;
  if (!reader) throw new Error("Database client is not ready.");
  return reader.$runCommandRaw({ ping: 1 });
}

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
  globalForPrisma.prismaCacheVersion = CACHE_VERSION;
}
