"use client";

export function AppProblem({
  title = "This page needs another try",
  body = "Something interrupted this page. Your saved work is still here.",
  onRetry,
}: {
  title?: string;
  body?: string;
  onRetry?: () => void;
}) {
  return (
    <section className="feature-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">ONE MOMENT</span>
          <h1>{title}</h1>
          <p>{body}</p>
          <button type="button" className="button button-primary app-problem-action" onClick={onRetry ?? (() => window.location.reload())}>
            Try again
          </button>
        </div>
      </div>
    </section>
  );
}
