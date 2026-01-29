import { unstable_v2_prompt } from "@anthropic-ai/claude-agent-sdk"
import type { FollowUpRequest } from "@/lib/agent/types"

export const runtime = "nodejs"

export async function POST(req: Request) {
	try {
		const body: FollowUpRequest = await req.json()
		const { messages } = body

		const conversationContext = messages
			.slice(-5)
			.map((msg) => `${msg.role}: ${msg.content}`)
			.join("\n\n")

		const prompt = `Based on this conversation, generate exactly 3 brief follow-up questions that the user might want to ask next. Return ONLY a JSON array of strings, no other text.

Conversation:
${conversationContext}

Return format: ["question 1", "question 2", "question 3"]`

		const response = await unstable_v2_prompt(prompt, {
			model: "claude-sonnet-4-20250514",
		})

		let questions: string[] = []

		let resultText = ""
		if (response.type === "result" && "result" in response) {
			resultText = (response as { result?: string }).result ?? ""
		}

		try {
			const jsonMatch = resultText.match(/\[[\s\S]*\]/)
			if (jsonMatch) {
				questions = JSON.parse(jsonMatch[0])
			}
		} catch {
			const lines = resultText.split("\n").filter((line: string) => line.trim())
			questions = lines.slice(0, 3).map((line: string) =>
				line.replace(/^[\d\.\-\*\s]+/, "").replace(/["\[\]]/g, "").trim()
			)
		}

		return Response.json({ questions: questions.slice(0, 3) })
	} catch (error) {
		console.error("Follow-ups route error:", error)
		return Response.json({ questions: [] }, { status: 200 })
	}
}
