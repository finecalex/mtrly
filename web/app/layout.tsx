import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mtrly — Content, metered by the second",
  description: "Pay-per-second content powered by Circle Nanopayments on Arc.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-bg text-fg">{children}</body>
    </html>
  );
}
