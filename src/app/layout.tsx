import type { Metadata } from "next";
import { AuthSession } from "@/components/auth-session";
import "./globals.css";

export const metadata: Metadata = {
  title: "Creative Costwise",
  description: "A thoughtful workspace for costing and growing your creative business.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
  other: {
    "text-scale": "scale",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body><AuthSession>{children}</AuthSession></body>
    </html>
  );
}
