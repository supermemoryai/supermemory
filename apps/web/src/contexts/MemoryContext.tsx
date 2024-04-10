'use client';
import React, { useCallback } from 'react';
import { CollectedSpaces } from '../../types/memory';

// temperory (will change)
export const MemoryContext = React.createContext<{
  spaces: CollectedSpaces[];
  deleteSpace: (id: number) => Promise<void>;
  addSpace: (space: CollectedSpaces) => Promise<void>;
}>({
  spaces: [],
  addSpace: async (space) => {},
  deleteSpace: async (id) => {},
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
  const deleteSpace = useCallback(
    async (id: number) => {
      setSpaces((prev) => prev.filter((s) => s.id !== id));
    },
    [spaces],
  );

  return (
    <MemoryContext.Provider value={{ spaces, addSpace, deleteSpace }}>
      {children}
    </MemoryContext.Provider>
  );
};

export const useMemory = () => {
  const context = React.useContext(MemoryContext);
  if (context === undefined) {
    throw new Error('useMemory must be used within a MemoryProvider');
  }
  return context;
};
