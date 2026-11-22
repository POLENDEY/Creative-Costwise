"use client";

import { signOut } from "next-auth/react";

export function ExpiredSignOut() {
  return <button className="button button-secondary" onClick={() => signOut({ callbackUrl: "/login" })}>Sign out</button>;
}
