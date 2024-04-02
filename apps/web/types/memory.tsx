import { StoredContent } from "@/server/db/schema";

export type Space = {
  id: number;
  title: string;
  description: string;
  content: StoredContent[];
};
