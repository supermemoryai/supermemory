import { readdir, readFile, mkdir } from "node:fs/promises"
import { resolve, dirname, relative } from "node:path"
import { Buffer } from "node:buffer"
import { Resvg } from "@resvg/resvg-js"
import { parse } from "yaml"

export async function prepareSocialImages(
	root: string,
	spec: { paths: Record<string, Record<string, Record<string, unknown>>> },
) {
	const config = JSON.parse(await readFile(resolve(root, "docs.json"), "utf8"))
	if (!config.thumbnails?.background) return
	const background = await readFile(
		resolve(root, config.thumbnails.background.replace(/^\//, "")),
	)
	const logo = await readFile(
		resolve(
			root,
			config.logo[
				config.thumbnails.appearance === "light" ? "light" : "dark"
			].replace(/^\//, ""),
		),
	)
	const fonts = {
		loadSystemFonts: false,
		fontFiles: [
			resolve(root, "fonts/Geist-400.ttf"),
			resolve(root, "fonts/Geist-600.ttf"),
		],
		defaultFontFamily: "Geist",
	}
	const groups = new Map<string, string>()
	function collect(value: unknown, group = "") {
		if (Array.isArray(value)) {
			for (const child of value) collect(child, group)
		} else if (value && typeof value === "object") {
			const node = value as Record<string, unknown>
			const label = typeof node.group === "string" ? node.group : group
			for (const [key, child] of Object.entries(node)) {
				if (key === "pages" && Array.isArray(child)) {
					for (const page of child) {
						if (typeof page === "string" && !groups.has(page))
							groups.set(page, label)
						else if (typeof page !== "string") collect(page, label)
					}
				} else if (child && typeof child === "object") collect(child, label)
			}
		}
	}
	collect(config.navigation)
	const widths = new Map<string, number>()
	function xmlEscape(text: string) {
		return text.replace(
			/[&<>"']/g,
			(char) =>
				(
					({
						"&": "&amp;",
						"<": "&lt;",
						">": "&gt;",
						'"': "&quot;",
						"'": "&apos;",
					}) as Record<string, string>
				)[char] ?? char,
		)
	}
	function wrap(text: string, size: number, weight: number, maximum: number) {
		const lines: string[] = []
		let line = ""
		for (const word of text.split(/\s+/).filter(Boolean)) {
			const next = line ? `${line} ${word}` : word
			const key = `${size}:${weight}:${next}`
			let width = widths.get(key)
			if (width === undefined) {
				width =
					new Resvg(
						`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630"><text x="0" y="100" font-family="Geist" font-size="${size}" font-weight="${weight}">${xmlEscape(next)}</text></svg>`,
						{ font: fonts },
					).getBBox()?.width ?? 0
				widths.set(key, width)
			}
			if (line && width > maximum) {
				lines.push(line)
				line = word
			} else line = next
		}
		if (line) lines.push(line)
		return lines
	}
	let count = 0
	async function render(
		slug: string,
		title: string,
		description: string,
		group: string,
	) {
		if (slug.split(/[\\/]/).some((part) => part === "." || part === ".."))
			throw new Error(`Invalid social-card path: ${slug}`)
		const color =
			config.thumbnails.appearance === "light" ? "#09111f" : "#ffffff"
		const titleSize = wrap(title, 68, 600, 1040).length > 2 ? 48 : 68
		const titleLines = wrap(title, titleSize, 600, 1040)
		const descriptionLines = wrap(
			description.replace(/[`*_]/g, ""),
			30,
			400,
			760,
		).slice(0, 2)
		const offset = (titleLines.length - 1) * 80
		const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
<image href="data:image/jpeg;base64,${Buffer.from(background).toString("base64")}" width="1200" height="630" preserveAspectRatio="xMidYMid slice"/>
<image href="data:image/svg+xml;base64,${Buffer.from(logo).toString("base64")}" x="68" y="70" width="70" height="70"/>
<g font-family="Geist" fill="${color}"><text x="68" y="${334 - offset}" font-size="30" opacity="0.9">${xmlEscape(group)}</text>
${titleLines.map((line, index) => `<text x="68" y="${419 - offset + index * 80}" font-size="${titleSize}" font-weight="600">${xmlEscape(line)}</text>`).join("")}
${descriptionLines.map((line, index) => `<text x="68" y="${494 + index * 48}" font-size="30" opacity="0.65">${xmlEscape(line)}</text>`).join("")}</g></svg>`
		const path = resolve(
			root,
			".holocron-public/thumbnails",
			`${slug || "index"}.png`,
		)
		await mkdir(dirname(path), { recursive: true })
		await Bun.write(path, new Resvg(svg, { font: fonts }).render().asPng())
		count++
	}
	async function walk(dir: string) {
		for (const entry of await readdir(dir, { withFileTypes: true })) {
			if (
				entry.name.startsWith(".") ||
				["node_modules", "src", "scripts", "snippets", "dist"].includes(
					entry.name,
				)
			)
				continue
			const path = resolve(dir, entry.name)
			if (entry.isDirectory()) await walk(path)
			else if (entry.name.endsWith(".mdx") || entry.name.endsWith(".md")) {
				const text = await readFile(path, "utf8")
				const frontmatter = text.match(/^---\r?\n([\s\S]*?)\r?\n---/)
				if (!frontmatter) continue
				const data = parse(frontmatter[1])
				if (typeof data.title !== "string") continue
				const slug = relative(root, path).replace(/\.(mdx|md)$/, "")
				await render(
					slug,
					data.title,
					typeof data.description === "string" ? data.description : "",
					groups.get(slug) ?? "",
				)
			}
		}
	}
	await walk(root)
	for (const [path, methods] of Object.entries(spec.paths)) {
		for (const [method, operation] of Object.entries(methods)) {
			const slug = (
				operation["x-holocron"] as { href?: string } | undefined
			)?.href?.replace(/^\//, "")
			if (!slug) continue
			const title =
				typeof operation.summary === "string"
					? operation.summary
					: `${method.toUpperCase()} ${path}`
			await render(
				slug,
				title,
				typeof operation.description === "string" ? operation.description : "",
				"API reference",
			)
		}
	}
	console.log(`Prepared ${count} self-hosted social-preview images`)
}
