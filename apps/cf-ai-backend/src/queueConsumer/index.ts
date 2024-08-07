import { Env, PageOrNoteChunks, TweetChunks, vectorObj } from "../types";
import { typeDecider } from "./utils/typeDecider";
import { isErr, wrap } from "../errors/results";
import { processNote } from "./helpers/processNotes";
import { processPage } from "./helpers/processPage";
import { getThreadData, getTweetData } from "./helpers/processTweet";
import { tweetToMd } from "@repo/shared-types/utils";
import { chunkNote, chunkPage } from "./chunkers/chunkPageOrNotes";
import { chunkThread } from "./chunkers/chunkTweet";
import { batchCreateChunksAndEmbeddings, initQuery } from "../helper";
import { z } from "zod";
import { Metadata } from "./utils/get-metadata";
import { BaseError } from "../errors/baseError";
import { database } from "../db";
import {
	storedContent,
	space,
	contentToSpace,
	users,
	jobs,
	Job,
} from "@repo/db/schema";
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

const d1ErrorFactory = (err: Error, source: string) =>
	new D1InsertError(err.message, source);

const calculateExponentialBackoff = (
	attempts: number,
	baseDelaySeconds: number,
) => {
	return baseDelaySeconds ** attempts;
};

const BASE_DELAY_SECONDS = 5;
export async function queue(
	batch: MessageBatch<{
		content: string;
		space: Array<number>;
		user: string;
		type: string;
	}>,
	env: Env,
): Promise<void> {
	const db = database(env);

	for (let message of batch.messages) {

		const body = message.body;

		const type = body.type;
		const userExists = await wrap(
			db.select().from(users).where(eq(users.id, body.user)).limit(1),
			d1ErrorFactory,
			"Error when trying to verify user",
		);

		if (isErr(userExists)) {
			throw userExists.error;
		}

		//check if this is a retry job.. by checking if the combination of the userId and the url already exists on the queue
		let jobId;
		const existingJob = await wrap(
			db
				.select()
				.from(jobs)
				.where(
					and(
						eq(jobs.userId, userExists.value[0].id),
						eq(jobs.url, body.content),
					),
				)
				.limit(1),
			d1ErrorFactory,
			"Error when checking for existing job",
		);

		if (isErr(existingJob)) {
			throw existingJob.error;
		}

		if (existingJob.value.length > 0) {
			jobId = existingJob.value[0].id;
			await wrap(
				db
					.update(jobs)
					.set({
						attempts: existingJob.value[0].attempts + 1,
						updatedAt: new Date(),
						status: "Processing",
					})
					.where(eq(jobs.id, jobId)),
				d1ErrorFactory,
				"Error when updating job attempts",
			);
		} else {
			const job = await wrap(
				db
					.insert(jobs)
					.values({
						userId: userExists.value[0].id as string,
						url: body.content,
						status: "Processing",
						attempts: 1,
						createdAt: new Date(),
						updatedAt: new Date(),
					})
					.returning({ jobId: jobs.id }),
				d1ErrorFactory,
				"Error When inserting into jobs table",
			);
			if (isErr(job)) {
				throw job.error;
			}
			jobId = job.value[0].jobId;
		}

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
				const page = await processPage({
					url: body.content,
					securityKey: env.MD_SEC_KEY,
				});
				if (isErr(page)) {
					console.log("there is a page error here");
					throw page.error;
				}
				pageContent = page.value.pageContent;
				metadata = page.value.metadata;
				vectorData = pageContent;
				chunks = chunkPage(pageContent);
				break;
			}

			case "tweet": {

				const tweet = await getTweetData(body.content.split("/").pop());

				const thread = await getThreadData({
					tweetUrl: body.content,
					env: env,
				});
				console.log("[This is the thread]", thread);
				if (isErr(tweet)) {
					throw tweet.error;
				}
				pageContent = tweetToMd(tweet.value);

				metadata = {
					baseUrl: body.content,
					description: tweet.value.text.slice(0, 200),
					image: tweet.value.user.profile_image_url_https,
					title: `Tweet by ${tweet.value.user.name}`,
				};
				console.log("this is the tweet metadata", metadata.title);
				if (isErr(thread)) {
					console.log("Thread worker is down!");
					vectorData = JSON.stringify(pageContent);
					console.log(vectorData);
					console.error(thread.error);
				} else {
					console.log("thread worker is fine");
					vectorData = thread.value;
				}
				chunks = chunkThread(vectorData);
				break;
			}
		}

		//add to mem0, abstract

		const mem0Response = fetch("https://api.mem0.ai/v1/memories/", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Token ${env.MEM0_API_KEY}`,
			},
			body: JSON.stringify({
				messages: [
					{
						role: "system",
						content: `Extract information about the user based on this saved content provided, remember that the date was ${new Date().toUTCString()} in utc time zone`,
					},
					{
						role: "user",
						content: vectorData.replace(/<raw>.*?<\/raw>/g, ""),
					},
				],
				user_id: body.user,
			}),
		});
		// see what's up with the storedToSpaces in this block
		const { store } = await initQuery(env);

		type body = z.infer<typeof vectorObj>;

		const Chunkbody: body = {
			pageContent: pageContent,
			spaces: storeToSpaces.map((spaceId) => spaceId.toString()),
			user: body.user,
			type: type,
			url: metadata.baseUrl,
			description: metadata.description,
			title: metadata.title,
		};

		try {
			const vectorResult = await wrap(
				batchCreateChunksAndEmbeddings({
					store: store,
					body: Chunkbody,
					chunks: chunks,
					env: env,
				}),
				vectorErrorFactory,
				"Error when Inserting into vector database",
			);

			if (isErr(vectorResult)) {
				await db
					.update(jobs)
					.set({ error: vectorResult.error.message, status: "error" })
					.where(eq(jobs.id, jobId));
				message.retry({
					delaySeconds: calculateExponentialBackoff(
						message.attempts,
						BASE_DELAY_SECONDS,
					),
				});
				throw vectorResult.error;
			}

			const saveToDbUrl =
				(metadata.baseUrl.split("#supermemory-user-")[0] ?? metadata.baseUrl) +
				"#supermemory-user-" +
				body.user;

			let contentId: number;

			const insertResponse = await wrap(
				db
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
					.returning({ id: storedContent.id }),
				d1ErrorFactory,
				"Error when inserting into storedContent",
			);

			if (isErr(insertResponse)) {
				await db
					.update(jobs)
					.set({ error: insertResponse.error.message, status: "error" })
					.where(eq(jobs.id, jobId));
				message.retry({
					delaySeconds: calculateExponentialBackoff(
						message.attempts,
						BASE_DELAY_SECONDS,
					),
				});
				throw insertResponse.error;
			}

			contentId = insertResponse.value[0].id;
			if (storeToSpaces.length > 0) {
				// Adding the many-to-many relationship between content and spaces
				const spaceData = await wrap(
					db
						.select()
						.from(space)
						.where(
							and(inArray(space.id, storeToSpaces), eq(space.user, body.user)),
						)
						.all(),
					d1ErrorFactory,
					"Error when getting data from spaces",
				);

				if (isErr(spaceData)) {
					throw spaceData.error;
				}
				try {
					await Promise.all(
						spaceData.value.map(async (s) => {
							try {
								await db
									.insert(contentToSpace)
									.values({ contentId: contentId, spaceId: s.id });

								await db.update(space).set({ numItems: s.numItems + 1 });
							} catch (e) {
								console.error(`Error updating space ${s.id}:`, e);
								throw e;
							}
						}),
					);
				} catch (e) {
					console.error("Error in updateSpacesWithContent:", e);
					throw new Error(`Failed to update spaces: ${e.message}`);
				}
			}
		} catch (e) {
			console.error("Error in simulated transaction", e.message);

			message.retry({
				delaySeconds: calculateExponentialBackoff(
					message.attempts,
					BASE_DELAY_SECONDS,
				),
			});
			throw new D1InsertError(
				"Error when inserting into d1",
				"D1 stuff after the vectorize",
			);
		}

		// After the d1 and vectories suceeds then finally update the jobs table to indicate that the job has completed

		await db
			.update(jobs)
			.set({ status: "Processed" })
			.where(eq(jobs.id, jobId));

		return;
	}
}

/*
To do: 
Figure out rate limits!!

*/
