"use client";
import React from "react";
import { motion } from "framer-motion";
import { Twitter } from "@repo/ui/components/icons";
import EmailInput from "./EmailInput";
import LinkArrow from "./linkArrow";
import { TwitterBorder } from "./twitterLink";
import AnimatedLogoCloud from "./ImageSliders";

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
      <section className="mt-24 flex max-w-3xl flex-col items-center justify-center gap-10 md:mt-48">
        <TwitterBorder />
        <motion.h1
          {...{
            ...slap,
            transition: { ...slap.transition, delay: 0.2 },
          }}
          className="text-center  mx-auto bg-[linear-gradient(180deg,_#FFF_0%,_rgba(255,_255,_255,_0.00)_202.08%)]  bg-clip-text text-4xl tracking-tighter   text-transparent md:text-7xl"
        >
          Build your own second brain{" "}
          <span className="bg-gradient-to-r from-zinc-300 to-blue-200 bg-clip-text text-transparent">
            with supermemory and bring it at scale
          </span>
        </motion.h1>
        <motion.p
          {...{
            ...slap,
            transition: { ...slap.transition, delay: 0.3 },
          }}
          className="text-soft-foreground-text text-lg  text-center"
        >
          Bring saved information from all over the internet into one place
          where you can connect it, and ask AI about it
        </motion.p>
        <EmailInput />
      </section>
      <AnimatedLogoCloud />

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
        className="z-[20] mt-10 h-full w-[80%] select-none "
      />
    </>
  );
}

export default Hero;
