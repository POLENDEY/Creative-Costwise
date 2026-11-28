import { unstable_rethrow } from "next/navigation";
import type { ReactNode } from "react";
import { AppProblem } from "@/components/app-problem";
import { DatabaseBusy } from "@/components/database-busy";
import { isTransientDbError } from "@/lib/prisma";
import { logInternalError } from "@/lib/user-facing-error";

export function withDatabasePage<A extends unknown[], R>(page: (...args: A) => Promise<R>) {
  return async (...args: A): Promise<R | ReactNode> => {
    try {
      return await page(...args);
    } catch (error) {
      unstable_rethrow(error);
      logInternalError(error);
      if (isTransientDbError(error)) return <DatabaseBusy />;
      return <AppProblem />;
    }
  };
}
