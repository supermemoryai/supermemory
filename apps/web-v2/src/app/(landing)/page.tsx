import RotatingIcons from "./RotatingIcons";
import Hero from "./Hero";
import Navbar from "./Navbar";
import Cta from "./Cta";
import { Toaster } from "@/components/ui/toaster";
import Features from "./Features";
import Footer from "./footer";
import { Metadata } from "next";

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

export default function Home() {
  return (
    <main className="dark flex min-h-screen flex-col items-center overflow-x-hidden px-2 md:px-0">
      <Navbar />

      {/* Background gradients */}
      <div className="absolute left-0 top-0 z-[-1] h-full w-full">
        <div className="overflow-x-hidden">
          <div
            className="absolute left-0 h-32 w-[95%] overflow-x-hidden bg-[#369DFD] bg-opacity-70 blur-[337.4px]"
            style={{ transform: "rotate(-30deg)" }}
          />
        </div>

        {/* a blue gradient line that's slightly tilted with blur (a lotof blur)*/}
        <div className="overflow-x-hidden">
          <div
            className="absolute left-0 top-[100%] h-32 w-[90%] overflow-x-hidden bg-[#369DFD] bg-opacity-40 blur-[337.4px]"
            style={{ transform: "rotate(-30deg)" }}
          />
        </div>

        <div className="overflow-x-hidden">
          <div className="absolute right-0 top-[145%] h-40 w-[17%] overflow-x-hidden bg-[#369DFD] bg-opacity-20 blur-[110px]" />
        </div>
      </div>

      {/* Hero section */}
      <Hero />

      {/* Features section */}
      <Features />

      <RotatingIcons />

      <Cta />

      <Toaster />

      <Footer />
    </main>
  );
}
