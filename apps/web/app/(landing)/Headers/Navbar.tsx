import React, { useRef, useState } from "react";
import { motion } from "framer-motion";
import Logo from "../../../public/logo.svg";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
export const SlideNavTabs = () => {
  return (
    <div className="fixed right-0 left-0 top-5 z-30 mx-auto text-white bg-transparent">
      <SlideTabs />
    </div>
  );
};

const SlideTabs = () => {
  const [position, setPosition] = useState({
    left: 0,
    width: 0,
    opacity: 0,
  });

  return (
    <ul
      onMouseLeave={() => {
        setPosition((pv) => ({
          ...pv,
          opacity: 0,
        }));
      }}
      className="flex relative items-center py-3 px-5 mx-auto text-sm text-gray-200 bg-gradient-to-tr to-transparent rounded-full border-2 w-fit border-white/5 from-zinc-300/5 via-gray-400/5 shadow-[0px_2px_3px_-1px_rgba(0,0,0,0.1),0px_1px_0px_0px_rgba(25,28,33,0.02),0px_0px_0px_1px_rgba(25,28,33,0.08)] backdrop-blur-lg backdrop-filter"
    >
      <Link href={"/"} className="flex items-start h-fit opacity-50 mr-4">
        <Image src={Logo} alt="Supermemory logo" width={40} height={40} />
      </Link>

      <Tab setPosition={setPosition}>Home</Tab>
      <Tab setPosition={setPosition}>Pricing</Tab>
      <Tab setPosition={setPosition}>Features</Tab>
      <Tab setPosition={setPosition}>Docs</Tab>
      <Tab setPosition={setPosition}>Blog</Tab>

      <button className="group ml-3 group inline-flex w-full bg-page-gradient justify-start items-start gap-x-2 border border-white/30 hover:border-zinc-600 hover:bg-transparent/10 hover:text-zinc-100 duration-200 sm:w-auto py-3 px-5 rounded-3xl text-md font-geistSans">
        Join waitlist
        <ArrowUpRight className="w-5 h-5 inline-flex justify-center items-center group-hover:-translate-y-1 transition-transform duration-400"/>
      </button>

      <Cursor position={position} />
    </ul>
  );
};
// @ts-ignore
const Tab = ({ children, setPosition }) => {
  const ref = useRef(null);

  return (
    <li
      ref={ref}
      onMouseEnter={() => {
        if (!ref?.current) return;
        // @ts-ignore
        const { width } = ref.current.getBoundingClientRect();

        setPosition({
          // @ts-ignore
          left: ref.current.offsetLeft,
          width,
          opacity: 1,
        });
      }}
      className="block relative z-10 py-2.5 px-3 text-xs text-white uppercase cursor-pointer md:py-2 md:px-5 md:text-base mix-blend-difference"
    >
      {children}
    </li>
  );
};
// @ts-ignore
const Cursor = ({ position }) => {
  return (
    <motion.li
      animate={{
        ...position,
      }}
      className="absolute z-0 h-7 bg-page-gradient bg-white/20 rounded-full md:h-10  shadow-[0px_2px_3px_-1px_rgba(0,0,0,0.1),0px_1px_0px_0px_rgba(25,28,33,0.02),0px_0px_0px_1px_rgba(25,28,33,0.08)] backdrop-blur-lg backdrop-filter"
    />
  );
};
