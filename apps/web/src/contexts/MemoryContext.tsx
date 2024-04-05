"use client";
import React from "react";
import { CollectedSpaces } from "../../types/memory";

// temperory (will change)
export const MemoryContext = React.createContext<{
  spaces: CollectedSpaces[];
}>({
  spaces: [],
});

export const MemoryProvider: React.FC<
  { spaces: CollectedSpaces[] } & React.PropsWithChildren
> = ({ children, spaces }) => {
  return (
    <MemoryContext.Provider value={{ spaces }}>
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
