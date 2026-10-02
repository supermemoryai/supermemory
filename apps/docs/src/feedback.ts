import { readRequestBody, validDocsOrigin, type ChatEnvironment } from "./chat"

export async function docsFeedback(request: Request, env: ChatEnvironment) {
	const headers = { "Cache-Control": "no-store" }
	if (request.method !== "POST")
		return new Response("Method not allowed", {
			status: 405,
			headers: { ...headers, Allow: "POST" },
		})
	if (!validDocsOrigin(request, env))
		return Response.json({ error: "Invalid origin" }, { status: 403, headers })
	if (!request.headers.get("Content-Type")?.startsWith("application/json"))
		return Response.json({ error: "Expected JSON" }, { status: 415, headers })
	const { success } = await env.CHAT_RATE_LIMITER.limit({
		key: `feedback:${request.headers.get("CF-Connecting-IP") ?? "local"}`,
	})
	if (!success)
		return Response.json(
			{ error: "Rate limited" },
			{ status: 429, headers: { ...headers, "Retry-After": "60" } },
		)
	let page: URL
	let helpful: boolean
	try {
		const body = JSON.parse(await readRequestBody(request, 2_000))
		if (typeof body.helpful !== "boolean" || typeof body.page !== "string")
			throw new Error("Invalid feedback")
		page = new URL(body.page, "https://supermemory.ai")
		if (
			page.origin !== "https://supermemory.ai" ||
			!page.pathname.startsWith("/docs/") ||
			page.search ||
			page.hash
		)
			throw new Error("Invalid page")
		helpful = body.helpful
	} catch {
		return Response.json(
			{ error: "Invalid feedback" },
			{ status: 400, headers },
		)
	}
	if (!env.DOCS_FEEDBACK)
		return Response.json(
			{ error: "Feedback is not configured" },
			{ status: 503, headers },
		)
	env.DOCS_FEEDBACK.writeDataPoint({
		indexes: [page.pathname],
		blobs: [page.pathname],
		doubles: [helpful ? 1 : 0],
	})
	return new Response(null, { status: 204, headers })
}
