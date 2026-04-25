import type { Metadata } from "next";
import "./globals.css";
import { SiteHeader } from "@/components/SiteHeader";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://circlearc-59513674.slonix.dev";

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: "Mtrly — Content, metered by the second",
    template: "%s · Mtrly",
  },
  description: "Pay-per-second content powered by Circle Gateway on Arc Testnet.",
  applicationName: "Mtrly",
  openGraph: {
    type: "website",
    siteName: "Mtrly",
    title: "Mtrly — Content, metered by the second",
    description: "Pay-per-second content powered by Circle Gateway on Arc Testnet.",
    url: APP_URL,
  },
  twitter: {
    card: "summary_large_image",
    title: "Mtrly — Content, metered by the second",
    description: "Pay-per-second content powered by Circle Gateway on Arc Testnet.",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-bg text-fg">
        <SiteHeader />
        {children}
      </body>
    </html>
  );
}
