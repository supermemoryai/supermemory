import { documents } from "@supermemory/db/schema";
import { memoryTypes } from "~/lib/constants/typeIcons";

export type Memory = typeof documents.$inferSelect;

export interface WebsiteMetadata {
	title: string;
	description: string;
	image: string;
	dominantColor: string;
	isDark: boolean;
}
