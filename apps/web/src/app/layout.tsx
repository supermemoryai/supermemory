import type { Metadata } from "next";
import { Roboto, Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ weight: ["300", "400", "500"], subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Supermemory - Your second brain",
  description: "Save your memories forever, build your own second brain.",
  openGraph: {
    images: [
      {
        url: "https://supermemory.dhr.wtf/og-image.png",
        width: 1200,
        height: 630,
      },
    ],
    siteName: "Supermemory",
    title: "Supermemory - Your second brain",
    description: "Save your memories forever, build your own second brain.",
  },
  twitter: {
    card: "summary_large_image",
    site: "https://supermemory.dhr.wtf",
    creator: "@dhravyashah",
    description: "Save your memories forever, build your own second brain.",
    images: [
      {
        url: "https://supermemory.dhr.wtf/og-image.png",
        width: 1200,
        height: 630,
      },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={inter.className}>
        <div vaul-drawer-wrapper="" className="min-w-screen overflow-x-hidden">
          {children}
        </div>
      </body>
    </html>
  );
}
