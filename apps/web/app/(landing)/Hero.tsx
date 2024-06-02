"use client";
import React from "react";
import { motion } from "framer-motion";
import { Twitter } from "@repo/ui/components/icons";
import EmailInput from "./EmailInput";
import LinkArrow from "./linkArrow";
import { TwitterBorder } from "./twitterLink";

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
        <TwitterBorder />
        <motion.h1
          {...{
            ...slap,
            transition: { ...slap.transition, delay: 0.2 },
          }}
          className="text-center text-4xl font-semibold tracking-tight text-white/95 md:text-5xl"
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
