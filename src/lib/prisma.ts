import { AsyncLocalStorage } from "node:async_hooks";
import { setDefaultResultOrder } from "node:dns";
import { PrismaClient } from "@prisma/client";
import { assertProjectDatabase } from "@/lib/project-database";

setDefaultResultOrder("ipv4first");
assertProjectDatabase();

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
const CACHE_VERSION = 2;
const CACHE_TTL_MS = 20_000;

const bypassReadCache = new AsyncLocalStorage<true>();
const memory = new Map<string, { value: unknown; expires: number; generation: number }>();
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
        memory.set(key, { value: copy(value), expires: Date.now() + CACHE_TTL_MS, generation });
      }
      return value;
    })
    .finally(() => {
      if (inflight.get(key) === promise) inflight.delete(key);
    });
  inflight.set(key, promise);
  return promise;
}

function clearReadCache() {
  generation += 1;
  memory.clear();
}

function createPrisma() {
  const base = new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
  const extended = base.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          if (!READ_OPERATIONS.has(operation)) {
            clearReadCache();
            return query(args);
          }
          if (bypassReadCache.getStore()) return query(args);
          return remember(`${model}:${operation}:${JSON.stringify(args)}`, () => query(args));
        },
      },
    },
  });
  const transaction = extended.$transaction.bind(extended);
  Object.defineProperty(extended, "$transaction", {
    configurable: true,
    value: ((...args: unknown[]) => bypassReadCache.run(true, () => transaction(...(args as [never])))) as typeof extended.$transaction,
  });
  return extended;
}

type AppPrisma = ReturnType<typeof createPrisma>;

const globalForPrisma = globalThis as unknown as { prisma?: AppPrisma; prismaCacheVersion?: number };

if (globalForPrisma.prisma && globalForPrisma.prismaCacheVersion !== CACHE_VERSION) {
  void globalForPrisma.prisma.$disconnect();
  globalForPrisma.prisma = undefined;
}

export const prisma = globalForPrisma.prisma ?? createPrisma();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
  globalForPrisma.prismaCacheVersion = CACHE_VERSION;
}
