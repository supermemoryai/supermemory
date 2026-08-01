import { describe, expect, it } from "bun:test"
import {
	detectNovaKnowledgeBaseConnectIntent,
	deriveKnowledgeConnectorState,
	isNovaKnowledgeBaseProvider,
} from "./chat-knowledge-connectors"

describe("Nova knowledge connector state", () => {
	it("reports live document and connection counts", () => {
		expect(
			deriveKnowledgeConnectorState({
				provider: "notion",
				fallbackStatus: "not_connected",
				connections: [
					{
						provider: "notion",
						metadata: { documentCount: 8 },
						lastSyncRun: {
							status: "completed",
							completedAt: "2026-07-31T12:00:00.000Z",
						},
					},
				],
			}),
		).toEqual({
			status: "active",
			connectionCount: 1,
			documentCount: 8,
			lastSyncStatus: "completed",
			lastSyncAt: "2026-07-31T12:00:00.000Z",
		})
	})

	it("preserves upgrade restrictions while refreshing connection state", () => {
		expect(
			deriveKnowledgeConnectorState({
				provider: "onedrive",
				fallbackStatus: "upgrade_required",
				connections: [{ provider: "onedrive" }],
			}).status,
		).toBe("upgrade_required")
	})

	it("recognizes only supported knowledge-base providers", () => {
		expect(isNovaKnowledgeBaseProvider("granola")).toBe(true)
		expect(isNovaKnowledgeBaseProvider("dropbox")).toBe(false)
	})

	it("detects explicit connection requests without treating status questions as actions", () => {
		expect(
			detectNovaKnowledgeBaseConnectIntent("Connect my Notion workspace"),
		).toBe("notion")
		expect(
			detectNovaKnowledgeBaseConnectIntent("Please link Google Drive"),
		).toBe("google-drive")
		expect(
			detectNovaKnowledgeBaseConnectIntent("Is Notion connected?"),
		).toBeNull()
	})
})
