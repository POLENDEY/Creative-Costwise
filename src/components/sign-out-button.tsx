"use client";

import { signOut } from "next-auth/react";

export function SignOutButton({ label = "Sign out" }: { label?: string }) {
  return (
    <button type="button" className="button button-secondary" onClick={() => signOut({ callbackUrl: "/login" })}>
      {label}
    </button>
  );
}
