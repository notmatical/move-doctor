import "./globals.css";

import type { Metadata } from "next";
import { ThemeProvider } from "@/components/theme-provider";
import { cn } from "@/lib/utils";
import { AnalyticsProvider } from "@/providers/analytics.provider";
import { fontMono, geist } from "./fonts";

export const metadata: Metadata = {
  metadataBase: new URL("https://move.doctor"),
  title: "Move Doctor: a deterministic linter for Sui Move",
  description:
    "A deterministic linter for Sui Move. Catches the convention, idiom, ability, and security mistakes the compiler misses. Scored 0-100, every rule cited, built for coding agents.",
  openGraph: {
    title: "Move Doctor: a deterministic linter for Sui Move",
    description:
      "Lint Sui Move with a 0-100 health score. Every rule cited. Installs as an agent skill.",
    url: "https://move.doctor",
    siteName: "Move Doctor",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Move Doctor: a deterministic linter for Sui Move",
    description:
      "Lint Sui Move with a 0-100 health score. Every rule cited. Installs as an agent skill.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      className={cn(
        "antialiased",
        fontMono.variable,
        "font-sans",
        geist.variable
      )}
      lang="en"
      suppressHydrationWarning
    >
      <body>
        <ThemeProvider defaultTheme="dark">
          <div className="grain relative flex min-h-screen flex-col">
            <main className="relative z-10 flex-1">{children}</main>
          </div>
        </ThemeProvider>
        <AnalyticsProvider />
      </body>
    </html>
  );
}
