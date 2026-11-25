"use client";

import { useEffect } from "react";

export function DatabaseBusy() {
  useEffect(() => {
    const timer = window.setTimeout(() => window.location.reload(), 5000);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <section className="feature-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">CONNECTION</span>
          <h1>The database is catching up</h1>
          <p>The shop data is still saved. This page will refresh on its own in a few seconds.</p>
        </div>
      </div>
    </section>
  );
}
