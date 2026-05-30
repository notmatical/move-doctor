import { Geist, Geist_Mono } from "next/font/google";

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });

export { fontMono, geist };
