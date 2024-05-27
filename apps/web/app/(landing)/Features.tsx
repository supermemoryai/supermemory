"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { X } from "@repo/ui/components/icons";

import { features } from "./FeatureContent";
import { CardClick } from "@repo/ui/components/cardClick";

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
    <section className="relative w-full overflow-hidden max-lg:after:hidden">
      <div className="py-12 md:pb-32">
        {/* Carousel */}
        <div
          id="use-cases"
          className="mx-auto max-w-xl px-4 sm:px-6 md:pt-40 lg:max-w-6xl"
        >
          <div className="space-y-12 lg:flex lg:space-x-12 lg:space-y-0 xl:space-x-24">
            {/* Content */}
            <div className="lg:min-w-[524px] lg:max-w-none">
              <div className="mb-8">
                <div className="mb-4 inline-flex rounded-full border border-transparent px-4 py-0.5 text-sm font-medium text-zinc-400 [background:linear-gradient(theme(colors.zinc.800),theme(colors.zinc.800))_padding-box,linear-gradient(120deg,theme(colors.zinc.700),theme(colors.zinc.700/0),theme(colors.zinc.700))_border-box]">
                  Use cases
                </div>
                <h3 className="font-inter-tight mb-4 text-3xl font-bold text-zinc-200">
                  Save time and keep things organised
                </h3>
                <p className="text-lg text-zinc-500">
                  With Supermemory, it's really easy to save information from
                  all over the internet, while training your own AI to help you
                  do more with it.
                </p>
              </div>
              {/* Tabs buttons */}
              <div className="mb-8 space-y-2 md:mb-0">
                <CardClick
                  tab={tab}
                  items={features}
                  handleClickIndex={handleClickIndex}
                />
              </div>
            </div>

            {/* Tabs items */}
            <div className="relative lg:max-w-none">
              <div className="relative flex flex-col" ref={tabs}>
                {/* Item 1 */}
                <div
                  className="transition-all duration-700 transform order-first"
                  style={{
                    height: tab === 0 ? "auto" : 0,
                    opacity: tab === 0 ? 1 : 0,
                    // transform: tab === 0 ? 'translateY(0)' : 'translateY(4rem)',
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
                {/* Item 2 */}
                <div
                  className="transition-all duration-700 transform order-first"
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
                {/* Item 3 */}
                <div
                  className="transition-all duration-700 transform order-first"
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

        {/* Features blocks */}
        <div
          id="features"
          className="mx-auto mt-24 max-w-6xl px-4 sm:px-6 md:pt-40"
        >
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3 lg:gap-16">
            {/* Block #1 */}
            <div>
              <div className="mb-1 flex items-center">
                <X className="mr-2" />
                <h3 className="font-inter-tight font-semibold text-zinc-200">
                  Import all your Twitter bookmarks
                </h3>
              </div>
              <p className="text-sm text-zinc-500">
                Use all the knowledge you've saved on Twitter to train your own
                supermemory.
              </p>
            </div>
            {/* Block #2 */}
            <div>
              <div className="mb-1 flex items-center">
                <svg
                  className="mr-2 fill-zinc-400"
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                >
                  <path d="M13 16c-.153 0-.306-.035-.447-.105l-3.851-1.926c-.231.02-.465.031-.702.031-4.411 0-8-3.14-8-7s3.589-7 8-7 8 3.14 8 7c0 1.723-.707 3.351-2 4.63V15a1.003 1.003 0 0 1-1 1Zm-4.108-4.054c.155 0 .308.036.447.105L12 13.382v-2.187c0-.288.125-.562.341-.752C13.411 9.506 14 8.284 14 7c0-2.757-2.691-5-6-5S2 4.243 2 7s2.691 5 6 5c.266 0 .526-.02.783-.048a1.01 1.01 0 0 1 .109-.006Z" />
                </svg>
                <h3 className="font-inter-tight font-semibold text-zinc-200">
                  Chat with collections
                </h3>
              </div>
              <p className="text-sm text-zinc-500">
                Use collections to talk to specific knowledgebases like 'My
                twitter bookmarks', or 'Learning web development'
              </p>
            </div>
            {/* Block #3 */}
            <div>
              <div className="mb-1 flex items-center">
                <svg
                  className="mr-2 fill-zinc-400"
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                >
                  <path d="M7 14c-3.86 0-7-3.14-7-7s3.14-7 7-7 7 3.14 7 7-3.14 7-7 7ZM7 2C4.243 2 2 4.243 2 7s2.243 5 5 5 5-2.243 5-5-2.243-5-5-5Zm8.707 12.293a.999.999 0 1 1-1.414 1.414L11.9 13.314a8.019 8.019 0 0 0 1.414-1.414l2.393 2.393Z" />
                </svg>
                <h3 className="font-inter-tight font-semibold text-zinc-200">
                  Powerful search
                </h3>
              </div>
              <p className="text-sm text-zinc-500">
                Look up anything you've saved in your supermemory, and get the
                information you need in seconds.
              </p>
            </div>
            {/* Block #4 */}
            <div>
              <div className="mb-1 flex items-center">
                <svg
                  className="mr-2 fill-zinc-400"
                  xmlns="http://www.w3.org/2000/svg"
                  width="14"
                  height="16"
                >
                  <path d="M13 0H1C.4 0 0 .4 0 1v14c0 .6.4 1 1 1h8l5-5V1c0-.6-.4-1-1-1ZM2 2h10v8H8v4H2V2Z" />
                </svg>
                <h3 className="font-inter-tight font-semibold text-zinc-200">
                  Knowledge canvas
                </h3>
              </div>
              <p className="text-sm text-zinc-500">
                Arrange your saved information in a way that makes sense to you
                in a 2d canvas.
              </p>
            </div>
            {/* Block #5 */}
            <div>
              <div className="mb-1 flex items-center">
                <svg
                  className="mr-2 fill-zinc-400"
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                >
                  <path d="M14.6.085 8 2.885 1.4.085c-.5-.2-1.4-.1-1.4.9v11c0 .4.2.8.6.9l7 3c.3.1.5.1.8 0l7-3c.4-.2.6-.5.6-.9v-11c0-1-.9-1.1-1.4-.9ZM2 2.485l5 2.1v8.8l-5-2.1v-8.8Zm12 8.8-5 2.1v-8.7l5-2.1v8.7Z" />
                </svg>
                <h3 className="font-inter-tight font-semibold text-zinc-200">
                  Just... bookmarks
                </h3>
              </div>
              <p className="text-sm text-zinc-500">
                AI is cool, but sometimes you just need a place to save your
                stuff. Supermemory is that place.
              </p>
            </div>
            {/* Block #6 */}
            <div>
              <div className="mb-1 flex items-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="mr-2 h-5 w-5 fill-zinc-400"
                >
                  <path d="m2.695 14.762-1.262 3.155a.5.5 0 0 0 .65.65l3.155-1.262a4 4 0 0 0 1.343-.886L17.5 5.501a2.121 2.121 0 0 0-3-3L3.58 13.419a4 4 0 0 0-.885 1.343Z" />
                </svg>
                <h3 className="font-inter-tight font-semibold text-zinc-200">
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
    </section>
  );
}
