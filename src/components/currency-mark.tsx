import type { Currency } from "@/lib/money";

export function CurrencyMark({ currency }: { currency: Currency }) {
  return <span className="currency-mark" aria-label={currency === "PHP" ? "Philippine peso" : "US dollar"}>{currency === "PHP" ? "₱" : "$"}</span>;
}
