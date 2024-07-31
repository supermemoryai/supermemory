import { Result, Ok, Err } from "../../errors/results";
import { BaseError } from "../../errors/baseError";
import { Metadata } from "../utils/get-metadata";

class ProcessNotesError extends BaseError {
	constructor(message?: string, source?: string) {
		super("[Note Processing Error]", message, source);
	}
}

type ProcessNoteResult = {
	noteContent: { noteId: number; noteContent: string };
	metadata: Metadata;
};

export function processNote(
	content: string,
): Result<ProcessNoteResult, ProcessNotesError> {
	try {
		const pageContent = content;
		const noteId = new Date().getTime();

		const metadata = {
			baseUrl: `https://supermemory.ai/note/${noteId}`,
			description: `Note created at ${new Date().toLocaleString()}`,
			image: "https://supermemory.ai/logo.png",
			title: `${pageContent.slice(0, 20)} ${pageContent.length > 20 ? "..." : ""}`,
		};

		const noteContent = { noteId: noteId, noteContent: pageContent };
		return Ok({ noteContent, metadata });
	} catch (e) {
		console.error("[Note Processing Error]", e);
		return Err(new ProcessNotesError((e as Error).message, "processNote"));
	}
}
