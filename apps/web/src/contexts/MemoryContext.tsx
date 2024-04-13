"use client";
import React, { useCallback } from "react";
import { CollectedSpaces } from "../../types/memory";
import { ChachedSpaceContent, StoredContent, storedContent, StoredSpace } from "@/server/db/schema";
import { addMemory, searchMemoriesAndSpaces } from "@/actions/db";
import { User } from "next-auth";

export type SearchResult = {
	type: "memory" | "space",
	space: StoredSpace,
	memory: StoredContent
}

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
  cachedMemories: ChachedSpaceContent[];
	search: (query: string) => Promise<SearchResult[]>;
}>({
  spaces: [],
  freeMemories: [],
  addMemory: async () => {},
  addSpace: async () => {},
  deleteSpace: async () => {},
  cachedMemories: [],
	search: async () => []
});

export const MemoryProvider: React.FC<
  {
    spaces: StoredSpace[];
    freeMemories: StoredContent[];
		cachedMemories: ChachedSpaceContent[];
		user: User;
  } & React.PropsWithChildren
> = ({ children, user, spaces: initalSpaces, freeMemories: initialFreeMemories, cachedMemories: initialCachedMemories }) => {

  const [spaces, setSpaces] = React.useState<StoredSpace[]>(initalSpaces);
  const [freeMemories, setFreeMemories] =
    React.useState<StoredContent[]>(initialFreeMemories);

  const [cachedMemories, setCachedMemories] = React.useState<ChachedSpaceContent[]>(
    initialCachedMemories
  );

  const addSpace = async (space: StoredSpace) => {
		setSpaces((prev) => [...prev, space]);
	}
	
	const deleteSpace = async (id: number) => {
		setSpaces((prev) => prev.filter((s) => s.id !== id));
	}

	const search = async (query: string) => {
		if (!user.id) {
			throw new Error('user id is not define')
		}
		const data = await searchMemoriesAndSpaces(user.id, query)
		return data as SearchResult[]
	}

  // const fetchMemories = useCallback(async (query: string) => {
  //   const response = await fetch(`/api/memories?${query}`);
  // }, []);

  const _addMemory =  async (
		memory: typeof storedContent.$inferInsert,
		spaces: number[] = [],
	) => {
		const content = await addMemory(memory, spaces);
	}

  return (
    <MemoryContext.Provider
      value={{
				search,
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
