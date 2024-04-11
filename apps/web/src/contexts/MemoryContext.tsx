"use client";
import React, { useCallback } from "react";
import { CollectedSpaces } from "../../types/memory";
import { StoredContent, storedContent } from "@/server/db/schema";
import { useSession } from "next-auth/react";
import { addMemory } from "@/actions/db";

// temperory (will change)
export const MemoryContext = React.createContext<{
  spaces: CollectedSpaces[];
  deleteSpace: (id: number) => Promise<void>;
  freeMemories: StoredContent[];
  addSpace: (space: CollectedSpaces) => Promise<void>;
  addMemory: (
    memory: typeof storedContent.$inferInsert,
    spaces?: number[],
  ) => Promise<void>;
}>({
  spaces: [],
  freeMemories: [],
  addMemory: async () => {},
  addSpace: async () => {},
  deleteSpace: async () => {},
});

export const MemoryProvider: React.FC<
  {
    spaces: CollectedSpaces[];
    freeMemories: StoredContent[];
  } & React.PropsWithChildren
> = ({ children, spaces: initalSpaces, freeMemories: initialFreeMemories }) => {
  const [spaces, setSpaces] = React.useState<CollectedSpaces[]>(initalSpaces);
  const [freeMemories, setFreeMemories] =
    React.useState<StoredContent[]>(initialFreeMemories);

  const addSpace = useCallback(
    async (space: CollectedSpaces) => {
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
