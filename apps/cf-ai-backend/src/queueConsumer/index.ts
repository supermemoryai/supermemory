import { Env, PageOrNoteChunks, TweetChunks, vectorObj } from "../types";
import { typeDecider } from "./utils/typeDecider";
import { isErr, wrap } from "../errors/results";
import { processNote } from "./helpers/processNotes";
import { processPage } from "./helpers/processPage";
import { getThreadData, getTweetData } from "./helpers/processTweet";
import { tweetToMd } from "@repo/shared-types/utils";
import { initQQuery } from "./helpers/initQuery";
import { chunkNote, chunkPage } from "./chunkers/chunkPageOrNotes";
import { chunkThread } from "./chunkers/chunkTweet";
import { batchCreateChunksAndEmbeddings } from "../helper";
import { z } from "zod";
import { Metadata } from "./utils/get-metadata";
import { BaseError } from "../errors/baseError";
import { database } from "../db";
import { storedContent, space, contentToSpace } from "../db/schema";
import { and, eq, inArray, sql } from "drizzle-orm";

class VectorInsertError extends BaseError {
	constructor(message?: string, source?: string) {
		super("[Vector Insert Error]", message, source);
	}
}
const vectorErrorFactory = (err: Error) => new VectorInsertError(err.message);

class D1InsertError extends BaseError {
	constructor(message?: string, source?: string) {
		super("[D1 Insert Error]", message, source);
	}
}

export async function queue(
	batch: MessageBatch<{ content: string; space: Array<number>; user: string }>,
	env: Env,
): Promise<void> {
	console.log(env.CF_ACCOUNT_ID, env.CF_KV_AUTH_TOKEN);
	for (let message of batch.messages) {
		console.log(env.CF_ACCOUNT_ID, env.CF_KV_AUTH_TOKEN);
		console.log("is thie even running?", message.body);
		const body = message.body;
		console.log("v got shit in the queue", body);

		const typeResult = typeDecider(body.content);

		if (isErr(typeResult)) {
			throw typeResult.error;
		}
		console.log(typeResult.value);
		const type = typeResult.value;

		let pageContent: string;
		let vectorData: string;
		let metadata: Metadata;
		let storeToSpaces = body.space;
		let chunks: TweetChunks | PageOrNoteChunks;
		let noteId = 0;
		switch (type) {
			case "note": {
				console.log("note hit");
				const note = processNote(body.content);
				if (isErr(note)) {
					throw note.error;
				}
				pageContent = note.value.noteContent.noteContent;
				noteId = note.value.noteContent.noteId;
				metadata = note.value.metadata;
				vectorData = pageContent;
				chunks = chunkNote(pageContent);
				break;
			}
			case "page": {
				console.log("page hit");
				const page = await processPage(body.content);
				if (isErr(page)) {
					throw page.error;
				}
				pageContent = page.value.pageContent;
				metadata = page.value.metadata;
				vectorData = pageContent;
				chunks = chunkPage(pageContent);
				break;
			}

			case "tweet": {
				console.log("tweet hit");
				console.log(body.content.split("/").pop());
				const tweet = await getTweetData(body.content.split("/").pop());
				console.log(tweet);
				const thread = await getThreadData(
					body.content,
					env.THREAD_CF_WORKER,
					env.THREAD_CF_AUTH,
				);

				if (isErr(tweet)) {
					throw tweet.error;
				}
				pageContent = tweetToMd(tweet.value);
				console.log(pageContent);
				metadata = {
					baseUrl: body.content,
					description: tweet.value.text.slice(0, 200),
					image: tweet.value.user.profile_image_url_https,
					title: `Tweet by ${tweet.value.user.name}`,
				};
				if (isErr(thread)) {
					console.log("Thread worker is down!");
					vectorData = JSON.stringify(pageContent);
					console.error(thread.error);
				} else {
					vectorData = thread.value;
				}
				chunks = chunkThread(vectorData);
				break;
			}
		}

		// see what's up with the storedToSpaces in this block
		const { store } = await initQQuery(env);

		type body = z.infer<typeof vectorObj>;

		const Chunkbody: body = {
			pageContent: pageContent,
			spaces: storeToSpaces.map((spaceId) => spaceId.toString()),
			user: body.user,
			type: type,
			url: metadata.baseUrl,
			description: metadata.description,
			title: metadata.description,
		};
		const vectorResult = await wrap(
			batchCreateChunksAndEmbeddings({
				store: store,
				body: Chunkbody,
				chunks: chunks,
				env: env,
			}),
			vectorErrorFactory,
		);

		if (isErr(vectorResult)) {
			throw vectorResult.error;
		}
		const saveToDbUrl =
			(metadata.baseUrl.split("#supermemory-user-")[0] ?? metadata.baseUrl) +
			"#supermemory-user-" +
			body.user;
		let contentId: number;
		const db = database(env);
		const insertResponse = await db
			.insert(storedContent)
			.values({
				content: pageContent as string,
				title: metadata.title,
				description: metadata.description,
				url: saveToDbUrl,
				baseUrl: saveToDbUrl,
				image: metadata.image,
				savedAt: new Date(),
				userId: body.user,
				type: type,
				noteId: noteId,
			})
			.returning({ id: storedContent.id });

		if (!insertResponse[0]?.id) {
			throw new D1InsertError(
				"something went worng when inserting to database",
				"inresertResponse",
			);
		}
		contentId = insertResponse[0]?.id;
		if (storeToSpaces.length > 0) {
			// Adding the many-to-many relationship between content and spaces
			const spaceData = await db
				.select()
				.from(space)
				.where(and(inArray(space.id, storeToSpaces), eq(space.user, body.user)))
				.all();

			await Promise.all(
				spaceData.map(async (s) => {
					await db
						.insert(contentToSpace)
						.values({ contentId: contentId, spaceId: s.id });

					await db.update(space).set({ numItems: s.numItems + 1 });
				}),
			);
		}
	}
}

/*
To do: 
1. Abstract and shitft the entrie creatememory function to the queue consumer --> Hopefully done
2. Make the front end use that instead of whatever khichidi is going on right now 
3. remove getMetada form the lib file as it's not being used anywhere else 
4. Figure out the limit stuff ( server action for that seems fine because no use in limiting after they already in the queue rigth? )
5. Figure out the initQuery stuff ( ;( ) --> This is a bad way of doing stuff :0 
6. How do I hande the content already exists wala use case?
7. Figure out retry and not add shit to the vectirze over and over again on failure
*/
