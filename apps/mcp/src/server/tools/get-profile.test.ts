import { describe, expect, it } from "vitest"
import * as getProfile from "./get-profile"
import type { ToolDeps } from "./types"

function registerProfile(client: {
	getProfile: () => Promise<{
		profile: { static: string[]; dynamic: string[] }
	}>
}) {
	let handler:
		| ((args: { containerTag?: string }) => Promise<unknown>)
		| undefined

	getProfile.register({
		server: {
			registerTool: (
				_name: string,
				_config: unknown,
				registered: (args: { containerTag?: string }) => Promise<unknown>,
			) => {
				handler = registered
			},
		},
		resolveContainerTag: async (tag?: string) => tag ?? "sm_project_default",
		getClient: () => client,
		errorResult: (error: unknown) => ({
			content: [
				{
					type: "text" as const,
					text: error instanceof Error ? error.message : "error",
				},
			],
			isError: true,
		}),
	} as unknown as ToolDeps)

	if (!handler) throw new Error("get_profile was not registered")
	return handler
}

describe("get_profile", () => {
	it("returns stable and recent profile facts for the resolved space", async () => {
		const handler = registerProfile({
			getProfile: async () => ({
				profile: {
					static: ["User is a software engineer"],
					dynamic: ["User is debugging auth"],
				},
			}),
		})

		const result = (await handler({ containerTag: "team_eng" })) as {
			content: Array<{ text: string }>
			structuredContent: {
				containerTag: string
				profile: { static: string[]; dynamic: string[] }
			}
		}

		expect(result.structuredContent).toEqual({
			containerTag: "team_eng",
			profile: {
				static: ["User is a software engineer"],
				dynamic: ["User is debugging auth"],
			},
		})
		expect(result.content[0]?.text).toContain("## Stable Context")
		expect(result.content[0]?.text).toContain("User is a software engineer")
		expect(result.content[0]?.text).toContain("## Recent Context")
		expect(result.content[0]?.text).toContain("User is debugging auth")
	})

	it("says when the space has no profile facts yet", async () => {
		const handler = registerProfile({
			getProfile: async () => ({
				profile: { static: [], dynamic: [] },
			}),
		})

		const result = (await handler({})) as {
			content: Array<{ text: string }>
		}

		expect(result.content[0]?.text).toBe(
			"No profile facts are available for this space yet.",
		)
	})
})
