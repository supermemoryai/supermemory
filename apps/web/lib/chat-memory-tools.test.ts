import { describe, expect, it } from "bun:test"
import { extractHighlightDocumentIdsFromMessages } from "./chat-highlight-documents"
import {
	buildCitationIndex,
	extractDocumentIdsFromMemoryOutput,
	extractMemoryToolOutputs,
	getDocumentSourceUrl,
	MAX_INLINE_GRAPH_DOCUMENT_IDS,
	mapDocumentsByKnownIds,
} from "./chat-memory-tools"

const assistantMessage = {
	id: "m1",
	role: "assistant",
	parts: [
		{
			type: "tool-recallContext",
			state: "output-available",
			output: {
				sourceIds: ["S1"],
				documentIds: ["topDoc"],
				results: [
					{
						citationId: "S1",
						content: "memo",
						document: {
							id: "docA",
							customId: "customA",
							title: "Doc A",
							type: "google_doc",
							summary: "sum",
						},
					},
				],
			},
		},
		{
			type: "tool-discoverSpaces",
			state: "input-streaming",
			output: { sourceIds: ["ignored"], documentIds: ["ignoredDoc"] },
		},
		{
			type: "text",
			text: 'Answer <response source="S1">from memory</response>',
		},
	],
} as const

describe("chat memory tool citation mapping", () => {
	it("extracts only ready memory tool outputs", () => {
		const outputs = extractMemoryToolOutputs({
			parts: [
				...assistantMessage.parts,
				{
					type: "tool-searchMemories",
					state: "done",
					output: { sourceIds: ["done"], documentIds: ["doneDoc"] },
				},
				{
					type: "tool-searchMemories",
					output: { sourceIds: ["stateless"], documentIds: ["statelessDoc"] },
				},
			],
		})

		expect(outputs).toHaveLength(3)
		expect(outputs.map((output) => output.output.sourceIds?.[0])).toEqual([
			"S1",
			"done",
			"stateless",
		])
	})

	it("maps citation ids to document and custom ids", () => {
		const [output] = extractMemoryToolOutputs(assistantMessage)
		const index = buildCitationIndex(output ? [output] : [])

		expect(index.get("S1")?.documentId).toBe("docA")
		expect(index.get("S1")?.customId).toBe("customA")
		expect(index.has("ignored")).toBe(false)
	})

	it("ignores unsafe citation ids when building citation links", () => {
		const index = buildCitationIndex([
			{
				output: {
					results: [
						{
							citationId: "bad/id",
							document: { id: "docA" },
						},
					],
				},
			},
		])

		expect(index.has("bad/id")).toBe(false)
	})

	it("extracts graph highlight document ids from memory outputs", () => {
		const [output] = extractMemoryToolOutputs(assistantMessage)

		expect(output && extractDocumentIdsFromMemoryOutput(output.output)).toEqual(
			["topDoc", "docA", "customA"],
		)
		expect(
			extractHighlightDocumentIdsFromMessages([assistantMessage as never]),
		).toEqual(["topDoc", "docA", "customA"])
	})

	it("dedupes and caps graph highlight document ids", () => {
		const documentIds = Array.from(
			{ length: MAX_INLINE_GRAPH_DOCUMENT_IDS + 5 },
			(_, index) => `doc-${index}`,
		)

		expect(
			extractDocumentIdsFromMemoryOutput({
				documentIds: ["doc-0", ...documentIds],
				results: [{ id: "doc-1", documentIds: ["doc-2"] }],
			}),
		).toEqual(documentIds.slice(0, MAX_INLINE_GRAPH_DOCUMENT_IDS))
	})

	it("keeps graph highlights for legacy memory tool states and ids", () => {
		const legacyMessage = {
			id: "legacy",
			role: "assistant",
			parts: [
				{
					type: "tool-searchMemories",
					state: "done",
					output: { results: [{ id: "legacyDoc" }] },
				},
				{
					type: "tool-recallContext",
					output: { documentIds: ["statelessDoc"] },
				},
			],
		} as const

		expect(extractMemoryToolOutputs(legacyMessage)).toHaveLength(2)
		expect(
			extractHighlightDocumentIdsFromMessages([legacyMessage as never]),
		).toEqual(["legacyDoc", "statelessDoc"])
	})

	it("normalizes nested discoverSpaces memory results", () => {
		const outputs = extractMemoryToolOutputs({
			parts: [
				{
					type: "tool-discoverSpaces",
					state: "output-available",
					output: {
						spaces: [
							{
								sourceIds: ["S2"],
								documentIds: ["spaceDoc"],
								results: [{ citationId: "S2", documentIds: ["nestedDoc"] }],
							},
						],
					},
				},
			],
		})

		const index = buildCitationIndex(outputs)
		expect(index.get("S2")?.documentId).toBe("nestedDoc")
		expect(
			extractDocumentIdsFromMemoryOutput(outputs[0]?.output ?? {}),
		).toEqual(["spaceDoc", "nestedDoc"])
	})

	it("builds editable Google source URLs from custom ids and API URLs", () => {
		expect(
			getDocumentSourceUrl({
				type: "google_doc",
				customId: "docCustom",
				url: "https://docs.googleapis.com/v1/documents/apiDoc",
			} as never),
		).toBe("https://docs.google.com/document/d/docCustom/edit")
		expect(
			getDocumentSourceUrl({
				type: "google_doc",
				url: "https://docs.googleapis.com/v1/documents/apiDoc",
			} as never),
		).toBe("https://docs.google.com/document/d/apiDoc/edit")
		expect(
			getDocumentSourceUrl({
				type: "google_sheet",
				url: "https://sheets.googleapis.com/v4/spreadsheets/sheetId/values/A1",
			} as never),
		).toBe("https://docs.google.com/spreadsheets/d/sheetId/edit")
		expect(
			getDocumentSourceUrl({
				type: "google_slide",
				url: "https://slides.googleapis.com/v1/presentations/slideId/pages",
			} as never),
		).toBe("https://docs.google.com/presentation/d/slideId/edit")
	})

	it("maps documents by all known ids", () => {
		const mapped = mapDocumentsByKnownIds([
			{ id: "docA", customId: "customA", type: "text", url: null } as never,
		])
		expect(mapped.get("docA")?.id).toBe("docA")
		expect(mapped.get("customA")?.id).toBe("docA")
	})
})
