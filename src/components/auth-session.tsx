"use client";

import { SessionProvider } from "next-auth/react";

export function AuthSession({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider refetchInterval={60 * 60} refetchOnWindowFocus>
      {children}
    </SessionProvider>
  );
}
