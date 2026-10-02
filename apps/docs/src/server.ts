import { app } from "@holocron.so/vite/app"
import { docsChat, type ChatEnvironment } from "./chat"
import { docsMcp } from "./mcp"
import { docsFeedback } from "./feedback"
import "../style.css"

export { app }

export default {
	async fetch(request: Request, env: ChatEnvironment): Promise<Response> {
		if (new URL(request.url).pathname === "/docs/api/feedback") {
			return docsFeedback(request, env)
		}
		if (new URL(request.url).pathname === "/docs/api/chat") {
			return docsChat(request, env)
		}
		if (new URL(request.url).pathname === "/docs/mcp") {
			return docsMcp(request, env)
		}
		const response = await app.handle(request)
		const redirectHeader = response.headers.has("x-spiceflow-redirect")
			? "x-spiceflow-redirect"
			: "Location"
		const location = response.headers.get(redirectHeader)
		if (!location) return response
		const target = new URL(location, request.url)
		if (target.origin !== new URL(request.url).origin) return response
		if (redirectHeader === "x-spiceflow-redirect")
			target.searchParams.delete("__rsc")
		const headers = new Headers(response.headers)
		headers.set(
			redirectHeader,
			`${target.pathname}${target.search}${target.hash}`,
		)
		return new Response(response.body, {
			status: response.status,
			statusText: response.statusText,
			headers,
		})
	},
}
