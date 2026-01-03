import { Command } from "commander"
import chalk from "chalk"
import {
	setDebugMode,
	wrapCommand,
	handleError,
} from "./utils/error-handler.js"
import { setupSignalHandlers } from "./utils/signals.js"

// Package version (will be replaced during build or read from package.json)
const VERSION = "0.1.0"

async function main(): Promise<void> {
	// Setup signal handlers for graceful shutdown
	setupSignalHandlers()

	const program = new Command()

	program
		.name("sm")
		.description("Supermemory CLI - Manage your AI memory from the terminal")
		.version(VERSION, "-v, --version", "Display version number")
		.option("-d, --debug", "Enable debug mode with verbose error output")
		.hook("preAction", (thisCommand) => {
			const opts = thisCommand.opts()
			if (opts.debug) {
				setDebugMode(true)
			}
		})

	// Lazy load commands for faster startup
	program
		.command("auth")
		.description("Manage authentication")
		.argument("[key]", "API key to save")
		.option("--clear", "Clear saved API key")
		.option("--show", "Show current API key status")
		.action(
			wrapCommand(async () => {
				const { createAuthCommand } = await import("./commands/auth.js")
				const authCmd = createAuthCommand()
				await authCmd.parseAsync(["node", "auth", ...process.argv.slice(3)])
			}),
		)

	program
		.command("add")
		.description("Add a new memory")
		.argument("[content]", "Content to add")
		.option("-f, --file", "Treat content as file path")
		.option("-t, --tags <tags>", "Container tags (comma-separated)")
		.option("-p, --project <id>", "Project ID")
		.option("-m, --metadata <json>", "JSON metadata")
		.action(
			wrapCommand(async () => {
				const { createAddCommand } = await import("./commands/add.js")
				const addCmd = createAddCommand()
				await addCmd.parseAsync(["node", "add", ...process.argv.slice(3)])
			}),
		)

	program
		.command("search")
		.description("Search through your memories")
		.argument("<query>", "Search query")
		.option("-l, --limit <number>", "Max results", "10")
		.option("-t, --threshold <number>", "Similarity threshold", "0.5")
		.option("-p, --project <id>", "Filter by project")
		.option("--tags <tags>", "Filter by tags")
		.option("--json", "Output as JSON")
		.option("--full", "Include full content")
		.action(
			wrapCommand(async () => {
				const { createSearchCommand } = await import("./commands/search.js")
				const searchCmd = createSearchCommand()
				await searchCmd.parseAsync(["node", "search", ...process.argv.slice(3)])
			}),
		)

	program
		.command("list")
		.description("List your memories")
		.option("-l, --limit <number>", "Number of items", "10")
		.option("--page <number>", "Page number", "1")
		.option("-s, --status <status>", "Filter by status")
		.option("-p, --project <id>", "Filter by project")
		.option("--tags <tags>", "Filter by tags")
		.option("--json", "Output as JSON")
		.action(
			wrapCommand(async () => {
				const { createListCommand } = await import("./commands/list.js")
				const listCmd = createListCommand()
				await listCmd.parseAsync(["node", "list", ...process.argv.slice(3)])
			}),
		)

	// Add help examples
	program.addHelpText(
		"after",
		`
${chalk.bold("Examples:")}
  ${chalk.gray("# Authenticate with your API key")}
  $ sm auth YOUR_API_KEY

  ${chalk.gray("# Add a memory")}
  $ sm add "Machine learning is a subset of AI"

  ${chalk.gray("# Add from file")}
  $ sm add --file ./notes.txt --tags research,ai

  ${chalk.gray("# Pipe content")}
  $ cat document.txt | sm add

  ${chalk.gray("# Search memories")}
  $ sm search "machine learning" --limit 5

  ${chalk.gray("# List recent memories")}
  $ sm list --limit 10

${chalk.bold("Documentation:")}
  https://docs.supermemory.ai/cli
`,
	)

	// Parse arguments
	await program.parseAsync(process.argv)
}

// Run the CLI
main().catch(handleError)
