"use client";

import { getAllUserMemoriesAndSpaces } from "@/app/actions/fetchers";
import { Content, StoredSpace } from "@/server/db/schema";
import { MemoriesIcon, NextIcon, SearchIcon, UrlIcon } from "@repo/ui/icons";
import { NotebookIcon, PaperclipIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import React, { useEffect, useMemo, useState } from "react";
import Masonry from "react-layout-masonry";
import { getRawTweet } from "@repo/shared-types/utils";
import { MyTweet } from "./render-tweet";

function Page() {
  const [filter, setFilter] = useState("All");

  const [memoriesAndSpaces, setMemoriesAndSpaces] = useState<{
    memories: Content[];
    spaces: StoredSpace[];
  }>({ memories: [], spaces: [] });

  // Sort Both memories and spaces by their savedAt and createdAt dates respectfully.
  // The output should be just one single list of items
  // And it will look something like { item: "memory" | "space", date: Date, data: Content | StoredSpace }
  const sortedItems = useMemo(() => {
    // Merge the lists
    const unifiedItems = [
      ...memoriesAndSpaces.memories.map((memory) => ({
        item: "memory",
        date: new Date(memory.savedAt), // Assuming savedAt is a string date
        data: memory,
      })),
      ...memoriesAndSpaces.spaces.map((space) => ({
        item: "space",
        date: new Date(space.createdAt), // Assuming createdAt is a string date
        data: space,
      })),
    ].map((item) => ({
      ...item,
      date: Number(item.date), // Convert the date to a number
    }));

    // Sort the merged list
    return unifiedItems
      .filter((item) => {
        if (filter === "All") return true;
        if (filter === "Spaces" && item.item === "space") {
          console.log(item);
          return true;
        }
        if (filter === "Pages")
          return (
            item.item === "memory" && (item.data as Content).type === "page"
          );
        if (filter === "Notes")
          return (
            item.item === "memory" && (item.data as Content).type === "note"
          );
        if (filter === "Tweet")
          return (
            item.item === "memory" && (item.data as Content).type === "tweet"
          );
        return false;
      })
      .sort((a, b) => b.date - a.date);
  }, [memoriesAndSpaces.memories, memoriesAndSpaces.spaces, filter]);

  useEffect(() => {
    (async () => {
      const { success, data } = await getAllUserMemoriesAndSpaces();
      if (!success ?? !data) return;
      setMemoriesAndSpaces({ memories: data.memories, spaces: data.spaces });
    })();
  }, []);

  return (
    <div className="px-2 md:px-32 py-36 h-full flex mx-auto w-full flex-col gap-6">
      <h2 className="text-white w-full font-medium text-2xl text-left">
        My Memories
      </h2>

      <Filters setFilter={setFilter} filter={filter} />

      <Masonry
        className="mt-6 relative"
        columns={{ 640: 1, 768: 2, 1024: 3 }}
        gap={12}
        columnProps={{
          className: "min-w-[calc(33.3333%-12px)] w-full",
        }}
      >
        {sortedItems.map((item) => {
          if (item.item === "memory") {
            return (
              <LinkComponent
                type={(item.data as Content).type ?? "note"}
                content={(item.data as Content).content}
                title={(item.data as Content).title ?? "Untitled"}
                url={
                  (item.data as Content).baseUrl ?? (item.data as Content).url
                }
                image={
                  (item.data as Content).ogImage ??
                  (item.data as Content).image ??
                  "/placeholder-image.svg" // TODO: add this placeholder
                }
                description={(item.data as Content).description ?? ""}
              />
            );
          }

          if (item.item === "space") {
            return (
              <TabComponent
                title={(item.data as StoredSpace).name}
                description={`${(item.data as StoredSpace).numItems} memories`}
              />
            );
          }

          return null;
        })}
      </Masonry>
    </div>
  );
}

function TabComponent({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  // TODO: Display the space name and desription which is the number of elemenet in the space
  return (
    <div className="flex flex-col gap-4 bg-[#161f2a]/30 backdrop-blur-md border-2 border-border w-full rounded-xl p-4 -z-10">
      <div className="flex items-center gap-2 text-xs">
        <Image alt="Spaces icon" src={MemoriesIcon} className="size-3" /> Space
      </div>
      <div className="flex items-center">
        <div>
          <div className="h-12 w-12 flex justify-center items-center rounded-md">
            {title.slice(0, 2).toUpperCase()}
          </div>
        </div>
        <div className="grow px-4">
          <div className="text-lg text-[#fff] line-clamp-2">{title}</div>
          <div>{description}</div>
        </div>
        <div>
          <Image src={NextIcon} alt="Search icon" />
        </div>
      </div>
    </div>
  );
}

function LinkComponent({
  type,
  content,
  title,
  url,
  image,
  description,
}: {
  type: string;
  content: string;
  title: string;
  url: string;
  image?: string;
  description: string;
}) {
  // TODO: DISPLAY THE ITEM BASED ON `type` being note or page
  return (
    <Link
      href={url.replace("https://beta.supermemory.ai", "")}
      className={`bg-secondary border-2 border-border rounded-xl ${type === "tweet" ? "" : "p-4"} hover:scale-105 transition duration-200`}
    >
      {type === "page" ? (
        <>
          <div className="flex items-center gap-2 text-xs">
            <PaperclipIcon className="w-3 h-3" /> Page
          </div>
          <div className="text-lg text-[#fff] mt-4 line-clamp-2">{title}</div>
          <div>{url}</div>
        </>
      ) : type === "note" ? (
        <>
          <div className="flex items-center gap-2 text-xs">
            <NotebookIcon className="w-3 h-3" /> Note
          </div>
          <div className="text-lg text-[#fff] mt-4 line-clamp-2">{title}</div>
          <div className="line-clamp-3">{content.replace(title, "")}</div>
        </>
      ) : type === "tweet" ? (
        <MyTweet tweet={JSON.parse(getRawTweet(content) ?? "{}")} />
      ) : null}
    </Link>
  );
}

const FilterMethods = ["All", "Spaces", "Pages", "Notes", "Tweet"];
function Filters({
  setFilter,
  filter,
}: {
  setFilter: (i: string) => void;
  filter: string;
}) {
  return (
    <div className="flex gap-4">
      {FilterMethods.map((i) => {
        return (
          <button
            onClick={() => setFilter(i)}
            className={`transition px-6 py-2 rounded-xl bg-border ${i === filter ? " text-[#369DFD]" : "text-[#B3BCC5] bg-secondary hover:bg-secondary hover:text-[#76a3cc]"}`}
          >
            {i}
          </button>
        );
      })}
    </div>
  );
}

export default Page;
