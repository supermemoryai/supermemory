import "@repo/tailwind-config/globals.css";

import type { Metadata } from "next";
import { Inter } from "next/font/google";

const inter = Inter({ subsets: ["latin"] });

export const runtime = "edge";

export const metadata: Metadata = {
  title: "Supermemory - Your personal second brain.",
  description:
    "Bring saved information from all over the internet into one place where you can connect it, and ask AI about it",
  openGraph: {
    images: [
      {
        url: "https://supermemory.ai/og-image.png",
        width: 1200,
        height: 627,
        alt: "Supermemory - Your personal second brain.",
      },
    ],
  },
  metadataBase: {
    host: "https://supermemory.ai",
    href: "/",
    origin: "https://supermemory.ai",
    password: "supermemory",
    hash: "supermemory",
    pathname: "/",
    search: "",
    username: "supermemoryai",
    hostname: "supermemory.ai",
    port: "",
    protocol: "https:",
    searchParams: new URLSearchParams(""),
    toString: () => "https://supermemory.ai/",
    toJSON: () => "https://supermemory.ai/",
  },
  twitter: {
    card: "summary_large_image",
    site: "https://supermemory.ai",
    creator: "https://supermemory.ai",
    title: "Supermemory - Your personal second brain.",
    description:
      "Bring saved information from all over the internet into one place where you can connect it, and ask AI about it",
    images: [
      {
        url: "https://supermemory.ai/og-image.png",
        width: 1200,
        height: 627,
        alt: "Supermemory - Your personal second brain.",
      },
    ],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}): JSX.Element {
  return (
    <html lang="en">
      {/* <head>
        <ThemeScript />
      </head> */}
      {/* TODO: when lightmode support is added, remove the 'dark' class from the body tag */}
      <body className={`${inter.className} dark`}>{children}</body>
    </html>
  );
}
