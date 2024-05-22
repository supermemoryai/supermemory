import { db } from "@/server/db";
import { StoredContent } from "@/server/db/schema";

export type CollectedSpaces = {
  id: number;
  title: string;
  content: StoredContent[];
};

export type ChatHistory = {
  question: string;
  answer: {
    parts: { text: string }[];
    sources: { isNote: boolean; source: string }[];
  };
};
