import React from "react";
import { Space } from "../../types/memory";

// temperory (will change)
export const MemoryContext = React.createContext<{
  spaces: Space[];
}>({
  spaces: [],
});

export const MemoryProvider: React.FC<
  { spaces: Space[] } & React.PropsWithChildren
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
