import { load } from "cheerio";
import { AwsClient } from "aws4fetch";

import type { NextRequest } from "next/server";
import { ensureAuth } from "../ensureAuth";

export const runtime = "edge";

export async function POST(request: NextRequest) {
	const r2 = new AwsClient({
		accessKeyId: process.env.R2_ACCESS_KEY_ID,
		secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
	});

	async function unfurl(url: string) {
		const response = await fetch(url);
		if (response.status >= 400) {
			throw new Error(`Error fetching url: ${response.status}`);
		}
		const contentType = response.headers.get("content-type");
		if (!contentType?.includes("text/html")) {
			throw new Error(`Content-type not right: ${contentType}`);
		}

		const content = await response.text();
		const $ = load(content);

		const og: { [key: string]: string | undefined } = {};
		const twitter: { [key: string]: string | undefined } = {};

		$("meta[property^=og:]").each(
			// @ts-ignore, it just works so why care of type safety if someone has better way go ahead
			(_, el) => (og[$(el).attr("property")!] = $(el).attr("content")),
		);
		$("meta[name^=twitter:]").each(
			// @ts-ignore
			(_, el) => (twitter[$(el).attr("name")!] = $(el).attr("content")),
		);

		const title =
			og["og:title"] ??
			twitter["twitter:title"] ??
			$("title").text() ??
			undefined;
		const description =
			og["og:description"] ??
			twitter["twitter:description"] ??
			$('meta[name="description"]').attr("content") ??
			undefined;
		const image =
			og["og:image:secure_url"] ??
			og["og:image"] ??
			twitter["twitter:image"] ??
			undefined;

		return {
			title,
			description,
			image,
		};
	}

	const d = await ensureAuth(request);
	if (!d) {
		return new Response("Unauthorized", { status: 401 });
	}

	if (
		!process.env.R2_ACCESS_KEY_ID ||
		!process.env.R2_ACCOUNT_ID ||
		!process.env.R2_SECRET_ACCESS_KEY ||
		!process.env.R2_BUCKET_NAME
	) {
		return new Response(
			"Missing one or more R2 env variables: R2_ENDPOINT, R2_ACCESS_ID, R2_SECRET_KEY, R2_BUCKET_NAME. To get them, go to the R2 console, create and paste keys in a `.dev.vars` file in the root of this project.",
			{ status: 500 },
		);
	}

	const website = new URL(request.url).searchParams.get("website");

	if (!website) {
		return new Response("Missing website", { status: 400 });
	}

	const salt = () => Math.floor(Math.random() * 11);
	const encodeWebsite = `${encodeURIComponent(website)}${salt()}`;

	try {
		// this returns the og image, description and title of website
		const response = await unfurl(website);

		if (!response.image) {
			return new Response(JSON.stringify(response));
		}

		if (!process.env.DEV_IMAGES) {
			return new Response("Missing DEV_IMAGES namespace.", { status: 500 });
		}

		const imageUrl = await process.env.DEV_IMAGES!.get(encodeWebsite);
		if (imageUrl) {
			return new Response(
				JSON.stringify({
					image: imageUrl,
					title: response.title,
					description: response.description,
				}),
			);
		}

		const res = await fetch(`${response.image}`);
		const image = await res.blob();

		const url = new URL(
			`https://${process.env.R2_BUCKET_NAME}.${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
		);

		url.pathname = encodeWebsite;
		url.searchParams.set("X-Amz-Expires", "3600");

		const signedPuturl = await r2.sign(
			new Request(url, {
				method: "PUT",
			}),
			{
				aws: { signQuery: true },
			},
		);
		await fetch(signedPuturl.url, {
			method: "PUT",
			body: image,
		});

		await process.env.DEV_IMAGES.put(
			encodeWebsite,
			`${process.env.R2_PUBLIC_BUCKET_ADDRESS}/${encodeWebsite}`,
		);

		return new Response(
			JSON.stringify({
				image: `${process.env.R2_PUBLIC_BUCKET_ADDRESS}/${encodeWebsite}`,
				title: response.title,
				description: response.description,
			}),
		);
	} catch (error) {
		console.log(error);
		return new Response(
			JSON.stringify({
				status: 500,
				error: error,
			}),
		);
	}
}
