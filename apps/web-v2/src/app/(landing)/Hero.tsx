"use client";
import React from "react";
import { motion } from "framer-motion";
import { Twitter } from "@/utils/icons";
import EmailInput from "./EmailInput";
import LinkArrow from "./linkArrow";

const slap = {
  initial: {
    opacity: 0,
    scale: 1.1,
  },
  whileInView: { opacity: 1, scale: 1 },
  transition: {
    duration: 0.5,
    ease: "easeInOut",
  },
  viewport: { once: true },
};

function Hero() {
  return (
    <>
      <section className="mt-24 flex max-w-xl flex-col items-center justify-center gap-10 md:mt-56">
        <a
          className="group/anchor flex items-center justify-center gap-4 rounded-full text-white/80 bg-white/10 px-4 py-2 text-sm"
          href="https://twitter.com/supermemoryai"
          target="_blank"
        >
          <Twitter className="h-4 w-4" /><div className="flex"> Follow us on Twitter <LinkArrow classname=" scale-y-0 group-hover/anchor:scale-y-100 origin-bottom-left transition" stroke="#ffffff" /></div>
        </a>
        <motion.h1
          {...{
            ...slap,
            transition: { ...slap.transition, delay: 0.2 },
          }}
          className="text-center text-4xl text-white/95 md:text-5xl tracking-normal font-semibold"
        >
          Build your own second brain with Supermemory
        </motion.h1>
        <motion.p
          {...{
            ...slap,
            transition: { ...slap.transition, delay: 0.3 },
          }}
          className="text-soft-foreground-text text-center"
        >
          Bring saved information from all over the internet into one place
          where you can connect it, and ask AI about it
        </motion.p>
        <EmailInput />
      </section>
      <motion.img
        {...{
          ...slap,
          transition: { ...slap.transition, delay: 0.35 },
        }}
        src="/landing-ui.svg"
        alt="Landing page background"
        width={1512}
        height={1405}
        draggable="false"
        className="z-[-2] mt-28 h-full w-[80%] select-none"
      />
    </>
  );
}

export default Hero;
