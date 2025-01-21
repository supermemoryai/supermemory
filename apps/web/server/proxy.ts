import { AppLoadContext } from "@remix-run/cloudflare";

export const proxy = async (
	path: string,
	requestOptions: RequestInit,
	originalRequest: Request,
	context: AppLoadContext,
) => {
	try {
		// update the request headers to add the cookie
		const requestHeaders = new Headers(requestOptions.headers);
		requestHeaders.set("Cookie", originalRequest.headers.get("Cookie") || "");

		const backendUrl =
			context.cloudflare.env.BACKEND_URL ?? "https://supermemory-backend.dhravya.workers.dev";

		const response = await fetch(`${backendUrl}${path}`, {
			...requestOptions,
			headers: requestHeaders,
		});

		if (!response.ok) {
			console.error("Proxy request failed", await response.text());
			return new Response(JSON.stringify({ error: "Proxy request failed" }), {
				status: response.status,
				headers: {
					"Content-Type": "application/json",
				},
			});
		}

		return response;
	} catch (error) {
		console.error("Proxy request failed:", error);
		return new Response(JSON.stringify({ error: "Proxy request failed" }), {
			status: 500,
			headers: {
				"Content-Type": "application/json",
			},
		});
	}
};
