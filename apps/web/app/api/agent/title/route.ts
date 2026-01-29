import { unstable_v2_prompt } from "@anthropic-ai/claude-agent-sdk"
import type { TitleRequest } from "@/lib/agent/types"

export const runtime = "nodejs"

export async function POST(req: Request) {
	try {
		const body: TitleRequest = await req.json()
		const { messages } = body

		if (messages.length === 0) {
			return Response.json({ title: "New Chat" })
		}

		const conversationContext = messages
			.slice(0, 4)
			.map((msg) => `${msg.role}: ${msg.content.slice(0, 500)}`)
			.join("\n\n")

		const prompt = `Generate a short, descriptive title (3-6 words) for this conversation. Return ONLY the title text, no quotes or punctuation at the end.

Conversation:
${conversationContext}

Title:`

		const response = await unstable_v2_prompt(prompt, {
			model: "claude-sonnet-4-20250514",
		})

		let resultText = "New Chat"
		if (response.type === "result" && "result" in response) {
			resultText = (response as { result?: string }).result ?? "New Chat"
		}
		const title = resultText.trim().replace(/^["']|["']$/g, "").slice(0, 100)

		return Response.json({ title })
	} catch (error) {
		console.error("Title route error:", error)
		return Response.json({ title: "New Chat" }, { status: 200 })
	}
}
