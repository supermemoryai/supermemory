import Features from "./Features";
import RotatingIcons from "./RotatingIcons";
import Hero from "./Hero";
import Navbar from "./Navbar";
import Cta from "./Cta";
import { Toaster } from "@/components/ui/toaster";

export const runtime = "edge";

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
      </div>

      {/* Hero section */}
      <Hero />

      {/* Features section */}
      <Features />

      <RotatingIcons />

      <Cta />

      <Toaster />

      <footer className="mt-16 flex w-full items-center justify-between gap-4 border-t border-zinc-200/50 px-8 py-8 text-sm text-zinc-500">
        <p>© 2024 Supermemory.ai</p>
        <div className="flex gap-4">
          <a href="mailto:hi@dhravya.dev">Contact</a>
          <a href="https://twitter.com/supermemoryai">Twitter</a>
          <a href="https://github.com/dhravya/supermemory">Github</a>
        </div>
      </footer>
    </main>
  );
}
