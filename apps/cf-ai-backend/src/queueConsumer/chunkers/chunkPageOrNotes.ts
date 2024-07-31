import chunkText from "./chonker";
import { PageOrNoteChunks } from "../../types";
export function chunkPage(pageContent: string): PageOrNoteChunks {
	const chunks = chunkText(pageContent, 1536);

	return { type: "page", chunks: chunks };
}

export function chunkNote(noteContent: string): PageOrNoteChunks {
	const chunks = chunkText(noteContent, 1536);

	return { type: "note", chunks: chunks };
}
