"use client";
import React, { useCallback } from "react";
import { CollectedSpaces } from "../../types/memory";

// temperory (will change)
export const MemoryContext = React.createContext<{
  spaces: CollectedSpaces[];
  addSpace: (space: CollectedSpaces) => Promise<void>;
}>({
  spaces: [],
  addSpace: async (space) => {},
});

export const MemoryProvider: React.FC<
  { spaces: CollectedSpaces[] } & React.PropsWithChildren
> = ({ children, spaces: initalSpaces }) => {
  const [spaces, setSpaces] = React.useState<CollectedSpaces[]>(initalSpaces);

  const addSpace = useCallback(
    async (space: CollectedSpaces) => {
      setSpaces((prev) => [...prev, space]);
    },
    [spaces],
  );

  return (
    <MemoryContext.Provider value={{ spaces, addSpace }}>
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
