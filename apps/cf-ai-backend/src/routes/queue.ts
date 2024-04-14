import { CloudflareVectorizeStore } from '@langchain/cloudflare';
import { OpenAIEmbeddings } from '../OpenAIEmbedder';
import { seededRandom } from '../util';

export const queue = async (batch: MessageBatch, env: Env): Promise<void> => {
	const messages = batch.messages[0].body as TweetData[];

	const token = messages[0].saveToUser;

	if (!token) {
		return;
	}

	const limits = (await fetch('https://supermemory.dhr.wtf/api/getCount', {
		headers: {
			Authorization: `Bearer ${token}`,
		},
	}).then((res) => res.json())) as { tweetsLimit: number; tweetsCount: number; user: string };

	if (messages.length > limits.tweetsLimit - limits.tweetsCount) {
		messages.splice(limits.tweetsLimit - limits.tweetsCount);
	}

	if (messages.length === 0) {
		return;
	}

	const embeddings = new OpenAIEmbeddings({
		apiKey: env.OPENAI_API_KEY,
		modelName: 'text-embedding-3-small',
	});

	const store = new CloudflareVectorizeStore(embeddings, {
		index: env.VECTORIZE_INDEX,
	});

	const collectedDocsUUIDs: {
		document: {
			pageContent: string;
			metadata: { title: string; description: string; space?: string; url: string; user: string };
			id: string;
		};
	}[] = [];

	messages.forEach(async (message) => {
		const ourID = `${message.postUrl}-${limits.user}`;

		const random = seededRandom(ourID);
		const uuid = random().toString(36).substring(2, 15) + random().toString(36).substring(2, 15);

		await env.KV.put(uuid, ourID);
		const pageContent = `This is a tweet from ${message.authorName}, it was posted on ${message.time}. The tweet reads: ${message.tweetText}`;

		collectedDocsUUIDs.push({
			document: {
				pageContent,
				metadata: {
					title: 'Twitter Bookmark',
					description: '',
					url: message.postUrl,
					user: limits.user,
				},
				id: uuid,
			},
		});
	});

	console.log(collectedDocsUUIDs);

	await store.addDocuments(
		collectedDocsUUIDs.map(({ document }) => document),
		{
			ids: collectedDocsUUIDs.map(({ document }) => document.id),
		},
	);

	console.log(token);

	const res = await fetch('https://supermemory.dhr.wtf/api/addTweetsToDb', {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${token}`,
		},
		body: JSON.stringify(messages),
	});

	console.log(res.status, res.statusText);

	if (res.status !== 200) {
		console.log(await res.json());
		console.error('Error adding tweets to db');
	}

	console.log(`consumed from our queue: ${messages}`);
};
