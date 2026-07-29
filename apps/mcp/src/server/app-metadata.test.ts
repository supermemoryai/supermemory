import { describe, expect, it } from "vitest"
import { SUPERMEMORY_RESOURCE_URI } from "../shared/types"
import { appResultMeta, appToolMeta } from "./app-metadata"

describe("MCP Apps metadata compatibility", () => {
	it("advertises both current and legacy resource URI metadata", () => {
		expect(appToolMeta()).toEqual({
			ui: { resourceUri: SUPERMEMORY_RESOURCE_URI },
			"ui/resourceUri": SUPERMEMORY_RESOURCE_URI,
		})
	})

	it("keeps App-only tools hidden from the model", () => {
		expect(appToolMeta(["app"])).toMatchObject({
			ui: {
				resourceUri: SUPERMEMORY_RESOURCE_URI,
				visibility: ["app"],
			},
		})
	})

	it("provides a stable ChatGPT widget-state key", () => {
		expect(appResultMeta("view-123")).toEqual({
			"openai/widgetSessionId": "view-123",
		})
	})
})
