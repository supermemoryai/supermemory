import { xai } from "@ai-sdk/xai"
import { generateText } from "ai"

interface ResearchRequest {
	xUrl: string
	name?: string
	email?: string
}

// prompt to get user context from X/Twitter profile
function finalPrompt(xUrl: string, userContext: string) {
	return `You are researching a user based on their X/Twitter profile to help personalize their experience.

X/Twitter Profile URL: ${xUrl}${userContext}

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
				{ error: "X/Twitter URL is required" },
				{ status: 400 },
			)
		}

		const lowerUrl = xUrl.toLowerCase()
		if (!lowerUrl.includes("x.com") && !lowerUrl.includes("twitter.com")) {
			return Response.json(
				{ error: "URL must be an X/Twitter profile link" },
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
			model: xai("grok-4-1-fast-reasoning"),
			prompt: finalPrompt(xUrl, userContext),
			providerOptions: {
				xai: {
					searchParameters: {
						mode: "on",
						sources: [
							{
								type: "web",
								safeSearch: true,
							},
							{
								type: "x",
								includedXHandles: [lowerUrl.replace("https://x.com/", "").replace("https://twitter.com/", "")],
								postFavoriteCount: 10,
							},
						],
					},
				},
			},
		})

		return Response.json({ text })
	} catch (error) {
		console.error("Research API error:", error)
		return Response.json({ error: "Internal server error" }, { status: 500 })
	}
}
