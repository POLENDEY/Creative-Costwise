"use client";

import { signOut } from "next-auth/react";

/** Stay on this origin. A relative NextAuth callback follows NEXTAUTH_URL and can open another app when the dev port differs. */
export async function signOutHere() {
  await signOut({ redirect: false });
  window.location.assign("/login");
}

export function SignOutButton({ label = "Sign out" }: { label?: string }) {
  return (
    <button type="button" className="button button-secondary" onClick={() => void signOutHere()}>
      {label}
    </button>
  );
}
