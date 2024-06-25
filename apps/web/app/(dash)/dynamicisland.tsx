"use client";

import { AddIcon } from "@repo/ui/icons";
import Image from "next/image";

import { AnimatePresence, useMotionValueEvent, useScroll } from "framer-motion";
import { useActionState, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Label } from "@repo/ui/shadcn/label";
import { Input } from "@repo/ui/shadcn/input";
import { Textarea } from "@repo/ui/shadcn/textarea";
import { createMemory, createSpace } from "../actions/doers";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/shadcn/select";
import { Space } from "../actions/types";
import { getSpaces } from "../actions/fetchers";
import { toast } from "sonner";
import { useFormStatus } from "react-dom";

export function DynamicIsland() {
  const { scrollYProgress } = useScroll();
  const [visible, setVisible] = useState(true);

  useMotionValueEvent(scrollYProgress, "change", (current) => {
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
    <div className="">
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
  function cancelfn() {
    setshow(true);
  }

  const lastBtn = useRef<string>();

  useEffect(() => {
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        setshow(true);
      }

      if (e.key === "a" && lastBtn.current === "Alt") {
        setshow(false);
      }
      lastBtn.current = e.key;
    });
  }, []);
  return (
    <>
      {show ? (
        <button
          onClick={() => setshow(!show)}
          className="bg-secondary p-2 text-[#989EA4] rounded-full flex items-center justify-between gap-2 px-4 h-10 pr-5 z-[999] shadow-md"
        >
          <Image src={AddIcon} alt="add icon" />
          Add content
        </button>
      ) : (
        <ToolBar cancelfn={cancelfn} />
      )}
    </>
  );
}

const fakeitems = ["spaces", "page", "note"];

function ToolBar({ cancelfn }: { cancelfn: () => void }) {
  const [spaces, setSpaces] = useState<Space[]>([]);

  const [index, setIndex] = useState(0);

  useEffect(() => {
    (async () => {
      let spaces = await getSpaces();

      if (!spaces.success || !spaces.data) {
        toast.warning("Unable to get spaces", {
          richColors: true,
        });
        setSpaces([]);
        return;
      }
      setSpaces(spaces.data);
    })();
  }, []);

  return (
    <AnimatePresence mode="wait">
      <motion.div
        initial={{
          opacity: 0,
          y: 20,
        }}
        animate={{
          y: 0,
          opacity: 1,
        }}
        exit={{
          opacity: 0,
          y: 20,
        }}
        transition={{
          duration: 0.2,
        }}
        className="flex flex-col items-center"
      >
        <div className="bg-secondary py-[.35rem] px-[.6rem] rounded-2xl">
          <HoverEffect
            items={fakeitems}
            index={index}
            indexFn={(i) => setIndex(i)}
          />
        </div>
        {index === 0 ? (
          <SpaceForm cancelfn={cancelfn} />
        ) : index === 1 ? (
          <PageForm cancelfn={cancelfn} spaces={spaces} />
        ) : (
          <NoteForm cancelfn={cancelfn} spaces={spaces} />
        )}
      </motion.div>
    </AnimatePresence>
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
    <div className={"flex"}>
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

function SpaceForm({ cancelfn }: { cancelfn: () => void }) {
  return (
    <form
      action={createSpace}
      className="bg-secondary border border-muted-foreground px-4 py-3 rounded-2xl mt-2 flex flex-col gap-3"
    >
      <div>
        <Label className="text-[#858B92]" htmlFor="name">
          Name
        </Label>
        <Input
          className="bg-[#2B3237] focus-visible:ring-0 border-none focus-visible:ring-offset-0"
          id="name"
          name="name"
        />
      </div>
      <div className="flex justify-between">
        <a className="text-blue-500" href="">
          pull from store
        </a>
        {/* <div
          onClick={cancelfn}
          className="bg-[#2B3237] px-2 py-1 rounded-xl cursor-pointer"
        >
          cancel
        </div> */}
        <button
          type="submit"
          className="bg-[#2B3237] px-2 py-1 rounded-xl cursor-pointer"
        >
          Submit
        </button>
      </div>
    </form>
  );
}

function PageForm({
  cancelfn,
  spaces,
}: {
  cancelfn: () => void;
  spaces: Space[];
}) {
  const [loading, setLoading] = useState(false);

  const { pending } = useFormStatus();
  return (
    <form
      action={async (e: FormData) => {
        const content = e.get("content")?.toString();
        const space = e.get("space")?.toString();

        toast.info("Creating memory...");

        if (!content) {
          toast.error("Content is required");
          return;
        }
        const cont = await createMemory({
          content: content,
          spaces: space ? [space] : undefined,
        });

        if (cont.success) {
          toast.success("Memory created");
        } else {
          toast.error("Memory creation failed");
        }

        cancelfn();
      }}
      className="bg-secondary border border-muted-foreground px-4 py-3 rounded-2xl mt-2 flex flex-col gap-3"
    >
      <div>
        <Label className="text-[#858B92]" htmlFor="space">
          Space
        </Label>
        <Select name="space">
          <SelectTrigger>
            <SelectValue placeholder="Space" />
          </SelectTrigger>
          <SelectContent className="bg-secondary text-white">
            {spaces.map((space) => (
              <SelectItem key={space.id} value={space.id.toString()}>
                {space.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label className="text-[#858B92]" htmlFor="name">
          Page Url
        </Label>
        <Input
          className="bg-[#2B3237] focus-visible:ring-0 border-none focus-visible:ring-offset-0"
          id="input"
          name="content"
        />
      </div>
      <div className="flex justify-end">
        <button
          type="submit"
          className="bg-[#2B3237] px-2 py-1 rounded-xl cursor-pointer"
        >
          Submit
        </button>
      </div>
    </form>
  );
}

function NoteForm({
  cancelfn,
  spaces,
}: {
  cancelfn: () => void;
  spaces: Space[];
}) {
  return (
    <div className="bg-secondary border border-muted-foreground px-4 py-3 rounded-2xl mt-2 flex flex-col gap-3">
      <div>
        <Label className="text-[#858B92]" htmlFor="name">
          Space
        </Label>
        <Select>
          <SelectTrigger>
            <SelectValue placeholder="Space" />
          </SelectTrigger>
          <SelectContent className="bg-secondary text-white">
            {spaces.map((space) => (
              <SelectItem key={space.id} value={space.id.toString()}>
                {space.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label className="text-[#858B92]" htmlFor="name">
          Note
        </Label>
        <Textarea
          cols={4}
          className="bg-[#2B3237] focus-visible:ring-0 border-none focus-visible:ring-offset-0 resize-none"
          id="name"
        />
      </div>
      <div className="flex justify-end">
        <div
          onClick={cancelfn}
          className="bg-[#2B3237] px-2 py-1 rounded-xl cursor-pointer"
        >
          cancel
        </div>
      </div>
    </div>
  );
}
