import { app } from "@holocron.so/vite/app"
import { docsChat, type ChatEnvironment } from "./chat"
import { docsMcp } from "./mcp"
import "../style.css"

export { app }

export default {
	async fetch(request: Request, env: ChatEnvironment): Promise<Response> {
		if (new URL(request.url).pathname === "/docs/api/chat") {
			return docsChat(request, env)
		}
		if (new URL(request.url).pathname === "/docs/mcp") {
			return docsMcp(request, env)
		}
		return app.handle(request)
	},
}
