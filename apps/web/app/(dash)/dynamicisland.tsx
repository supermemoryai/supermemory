"use client";

import { AddIcon } from "@repo/ui/icons";
import Image from "next/image";

import { AnimatePresence, useMotionValueEvent, useScroll } from "framer-motion";
import { useState } from "react";
import { motion } from "framer-motion";
import { Label } from "@repo/ui/shadcn/label";
import { Input } from "@repo/ui/shadcn/input";
import { Textarea } from "@repo/ui/shadcn/textarea";

export function DynamicIsland() {
  const { scrollYProgress } = useScroll();
  const [visible, setVisible] = useState(true);

  useMotionValueEvent(scrollYProgress, "change", (current) => {
    // Check if current is not undefined and is a number
    if (typeof current === "number") {
      let direction = current! - scrollYProgress.getPrevious()!;

      if (direction < 0 || direction === 1) {
        setVisible(true);
      } else {
        setVisible(false);
      }
    }
  });

  return (
    <div className="fixed z-40 left-1/2 -translate-x-1/2 top-12">
      <AnimatePresence mode="wait">
        <motion.div
          initial={{
            opacity: 1,
            y: -150,
          }}
          animate={{
            y: visible ? 0 : -150,
            opacity: visible ? 1 : 0,
          }}
          transition={{
            duration: 0.2,
          }}
          className="flex flex-col items-center"
        >
          <DynamicIslandContent />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

export default DynamicIsland;

function DynamicIslandContent() {
  const [show, setshow] = useState(true);
  function cancelfn(){
    setshow(true);
  }
  return (
    <>
      {show ? (
        <div
          onClick={() => setshow(!show)}
          className="bg-[#1F2428] p-2 rounded-3xl"
        >
          <Image src={AddIcon} alt="Add icon" />
        </div>
      ) : (
        <div>
          <ToolBar cancelfn={cancelfn} />
        </div>
      )}
    </>
  );
}

const fakeitems = ["spaces", "page", "note"];

function ToolBar({cancelfn}: {cancelfn: ()=> void}) {
  const [index, setIndex] = useState(0);
  return (
    <div className="flex flex-col items-center">
      <div className="bg-[#1F2428] py-[.35rem] px-[.6rem] rounded-2xl">
        <HoverEffect
          items={fakeitems}
          index={index}
          indexFn={(i) => setIndex(i)}
        />
      </div>
      { index === 0 ?
        <SpaceForm cancelfn={cancelfn} /> :
        index === 1 ?
        <PageForm  cancelfn={cancelfn} /> :
        <NoteForm cancelfn={cancelfn} />
      }
    </div>
  );
}

export const HoverEffect = ({
  items,
  index,
  indexFn,
}: {
  items: string[];
  index: number;
  indexFn: (i: number) => void;
}) => {
  return (
    <div className={"grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3"}>
      {items.map((item, idx) => (
        <button
          key={idx}
          className="relative block h-full w-full px-2 py-1"
          onClick={() => indexFn(idx)}
        >
          <AnimatePresence>
            {index === idx && (
              <motion.span
                className="absolute inset-0 block h-full w-full rounded-xl bg-[#2B3237]"
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
          <h3 className="text-[#858B92] z-50 relative">{item}</h3>
        </button>
      ))}
    </div>
  );
};

function SpaceForm({cancelfn}: {cancelfn: ()=> void}) {
  return (
    <div className="bg-[#1F2428] px-4 py-3 rounded-2xl mt-2 flex flex-col gap-3">
      <div >
        <Label className="text-[#858B92]" htmlFor="name">Name</Label>
        <Input className="bg-[#2B3237] outline-none border-none focus:border-none focus:outline-none" id="name"/>
      </div>
      <div className="flex justify-between">
        <a className="text-blue-500" href="">
          pull from store
        </a>
        <div onClick={cancelfn} className="bg-[#2B3237] px-2 py-1 rounded-xl cursor-pointer">cancel</div>
      </div>
    </div>
  );
}

function PageForm({cancelfn}: {cancelfn: ()=> void}) {
  return (
    <div className="bg-[#1F2428] px-4 py-3 rounded-2xl mt-2 flex flex-col gap-3">
    <div >
      <Label className="text-[#858B92]" htmlFor="name">Space</Label>
      <Input className="bg-[#2B3237] outline-none border-none focus:border-none focus:outline-none" id="name"/>
    </div>
    <div >
      <Label className="text-[#858B92]" htmlFor="name">Page Url</Label>
      <Input className="bg-[#2B3237] outline-none border-none focus:border-none focus:outline-none" id="name"/>
    </div>
    <div className="flex justify-end">
      <div onClick={cancelfn} className="bg-[#2B3237] px-2 py-1 rounded-xl cursor-pointer">cancel</div>
    </div>
  </div>
  );
}

function NoteForm({cancelfn}: {cancelfn: ()=> void}) {
  return (
    <div className="bg-[#1F2428] px-4 py-3 rounded-2xl mt-2 flex flex-col gap-3">
    <div >
      <Label className="text-[#858B92]" htmlFor="name">Space</Label>
      <Input className="bg-[#2B3237] outline-none border-none focus:border-none focus:outline-none" id="name"/>
    </div>
    <div >
      <Label className="text-[#858B92]" htmlFor="name">Note</Label>
      <Textarea cols={4} className="bg-[#2B3237] outline-none border-none resize-none" id="name"/>
    </div>
    <div className="flex justify-end">
      <div onClick={cancelfn} className="bg-[#2B3237] px-2 py-1 rounded-xl cursor-pointer">cancel</div>
    </div>
  </div>
  );
}