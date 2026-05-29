import type { Metadata } from "next";
import "./globals.css";
import { Geist } from "next/font/google";
import { SiteNav } from "@/components/site-nav";
import { cn } from "@/lib/utils";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "Move Doctor — Your agent writes bad Move, this catches it.",
  description:
    "Deterministic Sui Move scanner. Rules grounded in The Move Book, the Sui compiler's --lint pass, and Sui Move best practices. Outputs a 0-100 health score.",
  metadataBase: new URL("https://move.doctor"),
  openGraph: {
    title: "Move Doctor",
    description:
      "Deterministic Sui Move scanner. 0-100 health score. Installs as an agent skill.",
    type: "website",
  },
};

const RootLayout = ({ children }: { children: React.ReactNode }) => (
  <html className={cn("font-sans", geist.variable)} lang="en">
    <body className="flex min-h-screen flex-col">
      <SiteNav />
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-16">
        {children}
      </main>
      <footer className="border-[var(--color-border)] border-t py-8 text-center text-[var(--color-fainter)] text-sm">
        <p>
          MIT licensed · Source on{" "}
          <a
            className="text-[var(--color-faint)] transition hover:text-[var(--color-paper)]"
            href="https://github.com/notmatical/move-doctor"
          >
            GitHub
          </a>{" "}
          · Rules grounded in{" "}
          <a
            className="text-[var(--color-faint)] transition hover:text-[var(--color-paper)]"
            href="https://move-book.com/guides/code-quality-checklist/"
          >
            The Move Book
          </a>
        </p>
      </footer>
    </body>
  </html>
);

export default RootLayout;
