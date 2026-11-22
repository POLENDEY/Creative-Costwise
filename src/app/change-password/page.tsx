"use client";

import { useState, useTransition } from "react";
import { KeyRound, Sparkles } from "lucide-react";
import { changePassword } from "@/app/actions";

export default function ChangePasswordPage() {
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function submit(formData: FormData) {
    setError("");
    startTransition(async () => {
      try {
        await changePassword(formData);
      } catch (reason) {
        if (reason instanceof Error && !reason.message.includes("NEXT_REDIRECT")) {
          setError(reason.message);
        }
      }
    });
  }

  return <main className="login-screen">
    <section className="login-brand-panel"><div className="login-brand-copy"><div className="brand-lockup"><span className="brand-name">Creative <b>Costwise</b></span></div><div className="login-message"><span className="eyebrow"><Sparkles size={14} /> A FRESH START</span><h1>A little reset for <em>your account.</em></h1><p>Choose a password that only you know before stepping into your workspace.</p></div></div></section>
    <section className="login-form-panel"><div className="login-form-wrap"><span className="eyebrow">FIRST SIGN-IN</span><h2>Make it your own.</h2><p className="muted">Set a new password to keep your shop details safe.</p>
      <form action={submit} className="login-form"><label htmlFor="password">New password</label><input id="password" type="password" name="password" autoComplete="new-password" minLength={10} required /><label htmlFor="confirmPassword">Confirm new password</label><input id="confirmPassword" type="password" name="confirmPassword" autoComplete="new-password" minLength={10} required />{error && <p className="form-error" role="alert">{error}</p>}<button className="button button-primary login-submit" disabled={pending}><KeyRound size={16} /> {pending ? "Updating…" : "Set new password"}</button></form>
    </div></section>
  </main>;
}
