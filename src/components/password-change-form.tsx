"use client";

import { useState, useTransition } from "react";
import { KeyRound } from "lucide-react";
import { changeOwnPassword } from "@/actions/shop";
import { userFacingError } from "@/lib/user-facing-error";

export function PasswordChangeForm() {
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function submit(formData: FormData) {
    setMessage("");
    setError("");
    startTransition(async () => {
      try {
        await changeOwnPassword(formData);
        setMessage("Your password has been updated.");
        (document.getElementById("password-change-form") as HTMLFormElement | null)?.reset();
      } catch (reason) {
        setError(userFacingError(reason, "Your password could not be changed."));
      }
    });
  }

  return <section className="panel settings-panel password-settings-panel">
    <div className="panel-heading"><div><span className="eyebrow">ACCOUNT SECURITY</span><h2>Change your password</h2><p>Choose a password with at least 10 characters.</p></div><KeyRound className="settings-heading-icon" size={22} /></div>
    <form id="password-change-form" action={submit} className="form-grid">
      <label className="field">Current password<input name="currentPassword" type="password" autoComplete="current-password" required /></label>
      <label className="field">New password<input name="password" type="password" autoComplete="new-password" minLength={10} required /></label>
      <label className="field">Confirm new password<input name="confirmPassword" type="password" autoComplete="new-password" minLength={10} required /></label>
      <div className="password-submit"><button className="button button-primary" type="submit" disabled={pending}>{pending ? "Updating…" : "Update password"}</button></div>
    </form>
    {error && <p className="form-error password-message" role="alert">{error}</p>}
    {message && <p className="password-success password-message" role="status">{message}</p>}
  </section>;
}
