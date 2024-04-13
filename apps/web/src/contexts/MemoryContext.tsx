"use client";
import React, { useCallback } from "react";
import { ChachedSpaceContent, StoredContent, storedContent, StoredSpace } from "@/server/db/schema";
import { addMemory, searchMemoriesAndSpaces, addSpace, fetchContentForSpace, deleteSpace, deleteMemory } from "@/actions/db";
import { User } from "next-auth";

export type SearchResult = {
	type: "memory" | "space",
	space: StoredSpace,
	memory: StoredContent
}

// temperory (will change)
export const MemoryContext = React.createContext<{
  spaces: StoredSpace[];
  freeMemories: StoredContent[];
  addSpace: typeof addSpace;
  addMemory: typeof addMemory;
  cachedMemories: ChachedSpaceContent[];
	search: typeof searchMemoriesAndSpaces;
	deleteSpace: typeof deleteSpace;
	deleteMemory: typeof deleteMemory;
}>({
  spaces: [],
  freeMemories: [],
  addMemory: (() => {}) as unknown as (typeof addMemory),
  addSpace: (async () => {}) as unknown as (typeof addSpace),
  cachedMemories: [],
	search: async () => [],
	deleteMemory: (() => {}) as unknown as (typeof deleteMemory),
	deleteSpace: (() => {}) as unknown as (typeof deleteSpace)
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
	
	const _deleteSpace: typeof deleteSpace = async (...params) => {
		const deleted = (await deleteSpace(...params))!

		setSpaces(prev => prev.filter(i => i.id !== deleted.id))
		setCachedMemories(prev => prev.filter(i => i.space !== deleted.id))

		return deleted
	}

	const _deleteMemory: typeof deleteMemory = async (...params) => {
		const deleted = (await deleteMemory(...params))!

		setCachedMemories(prev => prev.filter(i => i.id !== deleted.id))
		setFreeMemories(prev => prev.filter(i => i.id !== deleted.id))

		return deleted
	}
	
  // const fetchMemories = useCallback(async (query: string) => {
  //   const response = await fetch(`/api/memories?${query}`);
  // }, []);

	
	const _addSpace: typeof addSpace = async (...params) => {
		const { space: addedSpace, addedMemories } = (await addSpace(...params))!;

		setSpaces(prev => [...prev, addedSpace])
		const cachedMemories = (await fetchContentForSpace(addedSpace.id, {
			offset: 0,
			limit: 3
		})).map(m => ({ ...m, space: addedSpace.id }))

		setCachedMemories(prev => [...prev, ...cachedMemories])

		return {
			space: addedSpace, addedMemories
		}
	}

	const _addMemory: typeof addMemory = async (...params) => {
		const { memory: addedMemory, addedToSpaces } = (await addMemory(...params))!;

		addedToSpaces.length > 0 ? setCachedMemories(prev => [
			...prev,
			...addedToSpaces.map(s => ({
				...addedMemory,
				space: s.spaceId
			}))
		]) : setFreeMemories(prev => [...prev, addedMemory])

		return {
			memory: addedMemory,
			addedToSpaces
		}
	}

  return (
    <MemoryContext.Provider
      value={{
				search: searchMemoriesAndSpaces,
        spaces,
        addSpace: _addSpace,
        deleteSpace: _deleteSpace,
        freeMemories,
        cachedMemories,
				deleteMemory: _deleteMemory,
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
