"use client";

import { getAllUserMemoriesAndSpaces } from "@/app/actions/fetchers";
import { Space } from "@/app/actions/types";
import { Content, StoredSpace } from "@/server/db/schema";
import { NextIcon, SearchIcon, UrlIcon } from "@repo/ui/icons";
import Image from "next/image";
import React, { useEffect, useMemo, useState } from "react";
import Masonry from "react-layout-masonry";

function Page() {
  const [filter, setFilter] = useState("All");
  const setFilterfn = (i: string) => setFilter(i);

  const [search, setSearch] = useState("");

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
    return unifiedItems.sort((a, b) => a.date - b.date);
  }, [memoriesAndSpaces.memories, memoriesAndSpaces.spaces]);

  useEffect(() => {
    (async () => {
      const { success, data } = await getAllUserMemoriesAndSpaces();
      if (!success ?? !data) return;
      setMemoriesAndSpaces({ memories: data.memories, spaces: data.spaces });
    })();
  }, []);

  return (
    <div className="max-w-3xl min-w-3xl py-36 h-full flex mx-auto w-full flex-col gap-6">
      <h2 className="text-white w-full font-medium text-2xl text-left">
        My Memories
      </h2>

      <Filters setFilter={setFilter} filter={filter} />

      <Masonry
        className="mt-6"
        columns={{ 640: 1, 768: 2, 1024: 3, 1280: 4 }}
        gap={4}
      >
        {sortedItems.map((item) => {
          if (filter !== "All" && item.item !== filter) return null;

          if (item.item === "memory") {
            return (
              <LinkComponent
                type={(item.data as Content).type ?? "note"}
                content={(item.data as Content).content}
                title={(item.data as Content).title ?? "Untitled"}
                url={(item.data as Content).url}
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
  return (
    <div className="flex items-center my-6">
      <div>
        <div className="h-12 w-12 bg-[#1F2428] flex justify-center items-center rounded-md">
          {title.slice(0, 2).toUpperCase()}
        </div>
      </div>
      <div className="grow px-4">
        <div className="text-lg text-[#fff]">{title}</div>
        <div>{description}</div>
      </div>
      <div>
        <Image src={NextIcon} alt="Search icon" />
      </div>
    </div>
  );
}

function LinkComponent({
  type,
  content,
  title,
  url,
}: {
  type: string;
  content: string;
  title: string;
  url: string;
}) {
  return (
    <div className="w-full">
      <div className="text-lg text-[#fff]">{title}</div>
      <div>{content}</div>
      <div>{url}</div>
    </div>
  );
}

const FilterMethods = ["All", "Spaces", "Pages", "Notes"];
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
          <div
            onClick={() => setFilter(i)}
            className={`transition px-6 py-2 rounded-xl bg-border ${i === filter ? " text-[#369DFD]" : "text-[#B3BCC5] bg-secondary hover:bg-secondary hover:text-[#76a3cc]"}`}
          >
            {i}
          </div>
        );
      })}
    </div>
  );
}

export default Page;
