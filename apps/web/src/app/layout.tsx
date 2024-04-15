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
      <head>
        <meta
          name="og:image"
          content="https://supermemory.dhr.wtf/og-image.png"
        />
        <script
          async
          src="https://u.dhr.wtf/script.js"
          data-website-id="731dfc2e-b1c0-4696-a7b3-efd27b19dfdf"
        ></script>
      </head>
      <body className={inter.className}>
        <div vaul-drawer-wrapper="" className="min-w-screen overflow-x-hidden">
          {children}
        </div>
      </body>
    </html>
  );
}
