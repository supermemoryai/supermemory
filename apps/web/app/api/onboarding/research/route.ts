import { xai } from "@ai-sdk/xai"
import { generateText } from "ai"

interface ResearchRequest {
	xUrl: string
	name?: string
	email?: string
}

function extractHandle(input: string): string {
	const trimmed = input.trim()
	if (!trimmed) return ""

	let handle = trimmed.replace(/^@+/, "")
	const lower = handle.toLowerCase()

	if (lower.includes("x.com") || lower.includes("twitter.com")) {
		try {
			const parsed = new URL(
				handle.startsWith("http://") || handle.startsWith("https://")
					? handle
					: `https://${handle}`,
			)
			handle = parsed.pathname.split("/").filter(Boolean)[0] ?? ""
		} catch {
			handle =
				handle.match(/(?:x\.com|twitter\.com)\/([^/\s?#]+)/i)?.[1] ?? ""
		}
	}

	return handle.replace(/^@+/, "").split(/[/?#]/)[0]?.toLowerCase() ?? ""
}

function finalPrompt(handle: string, userContext: string) {
	return `You are researching a user based on their X/Twitter profile to help personalize their experience.

X Handle: @${handle}${userContext}

Please analyze this X/Twitter profile and provide a comprehensive but concise summary of the user. Include:
- Professional background and current role (if available)
- Key interests and topics they engage with
- Notable projects, achievements, or affiliations
- Their expertise areas
- Any other relevant information that helps understand who they are

Format the response as clear, readable paragraphs. Focus on factual information from their profile. If certain information is not available, skip that section rather than speculating.`
}

export async function POST(req: Request) {
	try {
		const { xUrl, name, email }: ResearchRequest = await req.json()

		if (!xUrl?.trim()) {
			return Response.json(
				{ error: "X/Twitter URL or handle is required" },
				{ status: 400 },
			)
		}

		const handle = extractHandle(xUrl)

		if (!/^[A-Za-z0-9_]{1,15}$/.test(handle)) {
			return Response.json(
				{ error: "Could not parse a valid X/Twitter handle from the input" },
				{ status: 400 },
			)
		}

		const contextParts: string[] = []
		if (name) contextParts.push(`Name: ${name}`)
		if (email) contextParts.push(`Email: ${email}`)
		const userContext =
			contextParts.length > 0
				? `\n\nAdditional context about the user:\n${contextParts.join("\n")}`
				: ""

		const { text } = await generateText({
			model: xai.responses("grok-4-fast"),
			prompt: finalPrompt(handle, userContext),
			tools: {
				web_search: xai.tools.webSearch(),
				x_search: xai.tools.xSearch({
					allowedXHandles: [handle],
				}),
			},
		})

		return Response.json({ text })
	} catch (error) {
		console.error("Research API error:", error)
		return Response.json({ error: "Internal server error" }, { status: 500 })
	}
}
