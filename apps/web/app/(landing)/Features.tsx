"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { X } from "@repo/ui/components/icons";

import { features } from "./FeatureContent";
import { CardClick } from "@repo/ui/components/cardClick";
import FUIFeatureSectionWithCards from "./FeatureCardContent";
import { cn } from "@repo/ui/lib/utils";
import { ArrowUpRight } from "lucide-react";
import { Gradient } from "./Features/features";

export default function Features() {
  const [tab, setTab] = useState<number>(0);

  const tabs = useRef<HTMLDivElement>(null);

  const heightFix = () => {
    if (tabs.current && tabs.current.parentElement)
      tabs.current.parentElement.style.height = `${tabs.current.clientHeight}px`;
  };

  function handleClickIndex(tab: number) {
    setTab(tab);
  }

  useEffect(() => {
    heightFix();
  }, []);

  return (
    <section className="overflow-hidden relative w-full max-lg:after:hidden mt-10">
      <img
        src="https://tailwindcss.com/_next/static/media/docs@30.8b9a76a2.avif"
        className="absolute -top-0 left-10 opacity-40 z-2"
      />
      {/* <div className="absolute top-0 z-0 w-screen left-0 right-0 mx-auto min-h-screen overflow-hidden bg-inherit  bg-[radial-gradient(ellipse_20%_80%_at_50%_-20%,rgba(120,119,198,0.3),rgba(255,255,255,0))]"></div> */}
      <div className="relative ">
        {/* <div className="-z-1 absolute inset-x-0 -top-0 h-screen  w-full bg-transparent bg-[linear-gradient(to_right,#f0f0f0_1px,transparent_1px),linear-gradient(to_bottom,#f0f0f0_1px,transparent_1px)]  bg-[size:6rem_4rem] opacity-5 [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_110%)]"></div> */}

        <div className="flex relative flex-col px-4 mx-auto max-w-screen-xl md:px-0">
          <div className="relative mx-auto mb-5 space-y-4 max-w-3xl text-center">
            <h2 className="pt-16 text-4xl tracking-tighter text-transparent bg-clip-text bg-gradient-to-tr via-white md:text-5xl lg:text-6xl font-nomral font-geist from-zinc-400/50 to-white/60">
              A Supermemory has all the memory saved for you
            </h2>

            <p className="text-zinc-400">
              Supermemory offers all the vital building blocks you need to
              transform your idea into a great-looking startup.
            </p>
            <button className="mx-auto flex gap-2 justify-center items-center py-2 px-10 mt-4 text-lg tracking-tighter text-center bg-gradient-to-br rounded-md ring-2 ring-offset-1 transition-all hover:ring-transparent group w-fit font-geist bg-page-gradient text-md from-zinc-400 to-zinc-700 text-zinc-50 ring-zinc-500/50 ring-offset-zinc-950/5 hover:scale-[1.02] active:scale-[0.98] active:ring-zinc-500/70">
              Get Started
              <div className="overflow-hidden relative ml-1 w-5 h-5">
                <ArrowUpRight className="absolute transition-all duration-500 group-hover:translate-x-4 group-hover:-translate-y-5" />
                <ArrowUpRight className="absolute transition-all duration-500 -translate-x-4 -translate-y-5 group-hover:translate-x-0 group-hover:translate-y-0" />
              </div>
            </button>
          </div>
          <FUIFeatureSectionWithCards />
          <div className="overflow-x-hidden overflow-y-hidden">
            <div
              className="absolute left-0 top-[60%] h-32 w-[90%] overflow-x-hidden bg-[rgb(54,157,253)] bg-opacity-20  blur-[337.4px]"
              style={{ transform: "rotate(-30deg)" }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

/*

<div className="py-12 pt-0 md:pb-32">
        <div
          id="use-cases"
          className="relative px-0 mx-auto max-w-3xl sm:px-4 md:pt-10 lg:px-0 lg:max-w-6xl"
        >
          <div className="space-y-12 lg:flex lg:space-y-0 lg:space-x-12 xl:space-x-24">
            <div className="lg:max-w-none lg:min-w-[524px]">
              <div className="mb-8">
                <div className="mb-4 inline-flex rounded-full border border-transparent px-4 py-0.5 text-sm font-medium text-zinc-400 [background:linear-gradient(theme(colors.zinc.800),theme(colors.zinc.800))_padding-box,linear-gradient(120deg,theme(colors.zinc.700),theme(colors.zinc.700/0),theme(colors.zinc.700))_border-box]">
                  Use cases
                </div>
                <h3 className="mb-4 text-3xl font-normal tracking-tighter text-zinc-200">
                  Save time and keep things organised
                </h3>
                <p className="text-lg text-zinc-500">
                  With Supermemory, it's really easy to save information from
                  all over the internet, while training your own AI to help you
                  do more with it.
                </p>
              </div>
              <div className="mb-8 space-y-2 md:mb-0">
                <CardClick
                  tab={tab}
                  items={features}
                  handleClickIndex={handleClickIndex}
                />
              </div>
            </div>

            <div className="relative lg:max-w-none">
              <div className="flex relative flex-col" ref={tabs}>
                <div
                  className="order-first transition-all duration-700 transform"
                  style={{
                    height: tab === 0 ? "auto" : 0,
                    opacity: tab === 0 ? 1 : 0,
                  }}
                >
                  <div>
                    <Image
                      className="mx-auto rounded-lg shadow-2xl lg:max-w-none"
                      src={"/images/carousel-illustration-01.png"}
                      width={700}
                      height={520}
                      alt="Carousel 01"
                    />
                  </div>
                </div>
                <div
                  className="order-first transition-all duration-700 transform"
                  style={{
                    height: tab === 1 ? "auto" : 0,
                    opacity: tab === 1 ? 1 : 0,
                    transform: tab === 1 ? "translateY(0)" : "translateY(4rem)",
                  }}
                >
                  <div>
                    <Image
                      className="mx-auto rounded-lg shadow-2xl lg:max-w-none"
                      src={"/images/carousel-illustration-01.png"}
                      width={700}
                      height={520}
                      alt="Carousel 02"
                    />
                  </div>
                </div>
                <div
                  className="order-first transition-all duration-700 transform"
                  style={{
                    height: tab === 2 ? "auto" : 0,
                    opacity: tab === 2 ? 1 : 0,
                    transform: tab === 2 ? "translateY(0)" : "translateY(4rem)",
                  }}
                >
                  <div>
                    <Image
                      className="mx-auto rounded-lg shadow-2xl lg:max-w-none"
                      src={"/images/carousel-illustration-01.png"}
                      width={700}
                      height={520}
                      alt="Carousel 03"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div
          id="features"
          className="px-4 mx-auto mt-24 max-w-6xl sm:px-6 md:pt-40"
        >
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3 lg:gap-16">
            <div>
              <div className="flex items-center mb-1">
                <X className="mr-2" />
                <h3 className="font-semibold font-inter-tight text-zinc-200">
                  Import all your Twitter bookmarks
                </h3>
              </div>
              <p className="text-sm text-zinc-500">
                Use all the knowledge you've saved on Twitter to train your own
                supermemory.
              </p>
            </div>
              <div className="flex items-center mb-1">
                <svg
                  className="mr-2 fill-zinc-400"
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                >
                  <path d="M13 16c-.153 0-.306-.035-.447-.105l-3.851-1.926c-.231.02-.465.031-.702.031-4.411 0-8-3.14-8-7s3.589-7 8-7 8 3.14 8 7c0 1.723-.707 3.351-2 4.63V15a1.003 1.003 0 0 1-1 1Zm-4.108-4.054c.155 0 .308.036.447.105L12 13.382v-2.187c0-.288.125-.562.341-.752C13.411 9.506 14 8.284 14 7c0-2.757-2.691-5-6-5S2 4.243 2 7s2.691 5 6 5c.266 0 .526-.02.783-.048a1.01 1.01 0 0 1 .109-.006Z" />
                </svg>
                <h3 className="font-semibold font-inter-tight text-zinc-200">
                  Chat with collections
                </h3>
              </div>
              <p className="text-sm text-zinc-500">
                Use collections to talk to specific knowledgebases like 'My
                twitter bookmarks', or 'Learning web development'
              </p>
            </div>
              <div className="flex items-center mb-1">
                <svg
                  className="mr-2 fill-zinc-400"
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                >
                  <path d="M7 14c-3.86 0-7-3.14-7-7s3.14-7 7-7 7 3.14 7 7-3.14 7-7 7ZM7 2C4.243 2 2 4.243 2 7s2.243 5 5 5 5-2.243 5-5-2.243-5-5-5Zm8.707 12.293a.999.999 0 1 1-1.414 1.414L11.9 13.314a8.019 8.019 0 0 0 1.414-1.414l2.393 2.393Z" />
                </svg>
                <h3 className="font-semibold font-inter-tight text-zinc-200">
                  Powerful search
                </h3>
              </div>
              <p className="text-sm text-zinc-500">
                Look up anything you've saved in your supermemory, and get the
                information you need in seconds.
              </p>
            </div>
            <div>
              <div className="flex items-center mb-1">
                <svg
                  className="mr-2 fill-zinc-400"
                  xmlns="http://www.w3.org/2000/svg"
                  width="14"
                  height="16"
                >
                  <path d="M13 0H1C.4 0 0 .4 0 1v14c0 .6.4 1 1 1h8l5-5V1c0-.6-.4-1-1-1ZM2 2h10v8H8v4H2V2Z" />
                </svg>
                <h3 className="font-semibold font-inter-tight text-zinc-200">
                  Knowledge canvas
                </h3>
              </div>
              <p className="text-sm text-zinc-500">
                Arrange your saved information in a way that makes sense to you
                in a 2d canvas.
              </p>
            </div>
            <div>
              <div className="flex items-center mb-1">
                <svg
                  className="mr-2 fill-zinc-400"
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                >
                  <path d="M14.6.085 8 2.885 1.4.085c-.5-.2-1.4-.1-1.4.9v11c0 .4.2.8.6.9l7 3c.3.1.5.1.8 0l7-3c.4-.2.6-.5.6-.9v-11c0-1-.9-1.1-1.4-.9ZM2 2.485l5 2.1v8.8l-5-2.1v-8.8Zm12 8.8-5 2.1v-8.7l5-2.1v8.7Z" />
                </svg>
                <h3 className="font-semibold font-inter-tight text-zinc-200">
                  Just... bookmarks
                </h3>
              </div>
              <p className="text-sm text-zinc-500">
                AI is cool, but sometimes you just need a place to save your
                stuff. Supermemory is that place.
              </p>
            </div>
            <div>
              <div className="flex items-center mb-1">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="mr-2 w-5 h-5 fill-zinc-400"
                >
                  <path d="m2.695 14.762-1.262 3.155a.5.5 0 0 0 .65.65l3.155-1.262a4 4 0 0 0 1.343-.886L17.5 5.501a2.121 2.121 0 0 0-3-3L3.58 13.419a4 4 0 0 0-.885 1.343Z" />
                </svg>
                <h3 className="font-semibold font-inter-tight text-zinc-200">
                  Writing assistant
                </h3>
              </div>
              <p className="text-sm text-zinc-500">
                Use our markdown editor to write content based on your saved
                data, with the help of AI.
              </p>
            </div>
          </div>
        </div>
      </div>
    */
