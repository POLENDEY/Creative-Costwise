"use client";

import { AppProblem } from "@/components/app-problem";

export default function RouteError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <AppProblem onRetry={reset} />;
}
