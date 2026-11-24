"use client";

import { useState, useTransition, type ReactNode } from "react";

export function ResourceForm({
  action,
  children,
  submitLabel,
  resetOnSuccess = false,
  secondary,
}: {
  action: (formData: FormData) => Promise<{ error?: string }>;
  children: ReactNode;
  submitLabel: string;
  resetOnSuccess?: boolean;
  secondary?: boolean;
}) {
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="form-grid"
      onSubmit={(event) => {
        event.preventDefault();
        const form = event.currentTarget;
        const data = new FormData(form);
        setError("");
        setSaved(false);
        startTransition(async () => {
          const result = await action(data);
          if (result?.error) {
            setError(result.error);
            return;
          }
          setSaved(true);
          if (resetOnSuccess) form.reset();
        });
      }}
    >
      {children}
      <div className="form-actions">
        <span>{error ? <b className="form-error">{error}</b> : saved ? "Saved." : " "}</span>
        <button className={`button ${secondary ? "button-secondary" : "button-primary"}`} type="submit" disabled={pending}>
          {pending ? "Saving…" : submitLabel}
        </button>
      </div>
    </form>
  );
}
