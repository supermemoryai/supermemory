import * as cheerio from "cheerio";
import { Result, Ok, Err } from "../../errors/results";
import { BaseError } from "../../errors/baseError";

class GetMetadataError extends BaseError {
	constructor(message?: string, source?: string) {
		super("[Fetch Metadata Error]", message, source);
	}
}
export type Metadata = {
	title: string;
	description: string;
	image: string;
	baseUrl: string;
};
// TODO: THIS SHOULD PROBABLY ALSO FETCH THE OG-IMAGE
export async function getMetaData(
	url: string,
): Promise<Result<Metadata, GetMetadataError>> {
	try {
		const response = await fetch(url);
		const html = await response.text();

		const $ = cheerio.load(html);

		// Extract the base URL
		const baseUrl = url;

		// Extract title
		const title = $("title").text().trim();

		const description = $("meta[name=description]").attr("content") ?? "";

		const _favicon =
			$("link[rel=icon]").attr("href") ?? "https://supermemory.dhr.wtf/web.svg";

		let favicon =
			_favicon.trim().length > 0
				? _favicon.trim()
				: "https://supermemory.dhr.wtf/web.svg";
		if (favicon.startsWith("/")) {
			favicon = baseUrl + favicon;
		} else if (favicon.startsWith("./")) {
			favicon = baseUrl + favicon.slice(1);
		}

		return Ok({
			title,
			description,
			image: favicon,
			baseUrl,
		});
	} catch (e) {
		console.error("[Metadata Fetch Error]", e);
		return Err(new GetMetadataError((e as Error).message, "getMetaData"));
	}
}
