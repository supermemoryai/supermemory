"use client";

import { cn } from "@repo/ui/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import React from "react";

export const CardClick = ({
  tab,
  handleClickIndex,
  items,
}: {
  tab: number;
  handleClickIndex: (tab: number) => void;
  items: {
    title: string;
    description: string;
    svg: React.ReactNode;
  }[];
}) => {
  return (
    <div className={cn("flex flex-col")}>
      {items.map((item, idx) => (
        <div
          key={idx}
          className="group relative  block h-full w-full cursor-pointer rounded-2xl p-2  transition-all hover:border"
          onMouseDown={() => handleClickIndex(idx)}
        >
          <AnimatePresence>
            {tab === idx && (
              <motion.span
                className="absolute inset-0 -z-[1] block h-full w-full rounded-3xl [background:linear-gradient(#2E2E32,#2E2E32),linear-gradient(120deg,theme(colors.zinc.700),theme(colors.zinc.700/0),theme(colors.zinc.700))]"
                layoutId="hoverBackground"
                initial={{ opacity: 0 }}
                animate={{
                  opacity: 1,
                  transition: { duration: 0.15 },
                }}
                exit={{
                  opacity: 0,
                  transition: { duration: 0.15, delay: 0.2 },
                }}
              />
            )}
          </AnimatePresence>
          <Card
            title={item.title}
            description={item.description}
            svg={item.svg}
          />
        </div>
      ))}
    </div>
  );
};

export const Card = ({
  title,
  description,
  svg,
}: {
  title: string;
  description: string;
  svg: React.ReactNode;
}) => {
  return (
    <div
      className={`flex items-center rounded-2xl border border-transparent px-6 py-4 text-left`}
    >
      {svg}
      <div>
        <div className="font-inter-tight mb-1 text-lg font-semibold text-zinc-200">
          {title}
        </div>
        <div className="text-zinc-500">{description}</div>
      </div>
    </div>
  );
};
