import nodemailer from "nodemailer";

/**
 * Shared SMTP setup for every system email. The sender is whatever account the
 * shop configures in SMTP_USER — normally its own Gmail address, using a Gmail
 * app password.
 */

export function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character] ?? character);
}

function smtpPassword() {
  return process.env.SMTP_PASSWORD || process.env.SMTP_PASS || "";
}

/** The From address: MAIL_FROM if set, otherwise the signed-in SMTP account. */
export function mailFromAddress() {
  return process.env.MAIL_FROM?.trim() || process.env.EMAIL_FROM?.trim() || process.env.SMTP_USER?.trim() || "";
}

export function emailConfigured() {
  return Boolean(process.env.SMTP_USER?.trim() && smtpPassword() && mailFromAddress());
}

export function createMailTransport() {
  const user = process.env.SMTP_USER?.trim();
  const pass = smtpPassword();
  if (!user || !pass) return null;

  const service = process.env.SMTP_SERVICE?.trim().toLowerCase();
  if (service === "gmail") {
    return nodemailer.createTransport({ service: "gmail", auth: { user, pass } });
  }

  const host = process.env.SMTP_HOST?.trim();
  const port = Number(process.env.SMTP_PORT ?? 587);
  if (!host || !Number.isInteger(port) || port < 1 || port > 65535) return null;
  const secure = process.env.SMTP_SECURE
    ? process.env.SMTP_SECURE.toLowerCase() === "true"
    : port === 465;
  return nodemailer.createTransport({ host, port, secure, auth: { user, pass } });
}

/** Absolute URL for a path inside the app. */
export function appUrl(path: string) {
  const base = process.env.NEXTAUTH_URL?.trim() || "http://localhost:3000";
  try {
    return new URL(path, base).toString();
  } catch {
    return `http://localhost:3000${path}`;
  }
}
