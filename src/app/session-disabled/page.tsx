"use client";

import { useEffect } from "react";
import { signOutHere } from "@/components/sign-out-button";
import { ShieldOff } from "lucide-react";

export default function SessionDisabledPage() {
  useEffect(() => {
    void signOutHere();
  }, []);

  return <main className="expired-screen"><section className="expired-card"><span className="expired-mark"><ShieldOff size={21} /></span><span className="eyebrow">ACCOUNT ACCESS PAUSED</span><h1>This toolkit login is disabled.</h1><p>Your administrator has paused this account. You’re being signed out now. Contact them if you think this was a mistake.</p><button className="button button-secondary" onClick={() => void signOutHere()}>Sign out</button></section></main>;
}
