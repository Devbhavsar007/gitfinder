import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GitFinder — GitHub Project Explorer",
  description: "Search GitHub repositories by idea. Filter by date, quality, and language. Read READMEs inline.",
  openGraph: {
    title: "GitFinder — GitHub Project Explorer",
    description: "Search GitHub's 300M+ repos by idea. Filter by quality, language & date.",
    type: "website",
    url: "https://gitfinder-five-sandy.vercel.app",
    images: [
      {
        url: "https://gitfinder-five-sandy.vercel.app/preview.png",
        width: 1200,
        height: 630,
        alt: "GitFinder Preview",
      }
    ],
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
