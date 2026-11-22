import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Creative Costwise",
  description: "A thoughtful workspace for costing and growing your creative business.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
