"use client";

import Image from "next/image";
import { signIn } from "next-auth/react";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(formData: FormData) {
    setBusy(true);
    setError("");
    const result = await signIn("credentials", {
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
      redirect: false,
    });
    if (result?.error) {
      setError(
        result.error === "CredentialsSignin"
          ? "That email and password do not match. Check both and try again."
          : result.error === "Configuration" || result.error === "CallbackRouteError"
            ? "Your sign-in could not be completed because the account database is unavailable. Try again in a moment."
            : result.error,
      );
      setBusy(false);
      document.getElementById("email")?.focus();
      return;
    }
    window.location.assign("/");
  }

  return (
    <main className="login-screen">
      <div className="login-layout">
        <section className="login-brand-panel" aria-label="About Creative Costwise">
          <div className="login-brand-copy">
            <div className="brand-lockup">
              <span className="login-brand-mark">
                <Image src="/brand-logo.png" alt="" width={64} height={64} priority />
              </span>
              <span className="brand-name">Creative Costwise</span>
            </div>
            <div className="login-message">
              <h1>Cost the work, then set the price.</h1>
              <p>Materials, printing, and labor stay together, so a price is a decision you can explain.</p>
            </div>
            <ul className="login-points">
              <li>Material cost per piece</li>
              <li>Print cost per sheet</li>
              <li>Retail and bulk prices</li>
            </ul>
          </div>
        </section>
        <section className="login-form-panel">
          <div className="login-form-wrap">
            <div className="mobile-brand">
              <Image src="/brand-logo.png" alt="" width={40} height={40} />
              <b>Creative Costwise</b>
            </div>
            <h2 id="sign-in-heading">Sign in</h2>
            <p className="muted">Use the email and password from your toolkit admin.</p>
            <form className="login-form" action={submit} aria-labelledby="sign-in-heading" aria-busy={busy}>
              <div className="login-field">
                <label htmlFor="email">Email</label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="username"
                  autoCorrect="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  enterKeyHint="next"
                  required
                  aria-invalid={error ? true : undefined}
                  aria-describedby={error ? "login-error" : undefined}
                />
              </div>
              <div className="login-field">
                <label htmlFor="password">Password</label>
                <div className="password-input">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    enterKeyHint="done"
                    required
                    aria-invalid={error ? true : undefined}
                    aria-describedby={error ? "login-error" : undefined}
                  />
                  <button
                    type="button"
                    className="icon-button reveal-button"
                    aria-pressed={showPassword}
                    aria-controls="password"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    onClick={() => setShowPassword((value) => !value)}
                  >
                    {showPassword ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
                  </button>
                </div>
              </div>
              {error ? <p id="login-error" className="form-error" role="alert">{error}</p> : null}
              <button type="submit" className="button button-primary login-submit" disabled={busy}>
                {busy ? "Signing in…" : "Sign in"}
              </button>
            </form>
            <p className="login-help">Need access? Ask your toolkit admin.</p>
          </div>
        </section>
      </div>
    </main>
  );
}
