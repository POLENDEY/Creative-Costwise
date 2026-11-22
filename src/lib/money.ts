export type Currency = "PHP" | "USD";

export function resolveCurrency(value: string | null | undefined): Currency {
  return value === "USD" ? "USD" : "PHP";
}

export function formatMoney(minor: number, currency: Currency = "PHP") {
  return new Intl.NumberFormat(currency === "PHP" ? "en-PH" : "en-US", {
    style: "currency",
    currency,
  }).format(minor / 100);
}

export function parseMoneyToMinor(value: string) {
  const normalized = value.trim().replace(/,/g, "");
  if (!/^\d+(\.\d{0,2})?$/.test(normalized)) return null;
  const [whole, fraction = ""] = normalized.split(".");
  return Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
}

export function roundHalfUp(value: number) {
  return Math.floor(value + 0.5);
}
