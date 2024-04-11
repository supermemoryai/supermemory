interface Env {
	VECTORIZE_INDEX: VectorizeIndex;
	AI: Fetcher;
	SECURITY_KEY: string;
	OPENAI_API_KEY: string;
	GOOGLE_AI_API_KEY: string;
	MY_QUEUE: Queue<TweetData>;
}

interface TweetData {
	tweetText: string;
	postUrl: string;
	authorName: string;
	handle: string;
	time: string;
}
