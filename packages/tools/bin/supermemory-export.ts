#!/usr/bin/env bun
/**
 * CLI to export extracted memories from Supermemory (self-hosted or hosted platform).
 *
 * Usage:
 *   bun run ./bin/supermemory-export.ts --tag user_123 [--format json|markdown] [--out backup.json] [--url http://localhost:6767]
 */

import { parseArgs } from "node:util"
import { writeFile } from "node:fs/promises"
import {
	exportMemoriesAsJson,
	exportMemoriesAsMarkdown,
} from "../src/shared/export-memories"

function printHelp() {
	console.log(`
Supermemory Memory Export CLI
=============================
Export extracted memories and facts from Supermemory (self-hosted or cloud platform).

Usage:
  supermemory-export --tag <containerTag> [options]

Options:
  -t, --tag <tag>           Container tag to export memories from (required)
  -f, --format <format>     Output format: 'json' (default) or 'markdown'
  -o, --out <path>          Output file path (default: stdout)
  -u, --url <url>           Supermemory server base URL (default: $SUPERMEMORY_API_URL or http://localhost:6767)
  -k, --key <key>           Supermemory API key (default: $SUPERMEMORY_API_KEY)
  --include-forgotten       Include soft-forgotten memories in export
  -h, --help                Show this help message

Examples:
  # Export to stdout as JSON
  supermemory-export --tag user_123

  # Export to a JSON backup file from self-hosted server
  supermemory-export --tag user_123 --out ./backup.json --url http://localhost:6767

  # Export as Markdown notes from cloud platform
  supermemory-export --tag user_123 --format markdown --out ./notes.md --url https://api.supermemory.ai --key sm_...
`)
}

async function main() {
	let parsed: ReturnType<typeof parseArgs>
	try {
		parsed = parseArgs({
			args: process.argv.slice(2),
			options: {
				tag: { type: "string", short: "t" },
				format: { type: "string", short: "f", default: "json" },
				out: { type: "string", short: "o" },
				url: {
					type: "string",
					short: "u",
					default: process.env.SUPERMEMORY_API_URL || "http://localhost:6767",
				},
				key: {
					type: "string",
					short: "k",
					default: process.env.SUPERMEMORY_API_KEY || "",
				},
				"include-forgotten": { type: "boolean", default: false },
				help: { type: "boolean", short: "h" },
			},
			allowPositionals: true,
		})
	} catch (err: unknown) {
		console.error(`Error: ${err instanceof Error ? err.message : String(err)}`)
		printHelp()
		process.exit(1)
	}

	const { values } = parsed

	if (values.help) {
		printHelp()
		process.exit(0)
	}

	const tag = values.tag
	if (!tag) {
		console.error("Error: --tag <containerTag> is required.")
		printHelp()
		process.exit(1)
	}

	const format = values.format?.toLowerCase() || "json"
	const baseUrl = values.url || "http://localhost:6767"
	const apiKey = values.key || ""
	const includeForgotten = Boolean(values["include-forgotten"])

	try {
		let output: string
		if (format === "markdown" || format === "md") {
			output = await exportMemoriesAsMarkdown(tag, {
				baseUrl,
				apiKey,
				includeForgotten,
			})
		} else {
			output = await exportMemoriesAsJson(tag, {
				baseUrl,
				apiKey,
				includeForgotten,
			})
		}

		if (values.out) {
			await writeFile(values.out, output, "utf-8")
			console.error(
				`✓ Successfully exported memories for '${tag}' to ${values.out}`,
			)
		} else {
			process.stdout.write(`${output}\n`)
		}
	} catch (err: unknown) {
		console.error(
			`Failed to export memories: ${err instanceof Error ? err.message : String(err)}`,
		)
		process.exit(1)
	}
}

main()
