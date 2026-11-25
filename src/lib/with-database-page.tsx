import { unstable_rethrow } from "next/navigation";
import type { ReactNode } from "react";
import { DatabaseBusy } from "@/components/database-busy";
import { isTransientDbError } from "@/lib/prisma";

export function withDatabasePage<A extends unknown[], R>(page: (...args: A) => Promise<R>) {
  return async (...args: A): Promise<R | ReactNode> => {
    try {
      return await page(...args);
    } catch (error) {
      unstable_rethrow(error);
      if (!isTransientDbError(error)) throw error;
      return <DatabaseBusy />;
    }
  };
}
