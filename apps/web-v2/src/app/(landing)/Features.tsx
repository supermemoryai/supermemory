"use client";

import { useState, useRef, useEffect } from "react";
import { Transition } from "@headlessui/react";
import Image from "next/image";
import CarouselIllustration from "@/../public/images/carousel-illustration-01.png";
import { X } from "@/utils/icons";

export default function Features() {
  const [tab, setTab] = useState<number>(1);

  const tabs = useRef<HTMLDivElement>(null);

  const heightFix = () => {
    if (tabs.current && tabs.current.parentElement)
      tabs.current.parentElement.style.height = `${tabs.current.clientHeight}px`;
  };

  useEffect(() => {
    heightFix();
  }, []);

  return (
    <section className="relative w-full overflow-hidden after:pointer-events-none after:absolute after:right-0 after:top-0 after:h-full after:w-96 after:bg-gradient-to-l after:from-[#369DFD30] max-lg:after:hidden">
      <div className="py-12 md:py-20">
        {/* Carousel */}
        <div
          id="use-cases"
          className="mx-auto max-w-xl px-4 sm:px-6 lg:max-w-6xl"
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
                <button
                  className={`flex items-center rounded-2xl border border-transparent px-6 py-4 text-left ${tab !== 1 ? "" : "[background:linear-gradient(#2E2E32,#2E2E32)_padding-box,linear-gradient(120deg,theme(colors.zinc.700),theme(colors.zinc.700/0),theme(colors.zinc.700))_border-box]"}`}
                  onClick={(e) => {
                    e.preventDefault();
                    setTab(1);
                  }}
                >
                  <svg
                    className="mr-3 shrink-0 fill-zinc-400"
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                  >
                    <path d="m7.951 14.537 6.296-7.196 1.506 1.318-7.704 8.804-3.756-3.756 1.414-1.414 2.244 2.244Zm11.296-7.196 1.506 1.318-7.704 8.804-1.756-1.756 1.414-1.414.244.244 6.296-7.196Z" />
                  </svg>
                  <div>
                    <div className="font-inter-tight mb-1 text-lg font-semibold text-zinc-200">
                      For Researchers
                    </div>
                    <div className="text-zinc-500">
                      Add content to collections and use it as a knowledge base
                      for your research, link multiple sources together to get a
                      better understanding of the topic.
                    </div>
                  </div>
                </button>
                <button
                  className={`flex items-center rounded-2xl border border-transparent px-6 py-4 text-left ${tab !== 2 ? "" : "[background:linear-gradient(#2E2E32,#2E2E32)_padding-box,linear-gradient(120deg,theme(colors.zinc.700),theme(colors.zinc.700/0),theme(colors.zinc.700))_border-box]"}`}
                  onClick={(e) => {
                    e.preventDefault();
                    setTab(2);
                  }}
                >
                  <svg
                    className="mr-3 shrink-0 fill-zinc-400"
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                  >
                    <path d="m16.997 19.056-1.78-.912A13.91 13.91 0 0 0 16.75 11.8c0-2.206-.526-4.38-1.533-6.344l1.78-.912A15.91 15.91 0 0 1 18.75 11.8c0 2.524-.602 5.01-1.753 7.256Zm-3.616-1.701-1.77-.93A9.944 9.944 0 0 0 12.75 11.8c0-1.611-.39-3.199-1.14-4.625l1.771-.93c.9 1.714 1.37 3.62 1.369 5.555 0 1.935-.47 3.841-1.369 5.555Zm-3.626-1.693-1.75-.968c.49-.885.746-1.881.745-2.895a5.97 5.97 0 0 0-.745-2.893l1.75-.968a7.968 7.968 0 0 1 .995 3.861 7.97 7.97 0 0 1-.995 3.863Zm-3.673-1.65-1.664-1.11c.217-.325.333-.709.332-1.103 0-.392-.115-.776-.332-1.102L6.082 9.59c.437.655.67 1.425.668 2.21a3.981 3.981 0 0 1-.668 2.212Z" />
                  </svg>
                  <div>
                    <div className="font-inter-tight mb-1 text-lg font-semibold text-zinc-200">
                      For Content writers
                    </div>
                    <div className="text-zinc-500">
                      Save time and use the writing assistant to generate
                      content based on your own saved collections and sources.
                    </div>
                  </div>
                </button>
                <button
                  className={`flex items-center rounded-2xl border border-transparent px-6 py-4 text-left ${tab !== 3 ? "" : "[background:linear-gradient(#2E2E32,#2E2E32)_padding-box,linear-gradient(120deg,theme(colors.zinc.700),theme(colors.zinc.700/0),theme(colors.zinc.700))_border-box]"}`}
                  onClick={(e) => {
                    e.preventDefault();
                    setTab(3);
                  }}
                >
                  <svg
                    className="mr-3 shrink-0 fill-zinc-400"
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                  >
                    <path d="m11.293 5.293 1.414 1.414-8 8-1.414-1.414 8-8Zm7-1 1.414 1.414-8 8-1.414-1.414 8-8Zm0 6 1.414 1.414-8 8-1.414-1.414 8-8Z" />
                  </svg>
                  <div>
                    <div className="font-inter-tight mb-1 text-lg font-semibold text-zinc-200">
                      For Developers
                    </div>
                    <div className="text-zinc-500">
                      Talk to documentation websites, code snippets, etc. so you
                      never have to google the same thing a hundred times.
                    </div>
                  </div>
                </button>
              </div>
            </div>

            {/* Tabs items */}
            <div className="relative lg:max-w-none">
              <div className="relative flex flex-col" ref={tabs}>
                {/* Item 1 */}
                <Transition
                  show={tab === 1}
                  enter="transition ease-in-out duration-700 transform order-first"
                  enterFrom="opacity-0 -translate-y-4"
                  enterTo="opacity-100 translate-y-0"
                  leave="transition ease-in-out duration-300 transform absolute"
                  leaveFrom="opacity-100 translate-y-0"
                  leaveTo="opacity-0 translate-y-4"
                  beforeEnter={() => heightFix()}
                  unmount={false}
                >
                  <div>
                    <Image
                      className="mx-auto rounded-lg shadow-2xl lg:max-w-none"
                      src={CarouselIllustration}
                      width={700}
                      height={520}
                      alt="Carousel 01"
                    />
                  </div>
                </Transition>
                {/* Item 2 */}
                <Transition
                  show={tab === 2}
                  enter="transition ease-in-out duration-700 transform order-first"
                  enterFrom="opacity-0 -translate-y-4"
                  enterTo="opacity-100 translate-y-0"
                  leave="transition ease-in-out duration-300 transform absolute"
                  leaveFrom="opacity-100 translate-y-0"
                  leaveTo="opacity-0 translate-y-4"
                  beforeEnter={() => heightFix()}
                  unmount={false}
                >
                  <div>
                    <Image
                      className="mx-auto rounded-lg shadow-2xl lg:max-w-none"
                      src={CarouselIllustration}
                      width={700}
                      height={520}
                      alt="Carousel 02"
                    />
                  </div>
                </Transition>
                {/* Item 3 */}
                <Transition
                  show={tab === 3}
                  enter="transition ease-in-out duration-700 transform order-first"
                  enterFrom="opacity-0 -translate-y-4"
                  enterTo="opacity-100 translate-y-0"
                  leave="transition ease-in-out duration-300 transform absolute"
                  leaveFrom="opacity-100 translate-y-0"
                  leaveTo="opacity-0 translate-y-4"
                  beforeEnter={() => heightFix()}
                  unmount={false}
                >
                  <div>
                    <Image
                      className="mx-auto rounded-lg shadow-2xl lg:max-w-none"
                      src={CarouselIllustration}
                      width={700}
                      height={520}
                      alt="Carousel 03"
                    />
                  </div>
                </Transition>
              </div>
            </div>
          </div>
        </div>

        {/* Features blocks */}
        <div
          id="features"
          className="mx-auto mt-24 max-w-6xl px-4 sm:px-6 lg:mt-32"
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
