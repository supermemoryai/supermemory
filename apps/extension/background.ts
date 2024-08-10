import { Tweet } from "react-tweet/api";
import { features, transformTweetData } from "./helpers";

const tweetToMd = (tweet: Tweet) => {
	return `Tweet from @${tweet.user?.name ?? tweet.user?.screen_name ?? "Unknown"}
  
      ${tweet.text}
      Images: ${tweet.photos ? tweet.photos.map((photo) => photo.url).join(", ") : "none"}
      Time: ${tweet.created_at}, Likes: ${tweet.favorite_count}, Retweets: ${tweet.conversation_count}
      
       <raw>${JSON.stringify(tweet)}</raw>`;
};

const BOOKMARKS_URL = `https://x.com/i/api/graphql/xLjCVTqYWz8CGSprLU349w/Bookmarks?features=${encodeURIComponent(JSON.stringify(features))}`;

const BACKEND_URL = "https://supermemory.ai";
const INITIAL_WAIT_TIME = 60000; // 1 minute in milliseconds
let waitTime = INITIAL_WAIT_TIME;
let lastTwitterFetch = 0;

const batchImportAll = async (cursor = "", totalImported = 0) => {
	chrome.storage.session.get(["cookie", "csrf", "auth"], async (result) => {
		if (!result.cookie || !result.csrf || !result.auth) {
			return;
		}

		const myHeaders = new Headers();
		myHeaders.append("Cookie", result.cookie);
		myHeaders.append("X-Csrf-token", result.csrf);
		myHeaders.append("Authorization", result.auth);

		const requestOptions: RequestInit = {
			method: "GET",
			headers: myHeaders,
			redirect: "follow",
		};

		const variables = {
			count: 100,
			cursor: cursor,
			includePromotedContent: false,
		};

		const urlWithCursor = cursor
			? `${BOOKMARKS_URL}&variables=${encodeURIComponent(JSON.stringify(variables))}`
			: BOOKMARKS_URL;

		let batchImportedCount = 0;

		try {
			const response = await fetch(urlWithCursor, requestOptions);
			if (!response.ok) {
				if (response.status === 429) {
					console.error("Rate limit exceeded");
					await handleRateLimit();
					return batchImportAll(cursor, totalImported); // Retry after waiting
				} else {
					console.error("Error fetching bookmarks", response.status);
					throw new Error("Failed to fetch data");
				}
			}

			const data = await response.json();
			const tweets = getAllTweets(data);

			for (const tweet of tweets) {
				console.log(tweet);

				const tweetMd = tweetToMd(tweet);
				try {
					await importTweet(tweetMd, tweet);
					batchImportedCount++;
					totalImported++;
					console.log("Total imported:", totalImported);
					await updateImportProgress(totalImported);
				} catch (error) {
					console.error("Error importing tweet:", error);
					await handleSupermemoryError();
					return; // Stop the process
				}
			}

			console.log("tweets", tweets);
			console.log("data", data);

			const instructions =
				data.data?.bookmark_timeline_v2?.timeline?.instructions;
			const lastInstruction = instructions?.[0].entries.pop();

			if (lastInstruction?.entryId.startsWith("cursor-bottom-")) {
				let nextCursor = lastInstruction?.content?.value;

				if (!nextCursor) {
					for (let i = instructions.length - 1; i >= 0; i--) {
						if (instructions[i].entryId.startsWith("cursor-bottom-")) {
							nextCursor = instructions[i].content.value;
							break;
						}
					}
				}

				if (nextCursor) {
					await new Promise((resolve) => setTimeout(resolve, 1000)); // 1 second delay between batches
					batchImportAll(nextCursor, totalImported); // Recursively call with new cursor
				} else {
					await sendImportDoneMessage(totalImported);
				}
			} else {
				await sendImportDoneMessage(totalImported);
			}

			// Reset wait time after successful import
			waitTime = INITIAL_WAIT_TIME;
		} catch (error) {
			console.error(error);
			await handleRateLimit();
			batchImportAll(cursor, totalImported); // Retry after waiting
		}
	});
};

const handleRateLimit = async () => {
	const waitTimeInSeconds = waitTime / 1000;
	console.log(`Waiting for ${waitTimeInSeconds} seconds due to rate limit...`);
	await sendMessageToCurrentTab(
		`Rate limit reached. Waiting for ${waitTimeInSeconds} seconds before retrying...`,
	);
	await new Promise((resolve) => setTimeout(resolve, waitTime));
	waitTime *= 2; // Double the wait time for next potential rate limit
};

const handleSupermemoryError = async () => {
	const errorMessage =
		"ALERT: Supermemory is unable to save tweets right now. Please contact support at feedback@supermemory.ai";
	console.error(errorMessage);
	await sendMessageToCurrentTab(errorMessage);
};

const sendMessageToCurrentTab = async (message: string) => {
	const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
	if (tabs.length > 0 && tabs[0].id) {
		await chrome.tabs.sendMessage(tabs[0].id, {
			type: "import-update",
			importedMessage: message,
		});
	}
};

const updateImportProgress = async (totalImported: number) => {
	await sendMessageToCurrentTab(`Imported ${totalImported} tweets`);
};

const importTweet = async (tweetMd: string, tweet: Tweet) => {
	return new Promise<void>((resolve, reject) => {
		chrome.storage.local.get(["jwt"], ({ jwt }) => {
			if (!jwt) {
				console.error("No JWT found");
				reject(new Error("No JWT found"));
				return;
			}
			fetch(`${BACKEND_URL}/api/store`, {
				method: "POST",
				headers: {
					Authorization: `Bearer ${jwt}`,
				},
				body: JSON.stringify({
					pageContent: tweetMd,
					url: `https://twitter.com/supermemoryai/status/${tweet.id_str}`,
					title: `Tweet by ${tweet.user.name}`,
					description: tweet.text.slice(0, 200),
					type: "tweet",
				}),
			})
				.then(async (response) => {
					if (!response.ok) {
						console.log(
							"Supermemory error",
							response.status,
							await response.text(),
						);
						reject(new Error("Failed to save tweet to Supermemory"));
					} else {
						console.log("Tweet saved successfully");
						resolve();
					}
				})
				.catch(reject);
		});
	});
};

const sendImportDoneMessage = async (totalImported: number) => {
	console.log("All bookmarks imported");
	await chrome.runtime.sendMessage({
		type: "import-done",
		importedCount: totalImported,
	});
};

chrome.webRequest.onBeforeSendHeaders.addListener(
	(details) => {
		if (
			!(details.url.includes("x.com") || details.url.includes("twitter.com"))
		) {
			return;
		}
		const authHeader = details.requestHeaders!.find(
			(header) => header.name.toLowerCase() === "authorization",
		);
		const auth = authHeader ? authHeader.value : "";

		const cookieHeader = details.requestHeaders!.find(
			(header) => header.name.toLowerCase() === "cookie",
		);
		const cookie = cookieHeader ? cookieHeader.value : "";

		const csrfHeader = details.requestHeaders!.find(
			(header) => header.name.toLowerCase() === "x-csrf-token",
		);
		const csrf = csrfHeader ? csrfHeader.value : "";

		if (!auth || !cookie || !csrf) {
			console.log("auth, cookie, or csrf is missing");
			return;
		}
		chrome.storage.session.set({ cookie, csrf, auth });
		chrome.storage.local.get(["twitterBookmarks"], (result) => {
			console.log("twitterBookmarks", result.twitterBookmarks);
			if (result.twitterBookmarks !== "true") {
				console.log("twitterBookmarks is NOT true");
			} else {
				if (
					!details.requestHeaders ||
					details.requestHeaders.length === 0 ||
					details.requestHeaders === undefined
				) {
					return;
				}

				// Check cache first
				chrome.storage.local.get(["lastFetch", "cachedData"], (result) => {
					const now = new Date().getTime();
					if (result.lastFetch && now - result.lastFetch < 30 * 60 * 1000) {
						// Cached data is less than 30 minutes old, use it
						console.log("Using cached data");
						console.log(result.cachedData);
						return;
					}

					// No valid cache, proceed to fetch
					const authHeader = details.requestHeaders!.find(
						(header) => header.name.toLowerCase() === "authorization",
					);
					const auth = authHeader ? authHeader.value : "";

					const cookieHeader = details.requestHeaders!.find(
						(header) => header.name.toLowerCase() === "cookie",
					);
					const cookie = cookieHeader ? cookieHeader.value : "";

					const csrfHeader = details.requestHeaders!.find(
						(header) => header.name.toLowerCase() === "x-csrf-token",
					);
					const csrf = csrfHeader ? csrfHeader.value : "";

					if (!auth || !cookie || !csrf) {
						console.log("auth, cookie, or csrf is missing");
						return;
					}
					chrome.storage.session.set({ cookie, csrf, auth });

					const myHeaders = new Headers();
					myHeaders.append("Cookie", cookie);
					myHeaders.append("X-Csrf-token", csrf);
					myHeaders.append("Authorization", auth);

					const requestOptions: RequestInit = {
						method: "GET",
						headers: myHeaders,
						redirect: "follow",
					};

					const variables = {
						count: 200,
						includePromotedContent: false,
					};

					// only fetch once in 1 minute
					if (now - lastTwitterFetch < 60 * 1000) {
						console.log("Waiting for ratelimits");
						return;
					}

					fetch(
						`${BOOKMARKS_URL}&variables=${encodeURIComponent(JSON.stringify(variables))}`,
						requestOptions,
					)
						.then((response) => response.text())
						.then((result) => {
							const tweets = getAllTweets(JSON.parse(result));

							console.log("tweets", tweets);
							// Cache the result along with the current timestamp
							chrome.storage.local.set({
								lastFetch: new Date().getTime(),
								cachedData: tweets,
							});

							lastTwitterFetch = now;
						})
						.catch((error) => console.error(error));
				});
				return;
			}
		});
	},
	{ urls: ["*://x.com/*", "*://twitter.com/*"] },
	["requestHeaders", "extraHeaders"],
);

const getAllTweets = (rawJson: any): Tweet[] => {
	const entries =
		rawJson?.data?.bookmark_timeline_v2?.timeline?.instructions[0]?.entries;

	console.log("Entries: ", entries);

	if (!entries) {
		console.error("No entries found");
		return [];
	}

	const tweets = entries
		.map((entry: any) => transformTweetData(entry))
		.filter((tweet: Tweet | null) => tweet !== null) as Tweet[];

	console.log(tweets);

	return tweets;
};

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
	console.log(request);
	if (request.type === "getJwt") {
		chrome.storage.local.get(["jwt"], ({ jwt }) => {
			sendResponse({ jwt });
		});

		return true;
	} else if (request.type === "urlSave") {
		const content = request.content;
		const url = request.url;
		const title = request.title;
		const description = request.description;
		const ogImage = request.ogImage;
		const favicon = request.favicon;
		console.log(request.content, request.url);

		(async () => {
			chrome.storage.local.get(["jwt"], ({ jwt }) => {
				if (!jwt) {
					console.error("No JWT found");
					return;
				}
				fetch(`${BACKEND_URL}/api/store`, {
					method: "POST",
					headers: {
						Authorization: `Bearer ${jwt}`,
					},
					body: JSON.stringify({
						pageContent: content,
						url: url + "#supermemory-user-" + Math.random(),
						title,
						spaces: request.spaces,
						description,
						ogImage,
						image: favicon,
					}),
				}).then((ers) => console.log(ers.status));
			});
		})();
	} else if (request.type === "batchImportAll") {
		batchImportAll();
		return true;
	}
});

chrome.runtime.onInstalled.addListener(function (details) {
	if (details.reason === "install") {
		chrome.tabs.create({
			url: "https://supermemory.ai/signin?extension=true",
			active: true,
		});
	}
});

chrome.runtime.onInstalled.addListener(() => {
	chrome.contextMenus.create({
		id: "saveSelection",
		title: "Save note to Supermemory",
		contexts: ["selection"],
	});

	chrome.contextMenus.create({
		id: "savePage",
		title: "Save page to Supermemory",
		contexts: ["page"],
	});

	// TODO
	// chrome.contextMenus.create({
	//   id: 'saveLink',
	//   title: 'Save link to Supermemory',
	//   contexts: ['link'],
	// });
});

interface FetchDataParams {
	content: string;
	url: string;
	title: string;
	description: string;
	ogImage: string;
	favicon: string;
	isExternalContent: boolean; // Indicates if the content is from an external API
}

const fetchData = ({
	content,
	url,
	title,
	description,
	ogImage,
	favicon,
	isExternalContent,
}: FetchDataParams) => {
	// Construct the URL
	const finalUrl = isExternalContent
		? url
		: `${url}#supermemory-stuff-${Math.random()}`;

	// Construct the body
	const body = JSON.stringify({
		pageContent: content,
		url: finalUrl,
		title,
		spaces: [],
		description,
		ogImage,
		image: favicon,
	});

	// Make the fetch call
	fetch(`${BACKEND_URL}/api/store`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: body,
	})
		.then((response) => {
			console.log("Data saved successfully");
		})
		.catch((error) => {
			console.error("Error saving data:", error);
		});

	return Promise.resolve();
};

chrome.contextMenus.onClicked.addListener((info, tab) => {
	if (!tab || !tab.id) return;

	const tabId = tab.id;

	const sendMessageToTab = (message: string) => {
		chrome.tabs.sendMessage(tabId, { message, type: "supermemory-message" });
	};

	if (info.menuItemId === "saveSelection" && info.selectionText) {
		sendMessageToTab("Saving selection...");
		fetchData({
			content: info.selectionText || "No content",
			url: info.pageUrl,
			title: tab.title || "Selection Title",
			description: "User-selected content from the page",
			ogImage: "",
			favicon: "",
			isExternalContent: false,
		})
			.then(() => {
				sendMessageToTab("Selection saved successfully.");
			})
			.catch(() => {
				sendMessageToTab("Failed to save selection.");
			});
	} else if (info.menuItemId === "savePage") {
		sendMessageToTab("Saving page...");
		chrome.scripting.executeScript(
			{
				target: { tabId: tabId },
				func: () => document.body.innerText,
			},
			(results) => {
				if (results.length > 0 && results[0].result) {
					fetchData({
						content: results[0].result as string,
						url: info.pageUrl,
						title: tab.title || "Page Title",
						description: "Full page content",
						ogImage: "",
						favicon: "",
						isExternalContent: false,
					})
						.then(() => {
							sendMessageToTab("Page saved successfully.");
						})
						.catch(() => {
							sendMessageToTab("Failed to save page.");
						});
				}
			},
		);
	}
});
