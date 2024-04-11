"use client";
import React, { useCallback } from "react";
import { CollectedSpaces } from "../../types/memory";
import { StoredContent, storedContent, StoredSpace } from "@/server/db/schema";
import { addMemory } from "@/actions/db";

// temperory (will change)
export const MemoryContext = React.createContext<{
  spaces: StoredSpace[];
  deleteSpace: (id: number) => Promise<void>;
  freeMemories: StoredContent[];
  addSpace: (space: StoredSpace) => Promise<void>;
  addMemory: (
    memory: typeof storedContent.$inferInsert,
    spaces?: number[],
  ) => Promise<void>;
  cachedMemories: StoredContent[];
}>({
  spaces: [],
  freeMemories: [],
  addMemory: async () => {},
  addSpace: async () => {},
  deleteSpace: async () => {},
  cachedMemories: [],
});

export const MemoryProvider: React.FC<
  {
    spaces: StoredSpace[];
    freeMemories: StoredContent[];
		cachedMemories: StoredContent[]
  } & React.PropsWithChildren
> = ({ children, spaces: initalSpaces, freeMemories: initialFreeMemories, cachedMemories: initialCachedMemories }) => {

  const [spaces, setSpaces] = React.useState<StoredSpace[]>(initalSpaces);
  const [freeMemories, setFreeMemories] =
    React.useState<StoredContent[]>(initialFreeMemories);

  const [cachedMemories, setCachedMemories] = React.useState<StoredContent[]>(
    initialCachedMemories
  );

  const addSpace = useCallback(
    async (space: StoredSpace) => {
      setSpaces((prev) => [...prev, space]);
    },
    [spaces],
  );
  const deleteSpace = useCallback(
    async (id: number) => {
      setSpaces((prev) => prev.filter((s) => s.id !== id));
    },
    [spaces],
  );

  // const fetchMemories = useCallback(async (query: string) => {
  //   const response = await fetch(`/api/memories?${query}`);
  // }, []);

  const _addMemory = useCallback(
    async (
      memory: typeof storedContent.$inferInsert,
      spaces: number[] = [],
    ) => {
      const content = await addMemory(memory, spaces);
      console.log(content);
    },
    [freeMemories, spaces],
  );

  return (
    <MemoryContext.Provider
      value={{
        spaces,
        addSpace,
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
