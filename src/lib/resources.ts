const RESOURCE_SETTINGS_ID = "resources";

export { RESOURCE_SETTINGS_ID };

export function parseGoogleSheetsUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    throw new Error("Paste a full Google Sheets link.");
  }
  if (url.protocol !== "https:" || url.hostname !== "docs.google.com" || !url.pathname.startsWith("/spreadsheets/")) {
    throw new Error("Paste an https Google Sheets link.");
  }
  return url.toString();
}

export function parseHttpsUrl(value: string, label: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    throw new Error(`Paste a full ${label} link.`);
  }
  if (url.protocol !== "https:") throw new Error(`${label} links must start with https.`);
  return url.toString();
}
