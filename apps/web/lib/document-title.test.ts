import { describe, expect, it } from "bun:test"
import { resolveDocumentTitle } from "./document-title"

const fromContent = (content: string | null | undefined) =>
	resolveDocumentTitle({ content })

describe("resolveDocumentTitle precedence", () => {
	it("prefers metadata.title over everything", () => {
		expect(
			resolveDocumentTitle({
				title: "LLM paraphrase",
				metadata: { title: "Pinned" },
				content: "# Derived",
			}),
		).toBe("Pinned")
	})

	it("falls back to the stored title", () => {
		expect(
			resolveDocumentTitle({ title: "Stored", content: "# Derived" }),
		).toBe("Stored")
	})

	it("derives from content when titling produced nothing", () => {
		expect(resolveDocumentTitle({ title: null, content: "# Derived" })).toBe(
			"Derived",
		)
	})

	it("skips blank and non-string candidates", () => {
		expect(resolveDocumentTitle({ title: "   ", content: "# Derived" })).toBe(
			"Derived",
		)
		expect(
			resolveDocumentTitle({ metadata: { title: "  " }, content: "# Derived" }),
		).toBe("Derived")
		expect(
			resolveDocumentTitle({ metadata: { title: 42 }, content: "# Derived" }),
		).toBe("Derived")
		expect(
			resolveDocumentTitle({ metadata: { title: null }, title: "Stored" }),
		).toBe("Stored")
	})

	it("survives odd metadata shapes", () => {
		expect(resolveDocumentTitle({ metadata: null, title: "Stored" })).toBe(
			"Stored",
		)
		expect(
			resolveDocumentTitle({
				metadata: [] as unknown as Record<string, unknown>,
				title: "Stored",
			}),
		).toBe("Stored")
	})

	it("returns null when there is nothing to show", () => {
		expect(resolveDocumentTitle(null)).toBeNull()
		expect(resolveDocumentTitle(undefined)).toBeNull()
		expect(resolveDocumentTitle({})).toBeNull()
		expect(resolveDocumentTitle({ title: null, content: null })).toBeNull()
	})
})

describe("deriving a title from content", () => {
	it("reads markdown headings at every level", () => {
		expect(fromContent("# Quarterly planning\n\nProse.")).toBe(
			"Quarterly planning",
		)
		expect(fromContent("###### Deep heading\n\nProse.")).toBe("Deep heading")
	})

	it("drops closing hashes and surrounding markup", () => {
		expect(fromContent("### Deploy runbook ###\n\nSteps.")).toBe(
			"Deploy runbook",
		)
		expect(fromContent("# **Bold heading**\n\nProse.")).toBe("Bold heading")
		expect(fromContent("**Bold line**\n\nProse.")).toBe("Bold line")
		expect(fromContent("`code line`\n\nProse.")).toBe("code line")
		expect(fromContent('"Quoted line"\n\nProse.')).toBe("Quoted line")
	})

	it("requires a space after the hashes", () => {
		expect(fromContent("#NotAHeading\n\nProse.")).toBe("#NotAHeading")
	})

	it("reads a YAML frontmatter title", () => {
		expect(
			fromContent(
				'---\ntitle: "Kubernetes upgrade"\ntags: [infra]\n---\n\nBody.',
			),
		).toBe("Kubernetes upgrade")
		expect(fromContent("---\ntitle: 'Single quoted'\n---\nBody.")).toBe(
			"Single quoted",
		)
	})

	it("prefers frontmatter over a following heading", () => {
		expect(fromContent("---\ntitle: Real\n---\n\n# Other")).toBe("Real")
	})

	it("falls through when frontmatter has no usable title", () => {
		expect(fromContent("---\ntags: [infra]\n---\n\n# Heading wins")).toBe(
			"Heading wins",
		)
		expect(fromContent("---\ntitle:\n---\n\n# Heading wins")).toBe(
			"Heading wins",
		)
	})

	it("ignores an indented title key inside frontmatter", () => {
		expect(fromContent("---\nauthor:\n  title: Nested\n---\n\n# Heading")).toBe(
			"Heading",
		)
	})

	it("takes a short opening line followed by prose", () => {
		expect(
			fromContent("Postgres connection pooling\n\nWe moved to pgbouncer."),
		).toBe("Postgres connection pooling")
	})

	it("takes a setext heading regardless of length", () => {
		const long = `${"Long ".repeat(40)}heading`
		expect(fromContent(`${long}\n===\n\nBody.`)).toStartWith("Long")
		expect(fromContent("Underlined\n---\n\nBody.")).toBe("Underlined")
	})

	it("rejects an opening paragraph too long to be a title", () => {
		expect(
			fromContent("This is ordinary prose that keeps going. ".repeat(6)),
		).toBeNull()
	})

	it("rejects list, quote, table, rule, fence and URL openers", () => {
		expect(fromContent("- first\n- second")).toBeNull()
		expect(fromContent("* first\n* second")).toBeNull()
		expect(fromContent("1. first\n2. second")).toBeNull()
		expect(fromContent("> quoted\n\nmore")).toBeNull()
		expect(fromContent("| a | b |\n| - | - |")).toBeNull()
		expect(fromContent("---\n\nnot frontmatter")).toBeNull()
		expect(fromContent("```ts\nconst a = 1\n```")).toBeNull()
		expect(fromContent("~~~\ncode\n~~~")).toBeNull()
		expect(fromContent("https://example.com/article")).toBeNull()
		expect(fromContent("www.example.com/article")).toBeNull()
	})

	it("skips leading blank lines", () => {
		expect(fromContent("\n\n\n# After blanks\n\nProse.")).toBe("After blanks")
	})

	it("handles CRLF, a BOM and collapsed whitespace", () => {
		expect(fromContent("#   Spaced    out\r\n\r\nBody.")).toBe("Spaced out")
		expect(fromContent("\ufeff---\r\ntitle: From BOM\r\n---\r\nBody.")).toBe(
			"From BOM",
		)
		expect(fromContent("Tabbed\ttitle\n\nBody.")).toBe("Tabbed title")
	})

	it("truncates an overlong heading to a bounded length", () => {
		const title = fromContent(`# ${"word ".repeat(60)}`)
		expect(title).not.toBeNull()
		expect((title as string).length).toBeLessThanOrEqual(120)
		expect(title).toEndWith("…")
	})

	it("returns null for empty, blank or missing content", () => {
		expect(fromContent("")).toBeNull()
		expect(fromContent("   \n\n  ")).toBeNull()
		expect(fromContent("#\n\nBody.")).toBeNull()
		expect(fromContent(null)).toBeNull()
		expect(fromContent(undefined)).toBeNull()
	})

	it("handles a single-line document with no trailing newline", () => {
		expect(fromContent("Just one line")).toBe("Just one line")
	})
})

describe("issue #1425 saves", () => {
	const cases = [
		[
			"markdown H1",
			"# Kubernetes upgrade plan\n\nWe are moving the cluster to 1.31.",
			"Kubernetes upgrade plan",
		],
		[
			"YAML frontmatter",
			"---\ntitle: Postgres pooling decision\ndate: 2026-08-07\n---\n\nWe moved to pgbouncer.",
			"Postgres pooling decision",
		],
		[
			"title line then blank line then prose",
			"Vendor security review\n\nThey passed SOC2 but the DPA needs redlines.",
			"Vendor security review",
		],
	] as const

	for (const [label, content, expected] of cases) {
		it(`${label} no longer reads as untitled`, () => {
			const doc = {
				title: null,
				content,
				metadata: { sm_source: "supermemory-mcp" },
			}
			expect(resolveDocumentTitle(doc)).toBe(expected)
		})
	}

	it("a pinned title repairs a card without re-saving", () => {
		expect(
			resolveDocumentTitle({
				title: null,
				content: cases[0][1],
				metadata: { sm_source: "supermemory-mcp", title: "My chosen title" },
			}),
		).toBe("My chosen title")
	})

	it("a pinned title beats an LLM paraphrase", () => {
		expect(
			resolveDocumentTitle({
				title: "Notes About Upgrading Some Infrastructure",
				content: cases[0][1],
				metadata: { title: "Kubernetes upgrade plan" },
			}),
		).toBe("Kubernetes upgrade plan")
	})
})
