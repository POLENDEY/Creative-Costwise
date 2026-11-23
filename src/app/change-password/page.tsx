"use client";

import { useState, useTransition } from "react";
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
          document.getElementById("password")?.focus();
        }
      }
    });
  }

  return (
    <main className="login-screen">
      <div className="login-layout">
        <section className="login-brand-panel" aria-label="About Creative Costwise">
          <div className="login-brand-copy">
            <div className="brand-lockup"><span className="brand-name">Creative Costwise</span></div>
            <div className="login-message">
              <h1>Choose a password only you know.</h1>
              <p>This replaces the temporary password before you open the shop.</p>
            </div>
          </div>
        </section>
        <section className="login-form-panel">
          <div className="login-form-wrap">
            <h2 id="new-password-heading">Set a new password</h2>
            <p className="muted">Use at least 10 characters.</p>
            <form className="login-form" action={submit} aria-labelledby="new-password-heading" aria-busy={pending}>
              <div className="login-field">
                <label htmlFor="password">New password</label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  enterKeyHint="next"
                  minLength={10}
                  required
                  aria-invalid={error ? true : undefined}
                  aria-describedby={error ? "password-error" : "password-hint"}
                />
              </div>
              <div className="login-field">
                <label htmlFor="confirmPassword">Confirm new password</label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  enterKeyHint="done"
                  minLength={10}
                  required
                  aria-invalid={error ? true : undefined}
                  aria-describedby={error ? "password-error" : "password-hint"}
                />
              </div>
              <p id="password-hint" className="login-hint">At least 10 characters. You can paste a password.</p>
              {error ? <p id="password-error" className="form-error" role="alert">{error}</p> : null}
              <button type="submit" className="button button-primary login-submit" disabled={pending}>
                {pending ? "Saving…" : "Save password"}
              </button>
            </form>
          </div>
        </section>
      </div>
    </main>
  );
}
