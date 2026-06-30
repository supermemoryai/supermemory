const UPSTREAM_BASE = "https://supermemory.mintlify.dev";
const CACHE_TTL = 300; // 5 minutes
const FETCH_TIMEOUT_MS = 10000; // 10 seconds

export default {
	async fetch(request: Request): Promise<Response> {
		const url = new URL(request.url);
		const proxyUrl = UPSTREAM_BASE + url.pathname + url.search;

		const cache = caches.default;

		if (request.method === "GET") {
			const cached = await cache.match(request);
			if (cached) return cached;
		}

		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

		try {
			const proxyRequest = new Request(proxyUrl, request);
			const response = await fetch(proxyRequest, { signal: controller.signal });

			if (request.method === "GET" && response.ok) {
				const cachedResponse = new Response(response.clone().body, response);
				cachedResponse.headers.set("Cache-Control", `public, max-age=${CACHE_TTL}`);
				await cache.put(request, cachedResponse);
			}

			return response;
		} catch (e) {
			if (e instanceof Error && e.name === "AbortError") {
				return new Response(
					"Documentation temporarily unavailable. Please try again in a moment.",
					{
						status: 504,
						headers: { "Content-Type": "text/plain; charset=utf-8" },
					},
				);
			}
			throw e;
		} finally {
			clearTimeout(timeoutId);
		}
	},
};
