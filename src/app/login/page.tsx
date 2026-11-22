"use client";

import Image from "next/image";
import { signIn } from "next-auth/react";
import { useState } from "react";
import { ArrowRight, Eye, EyeOff, Sparkles } from "lucide-react";

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
      setError("That email and password combination didn’t match.");
      setBusy(false);
      return;
    }
    window.location.assign("/");
  }

  return (
    <main className="login-screen">
      <section className="login-brand-panel">
        <div className="login-brand-copy">
          <div className="brand-lockup">
            <Image src="/brand-logo.png" alt="Creative Costwise" width={150} height={150} priority />
            <span className="brand-name">Creative <b>Costwise</b></span>
          </div>
          <div className="login-message">
            <span className="eyebrow"><Sparkles size={14} /> MADE FOR YOUR MAKING</span>
            <h1>Make room for the <em>good ideas.</em></h1>
            <p>Know what it costs. Price with confidence. Keep your creative business moving.</p>
          </div>
          <div className="login-footnote">A little more clarity, for every little thing you create.</div>
        </div>
        <div className="login-orbit orbit-one" />
        <div className="login-orbit orbit-two" />
        <div className="login-orbit orbit-three" />
      </section>
      <section className="login-form-panel">
        <div className="login-form-wrap">
          <div className="mobile-brand"><Image src="/brand-logo.png" alt="" width={54} height={54} /><b>Creative Costwise</b></div>
          <span className="eyebrow">WELCOME BACK</span>
          <h2>Your ideas have a home.</h2>
          <p className="muted">Sign in to pick up right where you left off.</p>
          <form action={submit} className="login-form">
            <label htmlFor="email">Email address</label>
            <input id="email" name="email" type="email" placeholder="you@yourbusiness.com" autoComplete="email" required />
            <div className="field-label-row"><label htmlFor="password">Password</label></div>
            <div className="password-input">
              <input id="password" name="password" type={showPassword ? "text" : "password"} placeholder="Enter your password" autoComplete="current-password" required />
              <button type="button" className="icon-button reveal-button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Hide password" : "Show password"}>
                {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
            {error && <p className="form-error" role="alert">{error}</p>}
            <button type="submit" className="button button-primary login-submit" disabled={busy}>
              {busy ? "Signing you in…" : "Sign in"} <ArrowRight size={17} />
            </button>
          </form>
          <div className="login-help"><span>Need a hand?</span> Ask your toolkit admin for access.</div>
        </div>
      </section>
    </main>
  );
}
