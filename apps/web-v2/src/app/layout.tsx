import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Script from "next/script";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Supermemory - Your personal second brain.",
  description:
    "Bring saved information from all over the internet into one place where you can connect it, and ask AI about it",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" />
      <body className={inter.className}>{children}</body>
    </html>
  );
}
