import { StoredContent } from '@/server/db/schema';

export const transformContent = (content: StoredContent[]): CollectedSpaces[] => {
  const spaces = Array.from(new Set(content.map((c) => c.space)));

  const spaceContent = spaces.map((space, i) => ({
    title: space!,
    id: i + 1,
    description: '',
    content: content.filter((c) => c.space === space),
  }));

  return spaceContent;
};

export type CollectedSpaces = {
  id: number;
  title: string;
  description: string;
  content: StoredContent[];
};
