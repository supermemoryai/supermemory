"use client";
import React, { useCallback } from "react";
import {
  ChachedSpaceContent,
  StoredContent,
  storedContent,
  StoredSpace,
} from "@/server/db/schema";
import {
  addMemory,
  searchMemoriesAndSpaces,
  addSpace,
  fetchContentForSpace,
} from "@/actions/db";
import { User } from "next-auth";

export type SearchResult = {
  type: "memory" | "space";
  space: StoredSpace;
  memory: StoredContent;
};

// temperory (will change)
export const MemoryContext = React.createContext<{
  spaces: StoredSpace[];
  deleteSpace: (id: number) => Promise<void>;
  freeMemories: StoredContent[];
  addSpace: typeof addSpace;
  addMemory: typeof addMemory;
  cachedMemories: ChachedSpaceContent[];
  search: typeof searchMemoriesAndSpaces;
}>({
  spaces: [],
  freeMemories: [],
  addMemory: (() => {}) as unknown as typeof addMemory,
  addSpace: (async () => {}) as unknown as typeof addSpace,
  deleteSpace: async () => {},
  cachedMemories: [],
  search: async () => [],
});

export const MemoryProvider: React.FC<
  {
    spaces: StoredSpace[];
    freeMemories: StoredContent[];
    cachedMemories: ChachedSpaceContent[];
    user: User;
  } & React.PropsWithChildren
> = ({
  children,
  user,
  spaces: initalSpaces,
  freeMemories: initialFreeMemories,
  cachedMemories: initialCachedMemories,
}) => {
  const [spaces, setSpaces] = React.useState<StoredSpace[]>(initalSpaces);
  const [freeMemories, setFreeMemories] =
    React.useState<StoredContent[]>(initialFreeMemories);

  const [cachedMemories, setCachedMemories] = React.useState<
    ChachedSpaceContent[]
  >(initialCachedMemories);

  const deleteSpace = async (id: number) => {
    setSpaces((prev) => prev.filter((s) => s.id !== id));
  };

  // const fetchMemories = useCallback(async (query: string) => {
  //   const response = await fetch(`/api/memories?${query}`);
  // }, []);

  const _addSpace: typeof addSpace = async (...params) => {
    const { space: addedSpace, addedMemories } = (await addSpace(...params))!;

    setSpaces((prev) => [...prev, addedSpace]);
    const cachedMemories = (
      await fetchContentForSpace(addedSpace.id, {
        offset: 0,
        limit: 3,
      })
    ).map((m) => ({ ...m, space: addedSpace.id }));

    setCachedMemories((prev) => [...prev, ...cachedMemories]);

    return {
      space: addedSpace,
      addedMemories,
    };
  };

  const _addMemory: typeof addMemory = async (...params) => {
    const { memory: addedMemory, addedToSpaces } = (await addMemory(
      ...params,
    ))!;

    addedToSpaces.length > 0
      ? setCachedMemories((prev) => [
          ...prev,
          ...addedToSpaces.map((s) => ({
            ...addedMemory,
            space: s.spaceId,
          })),
        ])
      : setFreeMemories((prev) => [...prev, addedMemory]);

    return {
      memory: addedMemory,
      addedToSpaces,
    };
  };

  return (
    <MemoryContext.Provider
      value={{
        search: searchMemoriesAndSpaces,
        spaces,
        addSpace: _addSpace,
        deleteSpace,
        freeMemories,
        cachedMemories,
        addMemory: _addMemory,
      }}
    >
      {children}
    </MemoryContext.Provider>
  );
};

export const useMemory = () => {
  const context = React.useContext(MemoryContext);
  if (context === undefined) {
    throw new Error("useMemory must be used within a MemoryProvider");
  }
  return context;
};
