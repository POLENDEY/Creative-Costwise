"use client";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, minHeight: "100vh", display: "grid", placeItems: "center", background: "#f8f6f7", color: "#312a33", fontFamily: "Arial, Helvetica, sans-serif" }}>
        <main style={{ maxWidth: "28rem", padding: "2rem" }}>
          <p style={{ margin: "0 0 0.6rem", color: "#9d174d", fontSize: "0.72rem", letterSpacing: "0.14em" }}>ONE MOMENT</p>
          <h1 style={{ margin: 0, fontFamily: "Georgia, Times New Roman, serif", fontWeight: 400, fontSize: "2rem", letterSpacing: "-0.04em" }}>This page needs another try</h1>
          <p style={{ margin: "0.8rem 0 1.2rem", color: "#847b85", fontSize: "0.95rem", lineHeight: 1.5 }}>Something interrupted this page. Your saved work is still here.</p>
          <button type="button" onClick={() => reset()} style={{ border: 0, borderRadius: "999px", padding: "0.7rem 1.1rem", background: "#be185d", color: "#fff", font: "inherit", cursor: "pointer" }}>
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
