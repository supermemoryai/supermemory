import { Result, Ok, Err, isErr } from "../../errors/results";
import { BaseError } from "../../errors/baseError";
import { getMetaData, Metadata } from "../utils/get-metadata";

class ProcessPageError extends BaseError {
	constructor(message?: string, source?: string) {
		super("[Page Proceessing Error]", message, source);
	}
}

type PageProcessResult = { pageContent: string; metadata: Metadata };

export async function processPage(
	url: string,
): Promise<Result<PageProcessResult, ProcessPageError>> {
	try {
		const response = await fetch("https://md.dhr.wtf/?url=" + url, {
			headers: {
				Authorization: "Bearer " + process.env.BACKEND_SECURITY_KEY,
			},
		});
		const pageContent = await response.text();
		if (!pageContent) {
			return Err(
				new ProcessPageError(
					"Failed to get response form markdowner",
					"processPage",
				),
			);
		}
		console.log("[This is the page content]", pageContent);
		const metadataResult = await getMetaData(url);
		if (isErr(metadataResult)) {
			throw metadataResult.error;
		}
		const metadata = metadataResult.value;
		return Ok({ pageContent, metadata });
	} catch (e) {
		console.error("[Page Processing Error]", e);
		return Err(new ProcessPageError((e as Error).message, "processPage"));
	}
}
