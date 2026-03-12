import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GitFinder — GitHub Project Explorer",
  description: "Search GitHub repositories by idea. Filter by date, quality, and language. Read READMEs inline.",
  openGraph: {
    title: "GitFinder",
    description: "Find any GitHub project in seconds",
    type: "website",
  },
};

import { SpeedInsights } from "@vercel/speed-insights/next";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>
        {children}
        <SpeedInsights />
      </body>
    </html>
  );
}
