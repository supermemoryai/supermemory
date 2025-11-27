import Supermemory from "supermemory"

const client = new Supermemory()
const USER_ID = "dhravya"

const conversation = [
	{ role: "assistant", content: "Hello, how are you doing?" },
	{
		role: "user",
		content: "Hello! I am Dhravya. I am 20 years old. I love to code!",
	},
	{ role: "user", content: "Can I go to the club?" },
]

// Get user profile + relevant memories for context
const profile = await client.profile({
	containerTag: USER_ID,
	q: conversation.at(-1)!.content,
})

const context = `Static profile:
${profile.profile.static.join("\n")}

Dynamic profile:
${profile.profile.dynamic.join("\n")}

Relevant memories:
${profile.searchResults?.results.map((r) => r["content"]).join("\n")}`

// Build messages with memory-enriched context
const messages = [
	{ role: "system", content: `User context:\n${context}` },
	...conversation,
]

// const response = await llm.chat({ messages });

// Store conversation for future context
await client.add({
	content: conversation.map((m) => `${m.role}: ${m.content}`).join("\n"),
	containerTag: USER_ID,
})
