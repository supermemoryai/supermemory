import { type NextRequest } from "next/server";
import {
	ChatHistory,
	ChatHistoryZod,
	convertChatHistoryList,
	SourcesFromApi,
} from "@repo/shared-types";
import { ensureAuth } from "../ensureAuth";
import { z } from "zod";
import { db } from "@/server/db";
import { chatHistory as chatHistoryDb, chatThreads } from "@/server/db/schema";
import { and, eq, gt, sql } from "drizzle-orm";
import { join } from "path";

export const runtime = "edge";

export async function POST(req: NextRequest) {
	const session = await ensureAuth(req);

	if (!session) {
		return new Response("Unauthorized", { status: 401 });
	}

	if (!process.env.BACKEND_SECURITY_KEY) {
		return new Response("Missing BACKEND_SECURITY_KEY", { status: 500 });
	}

	const ip = req.headers.get("cf-connecting-ip");

	if (ip) {
		if (process.env.RATELIMITER) {
			const { success } = await process.env.RATELIMITER.limit({
				key: `chat-${ip}`,
			});

			if (!success) {
				console.error("rate limit exceeded");
				return new Response("Rate limit exceeded", { status: 429 });
			}
		} else {
			console.info("RATELIMITER not found in env");
		}
	} else {
		console.info("cf-connecting-ip not found in headers");
	}

	const lastHour = new Date(new Date().getTime() - 3600000);

	// Only allow 5 requests per hour for each user, something lke this but this one is bad because chathistory.userid doesnt exist, we have to do a join and get it from the threads table
	const result = await db
		.select({
			count: sql<number>`count(*)`.mapWith(Number),
		})
		.from(chatHistoryDb)
		.innerJoin(chatThreads, eq(chatHistoryDb.threadId, chatThreads.id))
		.where(
			and(
				eq(chatThreads.userId, session.user.id),
				gt(chatHistoryDb.createdAt, lastHour),
			),
		)
		.execute();

	if (result[0]?.count && result[0]?.count >= 5) {
		// return new Response(`Too many requests ${result[0]?.count}`, { status: 429 });
		console.log(result[0]?.count);
	} else {
		console.log("count", result);
	}

	const url = new URL(req.url);

	const query = url.searchParams.get("q");
	const spaces = url.searchParams.get("spaces");

	const sourcesOnly = url.searchParams.get("sourcesOnly") ?? "false";
	const proMode = url.searchParams.get("proMode") === "true";

	const jsonRequest = (await req.json()) as {
		chatHistory: ChatHistory[];
		sources: SourcesFromApi[] | undefined;
	};
	const { chatHistory, sources } = jsonRequest;

	if (!query || query.trim.length < 0) {
		return new Response(JSON.stringify({ message: "Invalid query" }), {
			status: 400,
		});
	}

	const validated = z.array(ChatHistoryZod).safeParse(chatHistory ?? []);

	if (!validated.success) {
		return new Response(
			JSON.stringify({
				message: "Invalid chat history",
				error: validated.error,
			}),
			{ status: 400 },
		);
	}

	const modelCompatible = await convertChatHistoryList(validated.data);

	const resp = await fetch(
		`${process.env.BACKEND_BASE_URL}/api/chat?query=${query}&user=${session.user.id}&sourcesOnly=${sourcesOnly}&spaces=${spaces}&proMode=${proMode}`,
		{
			headers: {
				Authorization: `Bearer ${process.env.BACKEND_SECURITY_KEY}`,
				"Content-Type": "application/json",
			},
			method: "POST",
			body: JSON.stringify({
				chatHistory: modelCompatible,
				sources,
			}),
		},
	);

	if (sourcesOnly == "true") {
		const data = (await resp.json()) as SourcesFromApi;
		return new Response(JSON.stringify(data), { status: 200 });
	}

	if (resp.status !== 200 || !resp.ok) {
		const errorData = await resp.text();
		console.log(errorData);
		return new Response(
			JSON.stringify({ message: "Error in CF function", error: errorData }),
			{ status: resp.status },
		);
	}

	return resp;
}
