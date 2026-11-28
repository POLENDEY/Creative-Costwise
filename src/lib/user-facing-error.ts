const TRANSIENT_FLAG = Symbol.for("creative-costwise.transient-db");

const TRANSIENT_COPY = "The shop data is taking a moment. Please try again.";
const SLOW_COPY = "Saving took too long because the database was slow. Please try again.";
const GENERIC_COPY = "Something went wrong. Please try again.";

const GENERIC_PUBLIC = new Set([TRANSIENT_COPY, SLOW_COPY, GENERIC_COPY]);

const TRANSIENT_PATTERN = /DNS resolution|hostname resolution|unreachable network|I\/O error: timed out|Server selection timeout|server monitor timeout|ReplicaSetNoPrimary|RetryableWriteError/i;

const TECHNICAL_PATTERN = /prisma|raw query|invocation|node_modules|webpack-internal|server selection|replicaset|topology|i\/o error|timed out|mongodb|ECONN|ETIMEDOUT|ENOTFOUND|EAI_AGAIN|typeerror|referenceerror|syntaxerror|cannot read propert|is not a function|NEXT_REDIRECT|digest|transaction already closed|transaction api error|\bP\d{4}\b|\.tsx?:\d+|\.jsx?:\d+|at\s+\S+\s+\(/i;

export function isTechnicalErrorMessage(message: string) {
  const text = message.trim();
  if (!text || text.length > 220) return true;
  if (/[\r\n]/.test(text) || text.includes("`")) return true;
  if (text.includes("{") && text.includes("}")) return true;
  if (/^[A-Z][A-Za-z0-9]+$/.test(text)) return true;
  return TECHNICAL_PATTERN.test(text);
}

export function isTransientDatabaseError(error: unknown) {
  if (typeof error === "object" && error !== null && TRANSIENT_FLAG in error) return true;
  const message = error instanceof Error ? error.message : "";
  return TRANSIENT_PATTERN.test(message);
}

export function userFacingError(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : typeof error === "string" ? error : "";
  if (!message || isTechnicalErrorMessage(message) || GENERIC_PUBLIC.has(message)) return fallback;
  return message;
}

export function logInternalError(error: unknown) {
  const detail = error instanceof Error ? error.stack ?? error.message : String(error);
  process.stderr.write(`[app] ${detail}\n`);
}

export function softenDatabaseError<T>(error: T): T {
  if (!(error instanceof Error)) return error;
  if (GENERIC_PUBLIC.has(error.message)) return error;
  const transient = isTransientDatabaseError(error);
  const technical = isTechnicalErrorMessage(error.message);
  if (!transient && !technical) return error;
  const slow = /Transaction already closed|Transaction API error/i.test(error.message);
  const publicMessage = transient ? TRANSIENT_COPY : slow ? SLOW_COPY : GENERIC_COPY;
  if (transient) Object.defineProperty(error, TRANSIENT_FLAG, { value: true });
  process.stderr.write(`[database] ${error.message}\n`);
  try {
    Object.defineProperty(error, "message", { configurable: true, value: publicMessage });
  } catch {
    // Some database errors lock their message. Screens still hide the raw text.
  }
  return error;
}
