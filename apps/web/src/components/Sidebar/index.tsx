"use client";
import { StoredContent } from "@/server/db/schema";
import { MemoryIcon } from "../../assets/Memories";
import { Trash2, User2 } from "lucide-react";
import React, { useState } from "react";
import { MemoriesBar } from "./MemoriesBar";
import { AnimatePresence, motion } from "framer-motion";

export type MenuItem = {
  icon: React.ReactNode | React.ReactNode[];
  label: string;
  content?: React.FC;
};

const menuItemsTop: Array<MenuItem> = [
  {
    icon: <MemoryIcon className="h-10 w-10" />,
    label: "Memories",
    content: MemoriesBar,
  },
];

const menuItemsBottom: Array<MenuItem> = [
  {
    icon: <Trash2 strokeWidth={1.3} className="h-6 w-6" />,
    label: "Trash",
  },
  {
    icon: <User2 strokeWidth={1.3} className="h-6 w-6" />,
    label: "Profile",
  },
];

export default function Sidebar({
  onSelectChange,
}: {
  onSelectChange?: (selectedItem: string | null) => void;
}) {
  const menuItems = [...menuItemsTop, ...menuItemsBottom];
  const [selectedItem, setSelectedItem] = useState<string | null>(null);

  React.useEffect(() => {
    onSelectChange?.(selectedItem);
  }, [selectedItem]);

  const Subbar =
    menuItems.find((i) => i.label === selectedItem)?.content ?? (() => <></>);

  return (
    <>
      <div className="relative hidden h-screen max-h-screen w-max flex-col items-center text-sm font-light md:flex">
        <div className="bg-rgray-2 border-r-rgray-6 relative z-[10000] flex h-full w-full flex-col items-center justify-center border-r px-2 py-5 ">
          {menuItemsTop.map((item, index) => (
            <MenuItem
              key={index}
              item={item}
              selectedItem={selectedItem}
              setSelectedItem={setSelectedItem}
            />
          ))}
          <div className="mt-auto" />
          {menuItemsBottom.map((item, index) => (
            <MenuItem
              key={index}
              item={item}
              selectedItem={selectedItem}
              setSelectedItem={setSelectedItem}
            />
          ))}
        </div>
        <AnimatePresence>
          {selectedItem && (
            <SubSidebar>
              <Subbar />
            </SubSidebar>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}

const MenuItem = ({
  item: { icon, label },
  selectedItem,
  setSelectedItem,
}: {
  item: MenuItem;
  selectedItem: string | null;
  setSelectedItem: React.Dispatch<React.SetStateAction<string | null>>;
}) => (
  <button
    data-state-on={selectedItem === label}
    onClick={() => setSelectedItem((prev) => (prev === label ? null : label))}
    className="on:opacity-100 on:bg-rgray-4 focus-visible:ring-rgray-7 relative z-[100] flex w-full flex-col items-center justify-center rounded-md px-3 py-3 opacity-80 ring-2 ring-transparent transition hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none"
  >
    {icon}
    <span className="">{label}</span>
  </button>
);

export function SubSidebar({ children }: { children?: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: "-100%" }}
      animate={{ opacity: 1, x: 0 }}
      exit={{
        opacity: 0,
        x: "-100%",
        transition: { delay: 0.2 },
      }}
      transition={{
        duration: 0.2,
      }}
      className="bg-rgray-3 border-r-rgray-6 absolute left-[100%] top-0 z-[10] hidden h-screen w-[30vw] items-start justify-center overflow-x-hidden border-r font-light md:flex"
    >
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0, transition: { delay: 0 } }}
        transition={{
          delay: 0.2,
        }}
        className="z-[10] flex h-full w-full min-w-full flex-col items-center opacity-0"
      >
        {children}
      </motion.div>
    </motion.div>
  );
}
