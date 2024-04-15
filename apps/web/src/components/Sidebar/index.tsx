"use client";
import { MemoryIcon } from "../../assets/Memories";
import { Box, LogOut, Trash2, User2 } from "lucide-react";
import React, { useEffect, useState } from "react";
import { MemoriesBar } from "./MemoriesBar";
import { AnimatePresence, motion } from "framer-motion";
import { Bin } from "@/assets/Bin";
import { Avatar, AvatarFallback, AvatarImage } from "@radix-ui/react-avatar";
import { signOut, useSession } from "next-auth/react";
import MessagePoster from "@/app/MessagePoster";
import Chrome from "@/lib/icons";

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

  const menuItemsTop: Array<MenuItem> = [
    {
      icon: <MemoryIcon className="h-10 w-10" />,
      label: "Memories",
      content: <MemoriesBar isOpen={selectedItem !== null} />,
    },
  ];

  const menuItemsBottom: Array<MenuItem> = [
    {
      icon: <Trash2 strokeWidth={1.3} className="h-6 w-6" />,
      label: "Trash",
    },
    {
      icon: (
        <div>
          <Avatar>
            {session?.user?.image ? (
              <AvatarImage
                className="h-6 w-6 rounded-full"
                src={session?.user?.image}
                alt="user pfp"
              />
            ) : (
              <User2 strokeWidth={1.3} className="h-6 w-6" />
            )}
            <AvatarFallback>
              {session?.user?.name?.split(" ").map((n) => n[0])}{" "}
            </AvatarFallback>
          </Avatar>
        </div>
      ),
      label: "Profile",
      content: <ProfileTab open={selectedItem !== null} />,
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
    <>
      <div className="relative hidden h-screen max-h-screen w-max flex-col items-center text-sm font-light md:flex">
        <div className="bg-rgray-3 border-r-rgray-6 relative z-[50] flex h-full w-full flex-col items-center justify-center border-r px-2 py-5 ">
          <MenuItem
            item={{
              label: "Memories",
              icon: <MemoryIcon className="h-10 w-10" />,
              content: <MemoriesBar isOpen={selectedItem !== null} />,
            }}
            selectedItem={selectedItem}
            setSelectedItem={setSelectedItem}
          />
          <div className="mt-auto" />
          {/*
          <MenuItem
            item={{
              label: "Trash",
              icon: <Bin id="trash" className="z-[300] h-7 w-7" />,
            }}
            selectedItem={selectedItem}
            id="trash-button"
            setSelectedItem={setSelectedItem}
          />
					*/}
          <MenuItem
            item={{
              label: "Profile",
              icon: (
                <div className="mb-2">
                  <Avatar>
                    {session?.user?.image ? (
                      <AvatarImage
                        className="h-6 w-6 rounded-full"
                        src={session?.user?.image}
                        alt="@shadcn"
                      />
                    ) : (
                      <User2 strokeWidth={1.3} className="h-6 w-6" />
                    )}
                    <AvatarFallback>
                      {session?.user?.name?.split(" ").map((n) => n[0])}{" "}
                    </AvatarFallback>
                  </Avatar>
                </div>
              ),
              content: <ProfileTab open={selectedItem !== null} />,
            }}
            selectedItem={selectedItem}
            setSelectedItem={setSelectedItem}
          />
          <a
            className="mb-4 flex items-center justify-center p-2 text-center text-sm text-sky-500"
            href="https://chromewebstore.google.com/detail/supermemory/afpgkkipfdpeaflnpoaffkcankadgjfc?hl=en-GB&authuser=0"
          >
            <Chrome className="h-6 w-6" />
          </a>
          <MessagePoster jwt={jwt} />
        </div>
        <AnimatePresence>
          {selectedItem && <SubSidebar>{Subbar}</SubSidebar>}
        </AnimatePresence>
      </div>
    </>
  );
}

const MenuItem = ({
  item: { icon, label, labelDisplay },
  selectedItem,
  setSelectedItem,
  ...props
}: React.HTMLAttributes<HTMLButtonElement> & {
  item: MenuItem;
  selectedItem: string | null;
  setSelectedItem: React.Dispatch<React.SetStateAction<string | null>>;
}) => (
  <button
    data-state-on={selectedItem === label}
    onClick={() => setSelectedItem((prev) => (prev === label ? null : label))}
    className="on:opacity-100 on:bg-rgray-4 focus-visible:ring-rgray-7 relative z-[100] flex w-full flex-col items-center justify-center rounded-md px-3 py-3 opacity-80 ring-2 ring-transparent transition hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none"
    {...props}
  >
    {icon}
    <span className="">{labelDisplay ?? label}</span>
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
        <AnimatePresence>{children}</AnimatePresence>
      </motion.div>
    </motion.div>
  );
}

export function ProfileTab({ open }: { open: boolean }) {
  const { data: session } = useSession();

  const [tweetStat, setTweetStat] = useState<[number, number] | null>();
  const [memoryStat, setMemoryStat] = useState<[number, number] | null>();

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/getCount").then(async (resp) => {
      const data = (await resp.json()) as any;
      setTweetStat([data.tweetsCount, data.tweetsLimit]);
      setMemoryStat([data.pageCount, data.pageLimit]);
      setLoading(false);
    });
  }, [open]);

  return (
    <div className="text-rgray-11 flex h-full w-full flex-col items-start py-3 text-left font-normal md:py-8">
      <div className="w-full px-6">
        <h1 className="w-full text-2xl font-medium">Profile</h1>
        <div className="mt-5 grid w-full grid-cols-3 gap-1">
          <img
            className="rounded-full"
            src={session?.user?.image ?? "/icons/white_without_bg.png"}
            onError={(e) => {
              (e.target as HTMLImageElement).src =
                "/icons/white_without_bg.png";
            }}
          />
          <div className="col-span-2 flex flex-col items-start justify-center">
            <h1 className="text-xl font-medium">{session?.user?.name}</h1>
            <span>{session?.user?.email}</span>
            <button
              onClick={() => signOut()}
              className="bg-rgray-4 hover:bg-rgray-5 focus-visible:bg-rgray-5 focus-visible:ring-rgray-7 relative mt-auto flex items-center justify-center gap-2 rounded-md px-4 py-2 ring-transparent transition focus-visible:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-70"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </button>
          </div>
        </div>
      </div>
      <div className="border-rgray-5 mt-auto w-full border-t px-8 pt-8">
        <h1 className="flex w-full items-center gap-2 text-xl">
          <Box className="h-6 w-6" />
          Storage
        </h1>
        {loading ? (
          <div className="my-5 flex w-full flex-col items-center justify-center gap-5">
            <div className="bg-rgray-5 h-6 w-full animate-pulse rounded-md text-lg"></div>
            <div className="bg-rgray-5 h-6 w-full animate-pulse rounded-md text-lg"></div>
          </div>
        ) : (
          <>
            <div className="my-5">
              <h2 className="text-md flex w-full items-center justify-between">
                Memories
                <div className="bg-rgray-4 flex rounded-md px-2 py-2 text-xs text-white/50">
                  {memoryStat?.join("/")}
                </div>
              </h2>
              <div className="bg-rgray-2 mt-2 h-5 w-full overflow-hidden rounded-full">
                <div
                  style={{
                    width: `${((memoryStat?.[0] ?? 0) / (memoryStat?.[1] ?? 100)) * 100}%`,
                    minWidth: memoryStat?.[0] ?? 0 > 0 ? "5%" : "0%",
                  }}
                  className="bg-rgray-5 h-full rounded-full"
                />
              </div>
            </div>
            <div className="my-5">
              <h2 className="text-md flex w-full items-center justify-between">
                Tweets
                <div className="bg-rgray-4 flex rounded-md px-2 py-2 text-xs text-white/50">
                  {tweetStat?.join("/")}
                </div>
              </h2>
              <div className="bg-rgray-2 mt-2 h-5 w-full overflow-hidden rounded-full">
                <div
                  style={{
                    width: `${((tweetStat?.[0] ?? 0) / (tweetStat?.[1] ?? 100)) * 100}%`,
                    minWidth: tweetStat?.[0] ?? 0 > 0 ? "5%" : "0%",
                  }}
                  className="bg-rgray-5 h-full rounded-full"
                />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
