"use client";
import { MemoryIcon } from "../../assets/Memories";
import React, { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { signOut, useSession } from "next-auth/react";
import MessagePoster from "@/app/MessagePoster";
import Link from "next/link";
import { SettingsTab } from "./SettingsTab";
import { Avatar, AvatarImage } from "@radix-ui/react-avatar";
import { AvatarFallback } from "../ui/avatar";

export type MenuItem = {
  icon: React.ReactNode | React.ReactNode[];
  label: string;
  content?: React.ReactNode;
  labelDisplay?: React.ReactNode;
};

export default function Sidebar({
  selectChange,
  jwt,
}: {
  selectChange?: (selectedItem: string | null) => void;
  jwt: string;
}) {
  const { data: session } = useSession();

  const [selectedItem, setSelectedItem] = useState<string | null>(null);

  const menuItemsTop: Array<MenuItem> = [];

  const menuItemsBottom: Array<MenuItem> = [
    {
      label: "Settings",
      content: <SettingsTab open={selectedItem !== null} />,
      icon: <></>,
    },
  ];

  const menuItems = [...menuItemsTop, ...menuItemsBottom];

  const Subbar = menuItems.find((i) => i.label === selectedItem)?.content ?? (
    <></>
  );

  useEffect(() => {
    void selectChange?.(selectedItem);
  }, [selectedItem]);

  return (
    <div className="relative hidden h-screen max-h-screen w-max flex-col items-center text-sm font-light md:flex">
      <div
        className={`relative z-[50] flex h-full w-full flex-col items-center justify-center border-r bg-stone-100 px-2 py-5 `}
      >
        <Link
          data-state-on={selectedItem === "Memories"}
          href="/"
          onClick={() => setSelectedItem(null)}
          className="focus-visible:ring-rgray-7 relative z-[100] flex w-full flex-col items-center justify-center rounded-md px-3 py-3 opacity-80 ring-2 ring-transparent transition hover:bg-stone-300 hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none"
        >
          <MemoryIcon className="h-12 w-12" />
          <span className="text-black">Memories</span>
        </Link>

        <div className="mt-auto" />

        <MenuItem
          item={{
            label: "Settings",
            icon: (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="white"
                viewBox="0 0 24 24"
                strokeWidth={0.5}
                stroke="black"
                className="h-10 w-10"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
                />
              </svg>
            ),
            content: <SettingsTab open={selectedItem !== null} />,
          }}
          selectedItem={selectedItem}
          setSelectedItem={setSelectedItem}
        />
        {/* <MessagePoster jwt={jwt} /> */}
        <div className="mt-4 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-b-md border-t border-stone-600 px-2 py-3 pt-4 text-black hover:bg-stone-300 hover:opacity-100">
          <Avatar>
            <AvatarImage
              className="h-10 w-10 rounded-full"
              src={session?.user?.image!}
              alt="Profile picture"
            />
            <AvatarFallback>
              {session?.user?.name?.split(" ").map((n) => n[0])}{" "}
            </AvatarFallback>
          </Avatar>
          <span>{session?.user?.name?.split(" ")[0]}</span>
        </div>
      </div>
      <AnimatePresence>
        {selectedItem && <SubSidebar>{Subbar}</SubSidebar>}
      </AnimatePresence>
    </div>
  );
}

const MenuItem = ({
  item: { icon, label, labelDisplay },
  selectedItem,
  setSelectedItem,
  ...props
}: {
  item: MenuItem;
  selectedItem: string | null;
  setSelectedItem: React.Dispatch<React.SetStateAction<string | null>>;
}) => {
  const handleClick = () =>
    setSelectedItem((prev) => (prev === label ? null : label));

  return (
    <button
      data-state-on={selectedItem === label}
      onClick={handleClick}
      className="on:opacity-100 on:bg-stone-300 focus-visible:ring-rgray-7 relative z-[100] flex w-full flex-col items-center justify-center rounded-md px-3 py-3 text-black opacity-80 ring-2 ring-transparent transition hover:bg-stone-300 hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none"
      {...props}
    >
      {icon}
      <span className="">{labelDisplay ?? label}</span>
    </button>
  );
};

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
      className="absolute left-[100%] top-0 z-[10] hidden h-screen w-[30vw] items-start justify-center overflow-x-hidden border-r bg-stone-100 font-light md:flex"
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
        <AnimatePresence>{children}</AnimatePresence>
      </motion.div>
    </motion.div>
  );
}
