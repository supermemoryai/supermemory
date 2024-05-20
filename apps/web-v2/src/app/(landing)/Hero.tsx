"use client";
import React from "react";
import { motion } from "framer-motion";
import { Twitter } from "@/utils/icons";
import EmailInput from "./EmailInput";

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
      <section className="mt-24 flex max-w-xl flex-col items-center justify-center gap-8 md:mt-40">
        <a
          className="flex items-center justify-center gap-4 rounded-full bg-white/10 px-4 py-2 text-sm"
          href="https://twitter.com/supermemoryai"
        >
          <Twitter className="h-4 w-4 text-white" /> Follow us on Twitter
        </a>
        <motion.h1
          {...{
            ...slap,
            transition: { ...slap.transition, delay: 0.2 },
          }}
          className="text-center text-4xl font-light text-white md:text-5xl"
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
        className="z-[-2] mt-16 h-full w-[80%] select-none"
      />
    </>
  );
}

export default Hero;
