import { Github, Twitter } from "@/utils/icons";
import Image from "next/image";
import EmailInput from "./EmailInput";
import Features from "./Features";
import RotatingIcons from "./RotatingIcons";
import Logo from "@/../public/logo.svg";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center overflow-x-hidden">
      <div className="fixed top-0 z-[99999] mt-12 hidden w-full px-24 text-sm md:flex">
        <nav className="flex w-full flex-row justify-between rounded-2xl bg-white/10 shadow-[0px_2px_3px_-1px_rgba(0,0,0,0.1),0px_1px_0px_0px_rgba(25,28,33,0.02),0px_0px_0px_1px_rgba(25,28,33,0.08)] backdrop-blur-lg backdrop-filter">
          <div className="flex flex-row items-center p-3 opacity-50">
            <Image src={Logo} alt="Supermemory logo" width={40} height={40} />
          </div>
          <div className="flex flex-row items-center gap-8 p-3">
            <button className="text-soft-foreground-text">Home</button>
            <button className="text-soft-foreground-text">Features</button>
            <button className="text-soft-foreground-text">Use cases</button>
            <button className="text-soft-foreground-text">Testimonials</button>
          </div>
          <a className="m-2 flex items-center gap-3 rounded-xl bg-white/20 px-4 text-center text-white">
            <Github className="h-4 w-4" />
            Open source
          </a>
        </nav>
      </div>
      {/* Background gradients */}
      <div className="absolute left-0 top-0 z-[-1] h-full w-full">
        <div className="overflow-none">
          <div
            className="overflow-none absolute left-0 h-32 w-full bg-[#369DFD] bg-opacity-70 blur-[337.4px]"
            style={{ transform: "rotate(-30deg)" }}
          />
        </div>

        {/* a blue gradient line that's slightly tilted with blur (a lotof blur)*/}
        <div className="overflow-none">
          <div
            className="overflow-none absolute left-0 top-[100%] h-32 w-full bg-[#369DFD] bg-opacity-40 blur-[337.4px]"
            style={{ transform: "rotate(-30deg)" }}
          />
        </div>
      </div>
      {/* Hero section */}
      <section className="mt-40 flex max-w-xl flex-col items-center justify-center gap-8">
        <a
          className="flex items-center justify-center gap-4 rounded-full bg-white/10 px-4 py-2 text-sm"
          href="https://twitter.com/supermemoryai"
        >
          <Twitter className="h-4 w-4 text-white" /> Follow us on Twitter
        </a>
        <h1 className="text-center text-5xl font-light text-white">
          Build your own second brain with Supermemory
        </h1>
        <p className="text-soft-foreground-text text-center">
          Bring saved information from all over the internet into one place
          where you can connect it, and ask AI about it
        </p>
        <EmailInput />
      </section>
      <Image
        src="/landing-ui.svg"
        alt="Landing page background"
        width={1512}
        height={1405}
        priority
        draggable="false"
        className="z-[-2] mt-16 h-full w-[80%] select-none"
      />
      <Features />

      <div className="relative flex w-full flex-col items-center justify-center gap-8 px-4 sm:px-6">
        <h3 className="font-inter-tight mb-4 mt-8 text-center text-3xl font-bold text-zinc-200">
          Collect data from <br />{" "}
          <span className="bg-gradient-to-r from-blue-500 to-blue-300 bg-clip-text italic text-transparent ">
            any website{" "}
          </span>{" "}
          on the internet
        </h3>
        <RotatingIcons />
        <p className="text-center text-sm text-zinc-500">
          ... and bring it into your second brain
        </p>
      </div>

      <section className="relative mb-32 mt-40  flex w-full flex-col items-center justify-center gap-8">
        <div className="absolute left-0 z-[-1] h-full w-full">
          {/* a blue gradient line that's slightly tilted with blur (a lotof blur)*/}
          <div className="overflow-hidden">
            <div
              className="absolute left-0 h-32 w-full overflow-hidden bg-[#369DFD] bg-opacity-70 blur-[337.4px]"
              style={{ transform: "rotate(-30deg)" }}
            />
          </div>
        </div>
        <Image
          src="/landing-ui-2.png"
          alt="Landing page background"
          width={1512}
          height={1405}
          priority
          draggable="false"
          className="absolute z-[-2] hidden select-none rounded-3xl bg-black md:block lg:w-[80%]"
        />
        <h1 className="z-20 mt-4 text-center text-5xl font-light text-white">
          Your bookmarks are collecting dust.
        </h1>
        <p className="text-soft-foreground-text z-20 text-center">
          Time to change that. <br /> Sign up for the waitlist and be the first
          to try Supermemory
        </p>
        <EmailInput />
      </section>

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
