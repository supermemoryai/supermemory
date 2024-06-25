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
      <section className="flex relative flex-col gap-5 justify-center items-center mt-24 max-w-xl md:mt-32 md:max-w-2xl lg:max-w-3xl">
        <TwitterBorder />
        <motion.h1
          {...{
            ...slap,
            transition: { ...slap.transition, delay: 0.2 },
          }}
          className="text-center  mx-auto bg-[linear-gradient(180deg,_#FFF_0%,_rgba(255,_255,_255,_0.00)_202.08%)]  bg-clip-text text-4xl tracking-tighter   text-transparent md:text-7xl"
        >
          Build your own second brain{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r to-blue-200 from-zinc-300">
            with supermemory and bring it at scale
          </span>
        </motion.h1>
        <motion.p
          {...{
            ...slap,
            transition: { ...slap.transition, delay: 0.3 },
          }}
          className="text-lg text-center text-soft-foreground-text"
        >
          Bring saved information from all over the internet into one place
          where you can connect it, and ask AI about it
        </motion.p>
        <EmailInput />
      </section>

      <AnimatedLogoCloud />
      <div className="relative z-20">
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
          className="z-40 md:mt-[-40px] hidden sm:block h-full w-[80%] mx-auto md:w-full select-none px-5"
        />
        <div
          className="absolute -z-10 left-0 top-[10%] h-32 w-[90%] overflow-x-hidden bg-[rgb(54,157,253)] bg-opacity-100  blur-[337.4px]"
          style={{ transform: "rotate(-30deg)" }}
        />
      </div>
    </>
  );
}

export default Hero;
