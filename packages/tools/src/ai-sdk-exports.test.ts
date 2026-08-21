import { describe, expect, it } from "vitest"
import {
	type MemoryPromptData,
	type PromptTemplate,
	type WithSupermemoryOptions,
	withSupermemory,
} from "./ai-sdk"

// The documented custom prompt-template example (packages/tools/README.md and
// apps/docs/integrations/ai-sdk.mdx) imports these types from this entry point.
// `./vercel` is not listed in the package's `exports` map, so there is nowhere
// else a consumer can reach them from: dropping the re-export again breaks
// every documented `promptTemplate` snippet at compile time. Importing and
// using them here makes `check-types` fail if that happens.
describe("@supermemory/tools/ai-sdk public surface", () => {
	it("re-exports the middleware wrapper", () => {
		expect(typeof withSupermemory).toBe("function")
	})

	it("types the documented promptTemplate example", () => {
		const claudePrompt: PromptTemplate = (data: MemoryPromptData) =>
			`<context><user_profile>${data.userMemories}</user_profile><relevant_memories>${data.generalSearchMemories}</relevant_memories></context>`

		const options: WithSupermemoryOptions = {
			containerTag: "user-123",
			customId: "conv-1",
			mode: "full",
			promptTemplate: claudePrompt,
		}

		expect(
			options.promptTemplate?.({
				userMemories: "- Prefers TypeScript",
				generalSearchMemories: "- Asked about zod",
				searchResults: [{ memory: "Prefers TypeScript" }],
			}),
		).toBe(
			"<context><user_profile>- Prefers TypeScript</user_profile><relevant_memories>- Asked about zod</relevant_memories></context>",
		)
	})
})
